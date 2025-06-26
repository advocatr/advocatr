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


const randomBytesAsync = promisify(randomBytes);

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