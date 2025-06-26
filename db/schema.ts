import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").unique().notNull(),
  password: text("password").notNull(),
  email: text("email").unique().notNull(),
  isAdmin: boolean("is_admin").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").unique().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const exercises = pgTable("exercises", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  demoVideoUrl: text("demo_video_url").notNull(),
  professionalAnswerUrl: text("professional_answer_url").notNull(),
  pdfUrl: text("pdf_url"),
  order: integer("order").notNull(),
  switchTimes: text("switch_times").notNull().default('[]'),
});

export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  exerciseId: integer("exercise_id").references(() => exercises.id).notNull(),
  videoUrl: text("video_url"),
  completed: boolean("completed").default(false),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  progressId: integer("progress_id").references(() => userProgress.id).notNull(),
  content: text("content").notNull(),
  rating: integer("rating").notNull(),
  isAiGenerated: boolean("is_ai_generated").default(false).notNull(),
  aiAnalysisStatus: text("ai_analysis_status"), // 'pending', 'processing', 'completed', 'failed'
  aiConfidenceScore: integer("ai_confidence_score"), // 1-100
  createdAt: timestamp("created_at").defaultNow(),
});

export const exerciseRelations = relations(exercises, ({ many }) => ({
  progress: many(userProgress),
}));

export const userRelations = relations(users, ({ many }) => ({
  progress: many(userProgress),
  resetTokens: many(passwordResetTokens),
}));

export const userProgressRelations = relations(userProgress, ({ one, many }) => ({
  user: one(users, { fields: [userProgress.userId], references: [users.id] }),
  exercise: one(exercises, { fields: [userProgress.exerciseId], references: [exercises.id] }),
  feedback: many(feedback),
}));

export const feedbackRelations = relations(feedback, ({ one }) => ({
  progress: one(userProgress, { fields: [feedback.progressId], references: [userProgress.id] }),
}));

export const passwordResetTokenRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));

import { varchar } from "drizzle-orm/pg-core";

export const tools = pgTable("tools", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description").notNull(),
  downloadUrl: varchar("download_url", { length: 500 }).notNull(),
  images: text("images").array(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);
export const insertFeedbackSchema = createInsertSchema(feedback);
export const selectFeedbackSchema = createSelectSchema(feedback);
export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens);
export const selectPasswordResetTokenSchema = createSelectSchema(passwordResetTokens);
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Feedback = typeof feedback.$inferSelect;
export type NewFeedback = typeof feedback.$inferInsert;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type NewPasswordResetToken = typeof passwordResetTokens.$inferInsert;
export type Tool = typeof tools.$inferSelect;
export type InsertTool = typeof tools.$inferInsert;