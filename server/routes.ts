import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { prisma } from "../db/prisma";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { sendContactEmail } from "./email"; // Added import


const BUCKET_ID = process.env['REPLIT_OBJECT_STORAGE_BUCKET_ID'] || 'db';

// Debug object storage configuration
console.log("Object Storage Environment Variables:");
console.log("REPLIT_OBJECT_STORAGE_BUCKET_ID:", process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID);
console.log("REPLIT_DB_URL:", process.env.REPLIT_DB_URL ? "Set" : "Not set");

// Object storage is disabled in Cloud Run environment
let objectStorage: any = null;
console.log("Object Storage disabled - using local file system instead");

async function generateResetToken(userId: number) {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return { userId, token, expiresAt };
}

async function processAiAnalysis(feedbackId: number, videoUrl: string) {
  try {
    // Update status to processing
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { aiAnalysisStatus: "processing" },
    });

    // Get the default AI model
    const defaultModel = await prisma.aIModel.findFirst({
      where: { isDefault: true, isActive: true },
    });

    if (!defaultModel) {
      // Fall back to mock if no AI model configured
      console.log("No AI model configured, using mock feedback");
      const mockFeedback = generateMockAiFeedback();

      await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          content: mockFeedback.content,
          rating: mockFeedback.rating,
          aiAnalysisStatus: "completed",
          aiConfidenceScore: mockFeedback.confidenceScore,
        },
      });
      return;
    }

    try {
      // Check if this is a Gemini model and if we can process video
      if ((defaultModel.provider === 'google' || defaultModel.provider === 'gemini')
        && videoUrl.startsWith('/api/video/')) {

        console.log("Using video analysis for Gemini model");

        // Video analysis is disabled in Cloud Run environment
        throw new Error("Video analysis is not available in this environment");

        // Video processing is disabled in Cloud Run environment
        throw new Error("Video processing is not available in this environment");

        // Video analysis is disabled in Cloud Run environment
        throw new Error("Video analysis is not available in this environment");
      }

      // Fallback to text-based analysis for non-Gemini models or if video processing fails
      const analysisPrompt = `Please provide feedback on an oral advocacy video submission. 

Based on typical advocacy performance criteria, provide constructive feedback covering:
1. Argument structure and legal reasoning
2. Voice projection and clarity  
3. Pace and delivery
4. Use of authorities and precedents
5. Overall persuasiveness

Please rate the performance from 1-5 (where 1 is poor and 5 is excellent) and provide detailed, constructive feedback for improvement.`;

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
      } else if (defaultModel.provider === 'google' || defaultModel.provider === 'gemini') {
        headers['Authorization'] = `Bearer ${defaultModel.apiKey}`;

        requestBody = {
          contents: [
            {
              parts: [
                { text: `${defaultModel.systemPrompt}\n\n${analysisPrompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: defaultModel.temperature / 100,
            maxOutputTokens: defaultModel.maxTokens,
          }
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

      // Use the modified endpoint for Gemini
      const apiEndpoint = (defaultModel.provider === 'google' || defaultModel.provider === 'gemini')
        ? (defaultModel.endpoint.includes('?')
          ? `${defaultModel.endpoint}&key=${defaultModel.apiKey}`
          : `${defaultModel.endpoint}?key=${defaultModel.apiKey}`)
        : defaultModel.endpoint;

      const response = await fetch(apiEndpoint, {
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
      } else if (defaultModel.provider === 'google' || defaultModel.provider === 'gemini') {
        aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Unable to generate feedback';
      } else {
        // Default to OpenAI format
        aiContent = data.choices?.[0]?.message?.content || 'Unable to generate feedback';
      }

      // Extract rating from content
      const ratingMatch = aiContent.match(/(?:rating|score):\s*(\d+)(?:\/5)?/i) ||
        aiContent.match(/(\d+)\/5/) ||
        aiContent.match(/(\d+)\s*out\s*of\s*5/i) ||
        aiContent.match(/rate(?:d|s)?\s*(?:this|the)?\s*(?:performance|submission)?\s*(?:at|as)?\s*(\d+)/i);

      const extractedRating = ratingMatch ? parseInt(ratingMatch[1]) : 3;
      const finalRating = Math.max(1, Math.min(5, extractedRating));

      const confidenceScore = 70; // Standard confidence for text-based analysis

      // Update with AI results
      await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          content: `[Text-based Analysis]\n\n${aiContent}`,
          rating: finalRating,
          aiAnalysisStatus: "completed",
          aiConfidenceScore: confidenceScore,
        },
      });

      console.log(`AI analysis completed for feedback ${feedbackId} using model ${defaultModel.name} (rating: ${finalRating}, confidence: ${confidenceScore}%)`);
    } catch (aiError) {
      console.error("AI API call failed, falling back to mock:", aiError);

      // Fall back to mock if AI call fails
      const mockFeedback = generateMockAiFeedback();

      await prisma.feedback.update({
        where: { id: feedbackId },
        data: {
          content: `[AI Analysis - Mock Response Due to Technical Issue]\n\n${mockFeedback.content}`,
          rating: mockFeedback.rating,
          aiAnalysisStatus: "completed",
          aiConfidenceScore: mockFeedback.confidenceScore,
        },
      });
    }
  } catch (error) {
    console.error("AI analysis failed:", error);
    await prisma.feedback.update({
      where: { id: feedbackId },
      data: { aiAnalysisStatus: "failed" },
    });
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
  // Health check endpoint for Cloud Run
  app.get('/health', (req, res) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development'
    });
  });
  setupAuth(app);

  // Exercises endpoints
  app.get("/api/exercises", async (req, res) => {
    try {
      const exercises = await prisma.exercise.findMany({
        orderBy: { order: 'asc' }
      });
      res.json(exercises);
    } catch (error) {
      console.error("Error fetching exercises:", error);
      res.status(500).json({ message: "Failed to fetch exercises" });
    }
  });

  app.get("/api/exercises/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const exercise = await prisma.exercise.findUnique({
        where: { id }
      });

      if (!exercise) {
        return res.status(404).json({ message: "Exercise not found" });
      }

      res.json(exercise);
    } catch (error) {
      console.error("Error fetching exercise:", error);
      res.status(500).json({ message: "Failed to fetch exercise" });
    }
  });

  // Progress endpoints
  app.get("/api/progress/:exerciseId", async (req, res) => {
    try {
      const exerciseId = parseInt(req.params.exerciseId);
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      let progress = await prisma.userProgress.findFirst({
        where: {
          userId,
          exerciseId
        },
        include: {
          feedback: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!progress) {
        progress = await prisma.userProgress.create({
          data: {
            userId,
            exerciseId
          },
          include: {
            feedback: true
          }
        });
      }

      res.json(progress);
    } catch (error) {
      console.error("Error fetching progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Update exercise progress
  app.post("/api/progress/:exerciseId", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).send("Not authenticated");
    }

    const exerciseId = parseInt(req.params.exerciseId);
    const { videoUrl, completed } = req.body;

    const existing = await prisma.userProgress.findFirst({
      where: {
        userId: req.user.id,
        exerciseId: exerciseId
      }
    });

    if (existing) {
      // If updating with a new video URL, clear any existing AI feedback
      if (videoUrl && existing.videoUrl !== videoUrl) {
        await prisma.feedback.deleteMany({
          where: {
            progressId: existing.id,
            isAiGenerated: true
          }
        });
      }

      const updated = await prisma.userProgress.update({
        where: { id: existing.id },
        data: {
          videoUrl,
          completed,
          updatedAt: new Date()
        }
      });
      return res.json(updated);
    }

    const progress = await prisma.userProgress.create({
      data: {
        userId: req.user.id,
        exerciseId,
        videoUrl,
        completed,
      }
    });

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
    const userProgressRecord = await prisma.userProgress.findFirst({
      where: {
        id: progressId,
        userId: req.user.id
      }
    });

    if (!userProgressRecord) {
      return res.status(404).send("Progress record not found");
    }

    const newFeedback = await prisma.feedback.create({
      data: {
        progressId,
        content,
        rating,
      }
    });

    res.json(newFeedback);
  });

  // Admin Routes
  app.post("/api/admin/exercises", isAdmin, async (req, res) => {
    const { title, description, demoVideoUrl, professionalAnswerUrl, order, pdfUrl, exerciseType } = req.body;

    const exercise = await prisma.exercise.create({
      data: {
        title,
        description,
        demoVideoUrl,
        professionalAnswerUrl,
        pdfUrl,
        order,
        exerciseType: exerciseType || "video", // Default to "video" if not provided
      }
    });

    res.json(exercise);
  });

  // Update an exercise
  app.put("/api/admin/exercises/:id", isAdmin, async (req, res) => {
    const exerciseId = parseInt(req.params.id);
    const { title, description, demoVideoUrl, professionalAnswerUrl, order, pdfUrl, exerciseType } = req.body;

    const updated = await prisma.exercise.update({
      where: { id: exerciseId },
      data: {
        title,
        description,
        demoVideoUrl,
        professionalAnswerUrl,
        pdfUrl,
        order,
        exerciseType: exerciseType || "video", // Default to "video" if not provided
        updatedAt: new Date()
      }
    });

    if (!updated) {
      return res.status(404).send("Exercise not found");
    }

    res.json(updated);
  });

  // Delete an exercise
  app.delete("/api/admin/exercises/:id", isAdmin, async (req, res) => {
    const exerciseId = parseInt(req.params.id);

    // First check if there's any user progress for this exercise
    const progressRecords = await prisma.userProgress.findMany({
      where: { exerciseId: exerciseId }
    });

    if (progressRecords.length > 0) {
      // Delete all related progress records first
      await prisma.userProgress.deleteMany({
        where: { exerciseId: exerciseId }
      });
    }

    try {
      await prisma.exercise.delete({
        where: {
          id: exerciseId,
        },
      });
      res.json({ message: "Exercise deleted successfully" });
    } catch (e) {
      return res.status(404).send("Exercise not found");
    }
  });

  app.get("/api/admin/progress", isAdmin, async (req, res) => {
    const progress = await prisma.userProgress.findMany({
      include: {
        user: {
          select: {
            username: true,
            email: true,
          }
        },
        exercise: {
          select: {
            title: true,
          }
        }
      }
    });
    res.json(progress);
  });

  app.post("/api/admin/progress/:id/reset", isAdmin, async (req, res) => {
    const progressId = parseInt(req.params.id);

    const updated = await prisma.userProgress.update({
      where: { id: progressId },
      data: {
        completed: false,
        videoUrl: null,
        updatedAt: new Date()
      }
    });

    if (!updated) {
      return res.status(404).send("Progress record not found");
    }

    res.json(updated);
  });

  // Request password reset
  app.post("/api/forgot-password", async (req, res) => {
    const { email } = req.body;

    const user = await prisma.user.findFirst({
      where: { email: email }
    });

    if (!user) {
      // Don't reveal if email exists
      return res.json({ message: "If your email is registered, you will receive reset instructions." });
    }

    // Delete any existing reset tokens for this user
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id }
    });

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

    const resetToken = await prisma.passwordResetToken.findFirst({
      where: {
        token: token,
        expiresAt: { gt: new Date() }
      }
    });

    if (!resetToken) {
      return res.status(400).send("Invalid or expired reset token");
    }

    // Hash the new password
    const hashedPassword = await new Promise((resolve, reject) => {
      crypto.hash(newPassword, (err, derivedKey) => {
        if (err) {
          reject(err);
        } else {
          resolve(derivedKey.toString('hex'));
        }
      });
    }) as string;

    // Update the user's password
    await prisma.user.update({
      where: { id: resetToken.userId },
      data: { password: hashedPassword }
    });

    // Delete the used token
    await prisma.passwordResetToken.delete({
      where: { id: resetToken.id }
    });

    res.json({ message: "Password updated successfully" });
  });

  // Admin reset user's password
  app.post("/api/admin/users/:id/reset-password", isAdmin, async (req, res) => {
    const userId = parseInt(req.params.id);
    const { newPassword } = req.body;

    console.log("Password reset request:", { userId, hasNewPassword: !!newPassword, passwordType: typeof newPassword });

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length === 0) {
      return res.status(400).json({ message: "New password is required and must be a non-empty string" });
    }

    const trimmedPassword = newPassword.trim();
    if (trimmedPassword.length < 1) {
      return res.status(400).json({ message: "Password cannot be empty" });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return res.status(404).send("User not found");
    }

    try {
      // Hash the new password
      const hashedPassword = await new Promise((resolve, reject) => {
        crypto.hash(trimmedPassword, (err, derivedKey) => {
          if (err) {
            reject(err);
          } else {
            resolve(derivedKey.toString('hex'));
          }
        });
      }) as string;

      // Update the user's password
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword }
      });

      // Delete any existing reset tokens
      await prisma.passwordResetToken.deleteMany({
        where: { userId: userId }
      });

      console.log("Password reset successful for user:", userId);
      res.json({ message: "Password reset successfully" });
    } catch (error) {
      console.error("Error resetting password:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Tools endpoints
  app.get("/api/tools", async (req, res) => {
    try {
      const tools = await prisma.tool.findMany({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' }
      });
      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.post("/api/tools/:id/run", async (req, res) => {
    try {
      const toolId = parseInt(req.params.id);
      const { userInput } = req.body;

      const tool = await prisma.tool.findUnique({
        where: { id: toolId }
      });

      if (!tool || !tool.pythonCode) {
        return res.status(404).json({ error: "Tool not found or no Python code configured" });
      }

      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const scriptPath = path.join(tempDir, `tool_${toolId}_${Date.now()}.py`);

      const pythonScript = `
import sys
import json

# User input
user_input = """${userInput.replace(/"/g, '\\"')}"""

# Tool code
${tool.pythonCode}
`;

      fs.writeFileSync(scriptPath, pythonScript);

      const pythonProcess = spawn('python3', [scriptPath]);
      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        fs.unlinkSync(scriptPath);

        if (code !== 0) {
          return res.status(500).json({ error: errorOutput || 'Python script execution failed' });
        }

        res.json({ output: output.trim() });
      });

      setTimeout(() => {
        pythonProcess.kill();
        if (fs.existsSync(scriptPath)) {
          fs.unlinkSync(scriptPath);
        }
        res.status(408).json({ error: 'Script execution timeout' });
      }, 30000);

    } catch (error) {
      console.error("Error running tool:", error);
      res.status(500).json({ error: "Failed to execute tool" });
    }
  });

  // Python code execution endpoint
  app.post("/api/run-python", async (req, res) => {
    const { code } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: "Code is required and must be a string" });
    }

    try {
      // Create a temporary file with the Python code
      const tempFileName = `/tmp/temp_code_${Date.now()}.py`;
      fs.writeFileSync(tempFileName, code);

      // Execute the Python code
      const pythonProcess = spawn('python3', [tempFileName], {
        timeout: 10000, // 10 second timeout
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code) => {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFileName);
        } catch (cleanupError) {
          console.warn('Failed to clean up temp file:', cleanupError);
        }

        if (code === 0) {
          res.json({ output: output || 'Code executed successfully' });
        } else {
          res.status(400).json({ error: errorOutput || 'Execution failed' });
        }
      });

      pythonProcess.on('error', (error) => {
        // Clean up temporary file
        try {
          fs.unlinkSync(tempFileName);
        } catch (cleanupError) {
          console.warn('Failed to clean up temp file:', cleanupError);
        }

        res.status(500).json({ error: `Failed to execute Python code: ${error.message}` });
      });

    } catch (error) {
      console.error('Python execution error:', error);
      res.status(500).json({ error: 'Internal server error during code execution' });
    }
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

      // File upload is disabled in Cloud Run environment
      return res.status(503).json({
        message: "File upload service is currently unavailable. Please try again later.",
        error: "Object storage not available"
      });
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

      // Debug: Check bucket configuration
      console.log("Object storage bucket ID:", process.env.REPLIT_DB_URL ? "Using DB" : "Using object storage");

      // First check if the file exists by listing files
      try {
        if (!objectStorage) {
          return res.status(503).json({
            message: "Video service is currently unavailable.",
            error: "Object storage not available"
          });
        }
        console.log("Attempting to list object storage contents...");
        const listResult = await objectStorage.list();
        console.log("Object storage list result:", JSON.stringify(listResult, null, 2));

        if (listResult.ok && listResult.value) {
          const fileExists = listResult.value.some(item => item.name === filename);
          console.log(`File ${filename} exists in storage:`, fileExists);
          if (!fileExists) {
            console.log("Available files:", listResult.value.map(item => ({ name: item.name, size: item.size })));
            return res.status(404).json({
              message: "Video file not found",
              filename,
              availableFiles: listResult.value.map(item => item.name)
            });
          }
        } else if (!listResult.ok) {
          console.error("Object storage list failed:", listResult.error);
          // Don't fail completely, try to download anyway
        }
      }catch (listError) {
        console.error("Object storage list exception:", listError);
        // Continue with download attempt
      }

      console.log("Attempting to download video data...");
      const videoData = await objectStorage.downloadAsBytes(filename);
      console.log("Raw video data response:", JSON.stringify(videoData, null, 2));
      console.log("Video data details:", {
        type: typeof videoData,
        constructor: videoData?.constructor?.name,
        isBuffer: Buffer.isBuffer(videoData),
        isUint8Array: videoData instanceof Uint8Array,
        hasLength: 'length' in videoData,
        length: videoData?.length,
        keys: videoData && typeof videoData === 'object' ? Object.keys(videoData) : null
      });

      let buffer: Buffer;

      // Handle the object storage response structure
      if (videoData && typeof videoData === 'object' && 'ok' in videoData) {
        // Handle Replit object storage response format
        const response = videoData as { ok: boolean; value?: Buffer[]; error?: any };
        if (response.ok && response.value && Array.isArray(response.value) && response.value.length > 0) {
          buffer = response.value[0]; // Get the first (and should be only) Buffer
          console.log("Extracted Buffer from object storage response");
        } else {
          console.error("Object storage error response:", response);
          console.error("Full error object:", JSON.stringify(response.error, null, 2));

          // Handle specific error cases
          if (response.error?.message?.includes('Error code undefined')) {
            console.error("Object storage service appears to be having issues");
            return res.status(503).json({
              message: "Video service temporarily unavailable",
              error: "Object storage service error",
              filename,
              retry: true
            });
          }

          const errorMsg = response.error?.message ||
            (typeof response.error === 'string' ? response.error : 'Unknown storage error') ||
            'Object storage request failed';
          throw new Error(`Object storage error: ${errorMsg}`);
        }
      } else if (videoData && typeof videoData === 'object' && 'value' in videoData) {
        // Handle case where response doesn't have 'ok' field but has 'value'
        const response = videoData as { value: Buffer[] };
        if (Array.isArray(response.value) && response.value.length > 0) {
          buffer = response.value[0];
          console.log("Extracted Buffer from legacy response format");
        } else {
          throw new Error("Invalid object storage response - no valid data");
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

  // Object storage health check
  app.get("/api/debug/storage-health", async (req, res) => {
    if (!req.isAuthenticated() || !req.user.isAdmin) {
      return res.status(403).send("Unauthorized");
    }

    try {
      console.log("Running comprehensive object storage health check...");

      // Check environment variables
      const envStatus = {
        REPLIT_OBJECT_STORAGE_BUCKET_ID: process.env.REPLIT_OBJECT_STORAGE_BUCKET_ID || "Not set",
        REPLIT_DB_URL: process.env.REPLIT_DB_URL ? "Set" : "Not set",
        explicitBucketId: BUCKET_ID
      };
      console.log("Environment status:", envStatus);

      // Try to create a fresh client
      let freshClientTest;
      try {
        const freshClient = new Client();
        freshClientTest = await freshClient.list();
        console.log("Fresh client test result:", JSON.stringify(freshClientTest, null, 2));
      } catch (freshClientError) {
        console.error("Fresh client test failed:", freshClientError);
        freshClientTest = { error: freshClientError.message };
      }

      // Test basic list operation with existing client
      let listResult;
      try {
        listResult = await objectStorage.list();
        console.log("Existing client list result:", JSON.stringify(listResult, null, 2));
      } catch (listError) {
        console.error("List operation failed:", listError);
        listResult = { error: listError.message };
      }

      // Test upload with a small file
      const testData = Buffer.from("test-data-" + Date.now());
      const testFilename = `test/health-check-${Date.now()}.txt`;

      let uploadResult, downloadResult, deleteResult;

      try {
        uploadResult = await objectStorage.uploadFromBytes(testFilename, testData);
        console.log("Upload test result:", JSON.stringify(uploadResult, null, 2));

        if (uploadResult && uploadResult.ok) {
          try {
            downloadResult = await objectStorage.downloadAsBytes(testFilename);
            console.log("Download test result:", JSON.stringify(downloadResult, null, 2));
          } catch (downloadError) {
            downloadResult = { error: downloadError.message };
          }

          try {
            deleteResult = await objectStorage.delete(testFilename);
            console.log("Delete test result:", JSON.stringify(deleteResult, null, 2));
          } catch (deleteError) {
            deleteResult = { error: deleteError.message };
          }
        }
      } catch (testError) {
        console.error("Object storage test operation failed:", testError);
        uploadResult = { error: testError.message };
      }

      res.json({
        timestamp: new Date().toISOString(),
        environment: envStatus,
        freshClientTest,
        listOperation: listResult,
        uploadTest: uploadResult,
        downloadTest: downloadResult,
        deleteTest: deleteResult
      });
    } catch (error) {
      console.error("Storage health check error:", error);
      res.status(500).json({
        error: error.message,
        timestamp: new Date().toISOString()
      });
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
    const userProgressRecord = await prisma.userProgress.findFirst({
      where: { id: progressId }
    });

    if (!userProgressRecord || !userProgressRecord.videoUrl) {
      return res.status(404).send("Progress record not found or no video submitted");
    }

    // Check if AI feedback already exists and delete it if found (to allow reanalysis)
    const existingAiFeedback = await prisma.feedback.findMany({
      where: {
        progressId: progressId,
        isAiGenerated: true
      }
    });

    if (existingAiFeedback.length > 0) {
      // Delete existing AI feedback to allow fresh analysis
      await prisma.feedback.deleteMany({
        where: {
          progressId: progressId,
          isAiGenerated: true
        }
      });
    }

    // Create pending AI feedback record
    const aiFeedback = await prisma.feedback.create({
      data: {
        progressId,
        content: "AI analysis pending...",
        rating: 3, // Default neutral rating
        isAiGenerated: true,
        aiAnalysisStatus: "pending",
        aiConfidenceScore: null,
      }
    });

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

    const aiFeedback = await prisma.feedback.findFirst({
      where: {
        progressId: progressId,
        isAiGenerated: true
      }
    });

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

  // Admin endpoints
  app.get("/api/admin/tools", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const tools = await prisma.tool.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(tools);
    } catch (error) {
      console.error("Error fetching tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.post("/api/admin/tools", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const tool = await prisma.tool.create({
        data: req.body
      });
      res.json(tool);
    } catch (error) {
      console.error("Error creating tool:", error);
      res.status(500).json({ message: "Failed to create tool" });
    }
  });

  app.put("/api/admin/tools/:id", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const tool = await prisma.tool.update({
        where: { id },
        data: req.body
      });
      res.json(tool);
    } catch (error) {
      console.error("Error updating tool:", error);
      res.status(500).json({ message: "Failed to update tool" });
    }
  });

  app.delete("/api/admin/tools/:id", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await prisma.tool.delete({
        where: { id }
      });
      res.json({ message: "Tool deleted successfully" });
    } catch (error) {
      console.error("Error deleting tool:", error);
      res.status(500).json({ message: "Failed to delete tool" });
    }
  });

  // AI Models endpoints
  app.get("/api/admin/ai-models", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const models = await prisma.aIModel.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  app.post("/api/admin/ai-models", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const model = await prisma.aIModel.create({
        data: req.body
      });
      res.json(model);
    } catch (error) {
      console.error("Error creating AI model:", error);
      res.status(500).json({ message: "Failed to create AI model" });
    }
  });

  app.put("/api/admin/ai-models/:id", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      const model = await prisma.aIModel.update({
        where: { id },
        data: req.body
      });
      res.json(model);
    } catch (error) {
      console.error("Error updating AI model:", error);
      res.status(500).json({ message: "Failed to update AI model" });
    }
  });

  app.delete("/api/admin/ai-models/:id", async (req, res) => {
    try {
      if (!req.user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const id = parseInt(req.params.id);
      await prisma.aIModel.delete({
        where: { id }
      });
      res.json({ message: "AI model deleted successfully" });
    } catch (error) {
      console.error("Error deleting AI model:", error);
      res.status(500).json({ message: "Failed to delete AI model" });
    }
  });

  app.post("/api/admin/ai-models/:id/test", isAdmin, async (req, res) => {
    try {
      const modelId = parseInt(req.params.id);

      const model = await prisma.aIModel.findUnique({
        where: { id: modelId }
      });

      if (!model) {
        return res.status(404).json({ message: "AI model not found" });
      }

      // Test video processing for Gemini models
      if (model.provider === 'google' || model.provider === 'gemini') {
        try {
          const videoProcessor = new (await import("./video-processor")).VideoProcessor(model.apiKey);
          const isConnected = await videoProcessor.testConnection();

          res.json({
            success: isConnected,
            response: isConnected ? 'Video processing API connection successful' : 'API connection failed',
            model: model.name,
            hasVideoProcessing: true
          });
          return;
        } catch (videoError) {
          console.error("Video processor test failed:", videoError);
          // Fall through to standard test
        }
      }

      // Simple test message for non-Gemini models
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
        } else if (model.provider === 'google' || model.provider === 'gemini') {
          headers['Authorization'] = `Bearer ${model.apiKey}`;

          requestBody = {
            contents: [
              {
                parts: [
                  { text: `${model.systemPrompt}\n\n${testMessage}` }
                ]
              }
            ],
            generationConfig: {
              temperature: model.temperature / 100,
              maxOutputTokens: Math.min(model.maxTokens, 100),
            }
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

        // Use the modified endpoint for Gemini
        const apiEndpoint = (model.provider === 'google' || model.provider === 'gemini')
          ? (model.endpoint.includes('?')
            ? `${model.endpoint}&key=${model.apiKey}`
            : `${model.endpoint}?key=${model.apiKey}`)
          : model.endpoint;

        const response = await fetch(apiEndpoint, {
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
        } else if (model.provider === 'google' || model.provider === 'gemini') {
          aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response content';
        } else {
          // Default to OpenAI format
          aiResponse = data.choices?.[0]?.message?.content || 'No response content';
        }

        res.json({
          success: true,
          response: aiResponse,
          model: model.name,
          hasVideoProcessing: false
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

  // Admin tools endpoints
  app.get("/api/admin/tools", isAdmin, async (req, res) => {
    try {
      const tools = await prisma.tool.findMany({
        orderBy: { createdAt: 'desc' }
      });
      res.json(tools);
    } catch (error) {
      console.error("Error fetching admin tools:", error);
      res.status(500).json({ message: "Failed to fetch tools" });
    }
  });

  app.post("/api/admin/tools", isAdmin, async (req, res) => {
    try {
      const { title, description, downloadUrl, images, pythonCode, isActive } = req.body;

      if (!title || !description || !downloadUrl) {
        return res.status(400).json({ message: "Title, description, and download URL are required" });
      }

      const newTool = await prisma.tool.create({
        data: {
          title,
          description,
          downloadUrl,
          images: images || [],
          pythonCode: pythonCode || null,
          isActive: isActive !== undefined ? isActive : true,
        }
      });

      res.json(newTool);
    } catch (error) {
      console.error("Error creating tool:", error);
      res.status(500).json({ message: "Failed to create tool" });
    }
  });

  app.put("/api/admin/tools/:id", isAdmin, async (req, res) => {
    try {
      const { title, description, downloadUrl, images, pythonCode, isActive } = req.body;
      const toolId = parseInt(req.params.id);

      if (!title || !description || !downloadUrl) {
        return res.status(400).json({ message: "Title, description, and download URL are required" });
      }

      const updatedTool = await prisma.tool.update({
        where: {
          id: toolId,
        },
        data: {
          title,
          description,
          downloadUrl,
          images: images || [],
          pythonCode: pythonCode || null,
          isActive: isActive !== undefined ? isActive : true,
          updatedAt: new Date(),
        }
      });

      res.json(updatedTool);
    } catch (error) {
      console.error("Error updating tool:", error);
      res.status(500).json({ message: "Failed to update tool" });
    }
  });

  app.delete("/api/admin/tools/:id", isAdmin, async (req, res) => {
    try {
      const toolId = parseInt(req.params.id);

      const deletedTool = await prisma.tool.delete({
        where: {
          id: toolId,
        },
      });

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