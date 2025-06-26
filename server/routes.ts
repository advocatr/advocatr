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

    // Mock AI analysis - replace with actual AI service call
    const mockFeedback = generateMockAiFeedback();
    
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Update with AI results
    await db
      .update(feedback)
      .set({
        content: mockFeedback.content,
        rating: mockFeedback.rating,
        aiAnalysisStatus: "completed",
        aiConfidenceScore: mockFeedback.confidenceScore,
      })
      .where(eq(feedback.id, feedbackId));

    console.log(`AI analysis completed for feedback ${feedbackId}`);
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

      console.log("Video file details:", { 
        name: videoFile.name, 
        size: videoFile.data.length, 
        mimetype: videoFile.mimetype 
      });

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `videos/${req.user.id}_${timestamp}.webm`;

      console.log("Uploading to object storage:", filename);
      
      // Upload to object storage
      await objectStorage.uploadFromBytes(filename, videoFile.data);

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
      const videoData = await objectStorage.downloadAsBytes(filename);
      const buffer = Buffer.from(videoData);
      
      res.setHeader('Content-Type', 'video/webm');
      res.setHeader('Content-Length', buffer.length.toString());
      res.send(buffer);
    } catch (error) {
      console.error("Error serving video:", error);
      res.status(404).json({ message: "Video not found" });
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