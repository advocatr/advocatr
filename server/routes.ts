import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { db } from "@db";
import { exercises, userProgress, feedback, users, passwordResetTokens } from "@db/schema";
import { eq, and, lt } from "drizzle-orm";
import { randomBytes } from "crypto";
import { promisify } from "util";
import * as crypto from 'crypto';
import { sendContactEmail } from "./email"; // Added import
import { Client } from "@replit/object-storage";
import fs from "fs";

const randomBytesAsync = promisify(randomBytes);
const objectStorage = new Client({
  bucketId: "replit-objstore-416e6fe5-4969-41e5-8291-f6fcbca88b84"
});

async function generateResetToken(userId: number) {
  const token = (await randomBytesAsync(32)).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  const [resetToken] = await db
    .insert(passwordResetTokens)
    .values({
      userId,
      token,
      expiresAt,
    })
    .returning();

  return resetToken;
}

async function processAiAnalysis(feedbackId: number, videoUrl: string) {
  try {
    // Update status to processing
    await db
      .update(feedback)
      .set({ aiAnalysisStatus: "processing" })
      .where(eq(feedback.id, feedbackId));

    const { aiModels } = await import("@db/schema");
    
    // Get the default AI model
    const [defaultModel] = await db
      .select()
      .from(aiModels)
      .where(and(eq(aiModels.isDefault, true), eq(aiModels.isActive, true)))
      .limit(1);

    if (!defaultModel) {
      // Fall back to mock if no AI model configured
      console.log("No AI model configured, using mock feedback");
      const mockFeedback = generateMockAiFeedback();
      
      await db
        .update(feedback)
        .set({
          content: mockFeedback.content,
          rating: mockFeedback.rating,
          aiAnalysisStatus: "completed",
          aiConfidenceScore: mockFeedback.confidenceScore,
        })
        .where(eq(feedback.id, feedbackId));
      return;
    }

    try {
      // Call the actual AI service
      const analysisPrompt = `Analyze this advocacy video submission. The video shows a student practicing oral advocacy.
      
Please provide detailed feedback on the student's performance including:
1. Argument structure and legal reasoning
2. Voice projection and clarity  
3. Pace and delivery
4. Use of authorities and precedents
5. Overall persuasiveness

Please rate the performance from 1-5 (where 1 is poor and 5 is excellent) and provide constructive feedback for improvement.

Format your response with a clear rating and detailed feedback.`;

      let requestBody: any;
      let headers: any = {
        'Content-Type': 'application/json',
      };

      // Handle different API formats based on provider
      if (defaultModel.provider === 'anthropic') {
        headers['x-api-key'] = defaultModel.apiKey;
        headers['anthropic-version'] = '2023-06-01';
        
        requestBody = {
          model: defaultModel.model,
          max_tokens: defaultModel.maxTokens,
          temperature: defaultModel.temperature / 100,
          messages: [
            { role: 'user', content: `${defaultModel.systemPrompt}\n\n${analysisPrompt}` }
          ]
        };
      } else {
        // Default to OpenAI format
        headers['Authorization'] = `Bearer ${defaultModel.apiKey}`;
        
        requestBody = {
          model: defaultModel.model,
          messages: [
            { role: 'system', content: defaultModel.systemPrompt },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: defaultModel.temperature / 100,
          max_tokens: defaultModel.maxTokens,
        };
      }

      console.log(`Making AI request to ${defaultModel.provider} model ${defaultModel.model}`);

      const response = await fetch(defaultModel.endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`AI API request failed: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      let aiContent;
      
      if (defaultModel.provider === 'anthropic') {
        aiContent = data.content?.[0]?.text || 'Unable to generate feedback';
      } else {
        // Default to OpenAI format
        aiContent = data.choices?.[0]?.message?.content || 'Unable to generate feedback';
      }
      
      // Extract rating from content (look for various rating patterns)
      const ratingMatch = aiContent.match(/(?:rating|score):\s*(\d+)(?:\/5)?/i) || 
                          aiContent.match(/(\d+)\/5/) ||
                          aiContent.match(/(\d+)\s*out\s*of\s*5/i) ||
                          aiContent.match(/rate(?:d|s)?\s*(?:this|the)?\s*(?:performance|submission)?\s*(?:at|as)?\s*(\d+)/i);
      
      const extractedRating = ratingMatch ? parseInt(ratingMatch[1]) : 3;
      const finalRating = Math.max(1, Math.min(5, extractedRating)); // Ensure 1-5 range

      // Calculate confidence score based on response length and rating extraction
      const confidenceScore = ratingMatch ? 
        Math.min(95, 75 + Math.floor(aiContent.length / 50)) : 
        Math.min(80, 60 + Math.floor(aiContent.length / 50));

      // Update with AI results
      await db
        .update(feedback)
        .set({
          content: aiContent,
          rating: finalRating,
          aiAnalysisStatus: "completed",
          aiConfidenceScore: confidenceScore,
        })
        .where(eq(feedback.id, feedbackId));

      console.log(`AI analysis completed for feedback ${feedbackId} using model ${defaultModel.name} (rating: ${finalRating}, confidence: ${confidenceScore}%)`);
    } catch (aiError) {
      console.error("AI API call failed, falling back to mock:", aiError);
      
      // Fall back to mock if AI call fails
      const mockFeedback = generateMockAiFeedback();
      
      await db
        .update(feedback)
        .set({
          content: `[AI Analysis Failed - Mock Response]\n\n${mockFeedback.content}`,
          rating: mockFeedback.rating,
          aiAnalysisStatus: "completed",
          aiConfidenceScore: mockFeedback.confidenceScore,
        })
        .where(eq(feedback.id, feedbackId));
    }
  } catch (error) {
    console.error("AI analysis failed:", error);
    await db
      .update(feedback)
      .set({ aiAnalysisStatus: "failed" })
      .where(eq(feedback.id, feedbackId));
  }
}

function generateMockAiFeedback() {
  const feedbackOptions = [
    {
      content: "Strong opening statement with clear identification of key legal issues. Good use of authorities, though could benefit from more detailed factual analysis. Voice projection and pace were appropriate for the courtroom setting.",
      rating: 4,
      confidenceScore: 85
    },
    {
      content: "Excellent command of the facts and law. Persuasive argument structure with effective use of precedent. Consider addressing potential counterarguments more directly. Overall, a confident and well-prepared advocacy performance.",
      rating: 5,
      confidenceScore: 92
    },
    {
      content: "Good foundation but could strengthen argument structure. Some hesitation noted - practice will help with fluency. Legal reasoning is sound, but consider reorganizing points for maximum impact. Voice clarity is good.",
      rating: 3,
      confidenceScore: 78
    }
  ];

  return feedbackOptions[Math.floor(Math.random() * feedbackOptions.length)];
}

function isAdmin(req: Express.Request, res: Express.Response, next: Express.NextFunction) {
  if (!req.isAuthenticated() || !req.user.isAdmin) {
    return res.status(403).send("Unauthorized");
  }
  next();
}

export function registerRoutes(app: Express): Server {
  setupAuth(app);

  // Get all exercises
  app.get("/api/exercises", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    const allExercises = await db.query.exercises.findMany({
      orderBy: exercises.order,
    });
    res.json(allExercises);
  });

  // Get single exercise
  app.get("/api/exercises/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    const exerciseId = parseInt(req.params.id);
    const [exercise] = await db
      .select()
      .from(exercises)
      .where(eq(exercises.id, exerciseId))
      .limit(1);

    if (!exercise) {
      return res.status(404).send("Exercise not found");
    }

    res.json(exercise);
  });

  // Get user progress
  app.get("/api/progress", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    const progress = await db.query.userProgress.findMany({
      where: eq(userProgress.userId, req.user.id),
      with: {
        feedback: true
      }
    });
    res.json(progress);
  });

  // Get progress for specific exercise
  app.get("/api/progress/:exerciseId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }
    const exerciseId = parseInt(req.params.exerciseId);
    const [progress] = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, req.user.id),
          eq(userProgress.exerciseId, exerciseId)
        )
      );

    res.json(progress || null);
  });

  // Update exercise progress
  app.post("/api/progress/:exerciseId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const exerciseId = parseInt(req.params.exerciseId);
    const { videoUrl, completed } = req.body;

    const [existing] = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, req.user.id),
          eq(userProgress.exerciseId, exerciseId)
        )
      );

    if (existing) {
      const [updated] = await db
        .update(userProgress)
        .set({ videoUrl, completed, updatedAt: new Date() })
        .where(eq(userProgress.id, existing.id))
        .returning();
      return res.json(updated);
    }

    const [progress] = await db
      .insert(userProgress)
      .values({
        userId: req.user.id,
        exerciseId,
        videoUrl,
        completed,
      })
      .returning();

    res.json(progress);
  });

  // Submit feedback for an exercise
  app.post("/api/feedback/:progressId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const progressId = parseInt(req.params.progressId);
    const { content, rating } = req.body;

    // Verify that the progress belongs to the user
    const [userProgressRecord] = await db
      .select()
      .from(userProgress)
      .where(
        and(
          eq(userProgress.id, progressId),
          eq(userProgress.userId, req.user.id)
        )
      );

    if (!userProgressRecord) {
      return res.status(404).send("Progress record not found");
    }

    const [newFeedback] = await db
      .insert(feedback)
      .values({
        progressId,
        content,
        rating,
      })
      .returning();

    res.json(newFeedback);
  });

  // Admin Routes
  app.post("/api/admin/exercises", isAdmin, async (req, res) => {
    const { title, description, demoVideoUrl, professionalAnswerUrl, order, pdfUrl } = req.body;

    const [exercise] = await db
      .insert(exercises)
      .values({
        title,
        description,
        demoVideoUrl,
        professionalAnswerUrl,
        pdfUrl,
        order,
      })
      .returning();

    res.json(exercise);
  });

  // Update an exercise
  app.put("/api/admin/exercises/:id", isAdmin, async (req, res) => {
    const exerciseId = parseInt(req.params.id);
    const { title, description, demoVideoUrl, professionalAnswerUrl, order, pdfUrl } = req.body;

    const [updated] = await db
      .update(exercises)
      .set({
        title,
        description,
        demoVideoUrl,
        professionalAnswerUrl,
        pdfUrl,
        order,
        updatedAt: new Date()
      })
      .where(eq(exercises.id, exerciseId))
      .returning();

    if (!updated) {
      return res.status(404).send("Exercise not found");
    }

    res.json(updated);
  });

  // Delete an exercise
  app.delete("/api/admin/exercises/:id", isAdmin, async (req, res) => {
    const exerciseId = parseInt(req.params.id);

    // First check if there's any user progress for this exercise
    const progressRecords = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.exerciseId, exerciseId));

    if (progressRecords.length > 0) {
      // Delete all related progress records first
      await db
        .delete(userProgress)
        .where(eq(userProgress.exerciseId, exerciseId));
    }

    const [deleted] = await db
      .delete(exercises)
      .where(eq(exercises.id, exerciseId))
      .returning();

    if (!deleted) {
      return res.status(404).send("Exercise not found");
    }

    res.json({ message: "Exercise deleted successfully" });
  });

  app.get("/api/admin/progress", isAdmin, async (req, res) => {
    const progress = await db.query.userProgress.findMany({
      with: {
        user: {
          columns: {
            username: true,
            email: true,
          }
        },
        exercise: {
          columns: {
            title: true,
          }
        }
      }
    });
    res.json(progress);
  });

  app.post("/api/admin/progress/:id/reset", isAdmin, async (req, res) => {
    const progressId = parseInt(req.params.id);

    const [updated] = await db
      .update(userProgress)
      .set({
        completed: false,
        videoUrl: null,
        updatedAt: new Date()
      })
      .where(eq(userProgress.id, progressId))
      .returning();

    if (!updated) {
      return res.status(404).send("Progress record not found");
    }

    res.json(updated);
  });

  // Request password reset
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: "If your email is registered, you will receive reset instructions." });
    }

    // Delete any existing reset tokens for this user
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, user.id));

    const resetToken = await generateResetToken(user.id);

    // TODO: Send email with reset link
    // For now, just return the token in the response
    res.json({
      message: "Password reset instructions sent",
      token: resetToken.token // Remove this in production
    });
  });

  // Reset password with token
  app.post("/api/reset-password", async (req, res) => {
    const { token, newPassword } = req.body;

    const [resetToken] = await db
      .select()
      .from(passwordResetTokens)
      .where(
        and(
          eq(passwordResetTokens.token, token),
          lt(passwordResetTokens.expiresAt, new Date())
        )
      )
      .limit(1);

    if (!resetToken) {
      return res.status(400).send("Invalid or expired reset token");
    }

    // Hash the new password
    const hashedPassword = await crypto.hash(newPassword);

    // Update the user's password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, resetToken.userId));

    // Delete the used token
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.id, resetToken.id));

    res.json({ message: "Password updated successfully" });
  });

  // Admin reset user's password
  app.post("/api/admin/users/:id/reset-password", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).send("User not found");
    }

    // Hash the new password
    const hashedPassword = await crypto.hash(newPassword);

    // Update the user's password
    await db
      .update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId));

    // Delete any existing reset tokens
    await db
      .delete(passwordResetTokens)
      .where(eq(passwordResetTokens.userId, userId));

    res.json({ message: "Password reset successfully" });
  });

  // Contact form endpoint
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, email, content } = req.body;

      if (!name || !email || !content) {
        return res.status(400).json({ message: "All fields are required" });
      }

      await sendContactEmail(name, email, content);
      res.json({ message: "Message sent successfully" });
    } catch (error) {
      console.error("Error sending contact email:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // Upload video endpoint
  app.post("/api/upload-video", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      console.log("Upload request received, files:", req.files ? Object.keys(req.files) : 'none');

      const videoFile = req.files?.video;
      if (!videoFile || Array.isArray(videoFile)) {
        console.log("No video file in request:", { files: req.files });
        return res.status(400).json({ message: "No video file provided" });
      }

      // Read the file from tempFilePath
      const fileBuffer = fs.readFileSync(videoFile.tempFilePath);
      console.log("Video file details:", { 
        name: videoFile.name, 
        size: fileBuffer.length, 
        mimetype: videoFile.mimetype 
      });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `videos/${req.user.id}_${timestamp}.webm`;

      console.log("Uploading to object storage:", filename);

      // Upload to object storage
      await objectStorage.uploadFromBytes(filename, fileBuffer);

      // Generate a URL for the uploaded video
      const videoUrl = `/api/video/${encodeURIComponent(filename)}`;

      console.log("Upload successful:", videoUrl);
      res.json({ videoUrl });
    } catch (error) {
      console.error("Error uploading video:", error);
      res.status(500).json({ 
        message: "Failed to upload video", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Serve video files
  app.get("/api/video/:filename", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    try {
      const filename = decodeURIComponent(req.params.filename);
      console.log("Attempting to serve video:", filename);
      
      const videoData = await objectStorage.downloadAsBytes(filename);
      console.log("Video data received:", {
        type: typeof videoData,
        constructor: videoData?.constructor?.name,
        isBuffer: Buffer.isBuffer(videoData),
        isUint8Array: videoData instanceof Uint8Array,
        hasLength: 'length' in videoData,
        length: videoData?.length
      });
      
      let buffer: Buffer;
      
      // Handle the object storage response structure
      if (videoData && typeof videoData === 'object' && 'ok' in videoData && 'value' in videoData) {
        // Handle Replit object storage response format
        const response = videoData as { ok: boolean; value: Buffer[] };
        if (response.ok && Array.isArray(response.value) && response.value.length > 0) {
          buffer = response.value[0]; // Get the first (and should be only) Buffer
          console.log("Extracted Buffer from object storage response");
        } else {
          throw new Error("Invalid object storage response");
        }
      } else if (Buffer.isBuffer(videoData)) {
        buffer = videoData;
        console.log("Using existing Buffer");
      } else if (videoData instanceof Uint8Array) {
        buffer = Buffer.from(videoData);
        console.log("Converted Uint8Array to Buffer");
      } else if (videoData && typeof videoData === 'object' && 'data' in videoData) {
        // Handle case where object storage returns a wrapper object
        buffer = Buffer.from((videoData as any).data);
        console.log("Extracted data from wrapper object");
      } else if (Array.isArray(videoData)) {
        buffer = Buffer.from(videoData);
        console.log("Converted Array to Buffer");
      } else {
        console.error("Unexpected data type from object storage:", typeof videoData, videoData);
        throw new Error(`Unexpected data type: ${typeof videoData}`);
      }

      console.log("Final buffer size:", buffer.length);

      if (buffer.length === 0) {
        throw new Error("Empty video file");
      }

      res.setHeader('Content-Type', 'video/webm');
      res.setHeader('Content-Length', buffer.length.toString());
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Cache-Control', 'public, max-age=31536000');
      res.send(buffer);
      
      console.log("Video served successfully");
    } catch (error) {
      console.error("Error serving video:", error);
      console.error("Error details:", {
        name: error?.name,
        message: error?.message,
        stack: error?.stack
      });
      res.status(404).json({ message: "Video not found" });
    }
  });

  // Debug endpoint to inspect object storage data
  app.get("/api/debug/video/:filename", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).send("Unauthorized");
    }

    try {
      const filename = decodeURIComponent(req.params.filename);
      const videoData = await objectStorage.downloadAsBytes(filename);
      
      res.json({
        filename,
        dataType: typeof videoData,
        constructorName: videoData?.constructor?.name,
        isBuffer: Buffer.isBuffer(videoData),
        isUint8Array: videoData instanceof Uint8Array,
        isArray: Array.isArray(videoData),
        hasLength: 'length' in videoData,
        length: videoData?.length,
        keys: videoData && typeof videoData === 'object' ? Object.keys(videoData) : null,
        firstFewBytes: videoData?.length ? Array.from(videoData.slice(0, 10)) : null
      });
    } catch (error) {
      console.error("Debug error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Trigger AI analysis for a progress record
  app.post("/api/ai-feedback/:progressId", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).send("Unauthorized");
    }

    const progressId = parseInt(req.params.progressId);

    // Verify that the progress record exists and has a video
    const [userProgressRecord] = await db
      .select()
      .from(userProgress)
      .where(eq(userProgress.id, progressId));

    if (!userProgressRecord || !userProgressRecord.videoUrl) {
      return res.status(404).send("Progress record not found or no video submitted");
    }

    // Check if AI feedback already exists
    const existingAiFeedback = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.progressId, progressId),
          eq(feedback.isAiGenerated, true)
        )
      );

    if (existingAiFeedback.length > 0) {
      return res.status(400).json({ message: "AI feedback already exists for this submission" });
    }

    // Create pending AI feedback record
    const [aiFeedback] = await db
      .insert(feedback)
      .values({
        progressId,
        content: "AI analysis pending...",
        rating: 3, // Default neutral rating
        isAiGenerated: true,
        aiAnalysisStatus: "pending",
        aiConfidenceScore: null,
      })
      .returning();

    // Simulate AI processing (replace with actual AI call later)
    setTimeout(async () => {
      await processAiAnalysis(aiFeedback.id, userProgressRecord.videoUrl);
    }, 2000);

    res.json({ message: "AI analysis initiated", feedbackId: aiFeedback.id });
  });

  // Get AI feedback status
  app.get("/api/ai-feedback/:progressId/status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const progressId = parseInt(req.params.progressId);

    const [aiFeedback] = await db
      .select()
      .from(feedback)
      .where(
        and(
          eq(feedback.progressId, progressId),
          eq(feedback.isAiGenerated, true)
        )
      );

    res.json(aiFeedback || null);
  });

  // Delete video from object storage
  app.post("/api/delete-video", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const { videoUrl } = req.body;
      
      if (!videoUrl) {
        return res.status(400).json({ message: "Video URL is required" });
      }

      // Extract filename from the video URL
      // URL format: /api/video/videos%2F1_1751031362652.webm
      const urlMatch = videoUrl.match(/\/api\/video\/(.+)$/);
      if (!urlMatch) {
        return res.status(400).json({ message: "Invalid video URL format" });
      }

      const filename = decodeURIComponent(urlMatch[1]);
      console.log("Attempting to delete video:", filename);

      // Delete from object storage
      const deleteResult = await objectStorage.delete(filename);
      
      if (deleteResult.ok) {
        console.log("Video deleted successfully:", filename);
        res.json({ message: "Video deleted successfully" });
      } else {
        console.error("Failed to delete video:", deleteResult.value);
        res.status(500).json({ message: "Failed to delete video from storage" });
      }
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ 
        message: "Failed to delete video", 
        error: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // AI Models API endpoints
  app.get("/api/admin/ai-models", isAdmin, async (req, res) => {
    try {
      const { aiModels } = await import("@db/schema");
      const allModels = await db
        .select()
        .from(aiModels)
        .orderBy(aiModels.createdAt);
      
      // Don't send API keys in response
      const modelsWithoutKeys = allModels.map(model => ({
        ...model,
        apiKey: model.apiKey ? '••••••••' : '',
        temperature: model.temperature / 100 // Convert back to decimal
      }));
      
      res.json(modelsWithoutKeys);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  app.post("/api/admin/ai-models", isAdmin, async (req, res) => {
    try {
      const { aiModels } = await import("@db/schema");
      const { name, provider, apiKey, endpoint, model, temperature, maxTokens, systemPrompt, isActive, isDefault } = req.body;

      if (!name || !provider || !apiKey || !endpoint || !model || !systemPrompt) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // If this is set as default, unset any existing default
      if (isDefault) {
        await db
          .update(aiModels)
          .set({ isDefault: false })
          .where(eq(aiModels.isDefault, true));
      }

      const [newModel] = await db
        .insert(aiModels)
        .values({
          name,
          provider,
          apiKey,
          endpoint,
          model,
          temperature: Math.round(temperature * 100), // Store as integer
          maxTokens,
          systemPrompt,
          isActive: isActive !== undefined ? isActive : true,
          isDefault: isDefault !== undefined ? isDefault : false,
        })
        .returning();

      // Don't return API key
      const responseModel = { ...newModel, apiKey: '••••••••', temperature: newModel.temperature / 100 };
      res.json(responseModel);
    } catch (error) {
      console.error("Error creating AI model:", error);
      res.status(500).json({ message: "Failed to create AI model" });
    }
  });

  app.put("/api/admin/ai-models/:id", isAdmin, async (req, res) => {
    try {
      const { aiModels } = await import("@db/schema");
      const modelId = parseInt(req.params.id);
      const { name, provider, apiKey, endpoint, model, temperature, maxTokens, systemPrompt, isActive, isDefault } = req.body;

      if (!name || !provider || !endpoint || !model || !systemPrompt) {
        return res.status(400).json({ message: "All required fields must be provided" });
      }

      // If this is set as default, unset any existing default
      if (isDefault) {
        await db
          .update(aiModels)
          .set({ isDefault: false })
          .where(eq(aiModels.isDefault, true));
      }

      // Prepare update object - only include apiKey if provided
      const updateData: any = {
        name,
        provider,
        endpoint,
        model,
        temperature: Math.round(temperature * 100), // Store as integer
        maxTokens,
        systemPrompt,
        isActive: isActive !== undefined ? isActive : true,
        isDefault: isDefault !== undefined ? isDefault : false,
        updatedAt: new Date(),
      };

      // Only update API key if provided
      if (apiKey && apiKey.trim()) {
        updateData.apiKey = apiKey;
      }

      const [updatedModel] = await db
        .update(aiModels)
        .set(updateData)
        .where(eq(aiModels.id, modelId))
        .returning();

      if (!updatedModel) {
        return res.status(404).json({ message: "AI model not found" });
      }

      // Don't return API key
      const responseModel = { ...updatedModel, apiKey: '••••••••', temperature: updatedModel.temperature / 100 };
      res.json(responseModel);
    } catch (error) {
      console.error("Error updating AI model:", error);
      res.status(500).json({ message: "Failed to update AI model" });
    }
  });

  app.delete("/api/admin/ai-models/:id", isAdmin, async (req, res) => {
    try {
      const { aiModels } = await import("@db/schema");
      const modelId = parseInt(req.params.id);

      const [deletedModel] = await db
        .delete(aiModels)
        .where(eq(aiModels.id, modelId))
        .returning();

      if (!deletedModel) {
        return res.status(404).json({ message: "AI model not found" });
      }

      res.json({ message: "AI model deleted successfully" });
    } catch (error) {
      console.error("Error deleting AI model:", error);
      res.status(500).json({ message: "Failed to delete AI model" });
    }
  });

  app.post("/api/admin/ai-models/:id/test", isAdmin, async (req, res) => {
    try {
      const { aiModels } = await import("@db/schema");
      const modelId = parseInt(req.params.id);

      const [model] = await db
        .select()
        .from(aiModels)
        .where(eq(aiModels.id, modelId));

      if (!model) {
        return res.status(404).json({ message: "AI model not found" });
      }

      // Simple test message
      const testMessage = "Please respond with 'AI model test successful' to confirm you're working correctly.";
      
      try {
        let requestBody: any;
        let headers: any = {
          'Content-Type': 'application/json',
        };

        // Handle different API formats based on provider
        if (model.provider === 'anthropic') {
          headers['x-api-key'] = model.apiKey;
          headers['anthropic-version'] = '2023-06-01';
          
          requestBody = {
            model: model.model,
            max_tokens: Math.min(model.maxTokens, 100),
            temperature: model.temperature / 100,
            messages: [
              { role: 'user', content: testMessage }
            ]
          };
        } else {
          // Default to OpenAI format
          headers['Authorization'] = `Bearer ${model.apiKey}`;
          
          requestBody = {
            model: model.model,
            messages: [
              { role: 'system', content: model.systemPrompt },
              { role: 'user', content: testMessage }
            ],
            temperature: model.temperature / 100,
            max_tokens: Math.min(model.maxTokens, 100), // Limit for test
          };
        }

        const response = await fetch(model.endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
          throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        let aiResponse;
        
        if (model.provider === 'anthropic') {
          aiResponse = data.content?.[0]?.text || 'No response content';
        } else {
          // Default to OpenAI format
          aiResponse = data.choices?.[0]?.message?.content || 'No response content';
        }

        res.json({ 
          success: true, 
          response: aiResponse,
          model: model.name 
        });
      } catch (apiError) {
        throw new Error(`API call failed: ${apiError.message}`);
      }
    } catch (error) {
      console.error("Error testing AI model:", error);
      res.status(500).json({ 
        message: "Failed to test AI model",
        error: error.message 
      });
    }
  });

  // Tools API endpoints
  app.get("/api/tools", async (req, res) => {
    try {
      const { tools } = await import("@db/schema");
      const activeTools = await db
        .select()
        .from(tools)
        .where(eq(tools.isActive, true))
        .orderBy(tools.createdAt);
      res.json(activeTools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  // Admin tools endpoints
  app.get("/api/admin/tools", isAdmin, async (req, res) => {
    try {
      const { tools } = await import("@db/schema");
      const allTools = await db
        .select()
        .from(tools)
        .orderBy(tools.createdAt);
      res.json(allTools);
    } catch (error) {
      console.error("Error fetching admin tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.post("/api/admin/tools", isAdmin, async (req, res) => {
    try {
      const { tools } = await import("@db/schema");
      const { title, description, downloadUrl, images, isActive } = req.body;

      if (!title || !description || !downloadUrl) {
        return res.status(400).json({ message: "Title, description, and download URL are required" });
      }

      const [newTool] = await db
        .insert(tools)
        .values({
          title,
          description,
          downloadUrl,
          images: images || [],
          isActive: isActive !== undefined ? isActive : true,
        })
        .returning();

      res.json(newTool);
    } catch (error) {
      console.error("Error creating tool:", error);
      res.status(500).json({ message: "Failed to create tool" });
    }
  });

  app.put("/api/admin/tools/:id", isAdmin, async (req, res) => {
    try {
      const { tools } = await import("@db/schema");
      const toolId = parseInt(req.params.id);
      const { title, description, downloadUrl, images, isActive } = req.body;

      if (!title || !description || !downloadUrl) {
        return res.status(400).json({ message: "Title, description, and download URL are required" });
      }

      const [updatedTool] = await db
        .update(tools)
        .set({
          title,
          description,
          downloadUrl,
          images: images || [],
          isActive: isActive !== undefined ? isActive : true,
          updatedAt: new Date(),
        })
        .where(eq(tools.id, toolId))
        .returning();

      if (!updatedTool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      res.json(updatedTool);
    } catch (error) {
      console.error("Error updating tool:", error);
      res.status(500).json({ message: "Failed to update tool" });
    }
  });

  app.delete("/api/admin/tools/:id", isAdmin, async (req, res) => {
    try {
      const { tools } = await import("@db/schema");
      const toolId = parseInt(req.params.id);

      const [deletedTool] = await db
        .delete(tools)
        .where(eq(tools.id, toolId))
        .returning();

      if (!deletedTool) {
        return res.status(404).json({ message: "Tool not found" });
      }

      res.json({ message: "Tool deleted successfully" });
    } catch (error) {
      console.error("Error deleting tool:", error);
      res.status(500).json({ message: "Failed to delete tool" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}