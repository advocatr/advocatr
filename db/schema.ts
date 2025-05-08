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
});

export const videoSwitchPoints = pgTable("video_switch_points", {
  id: serial("id").primaryKey(),
  exerciseId: integer("exercise_id").references(() => exercises.id).notNull(),
  timeInSeconds: integer("time_in_seconds").notNull(),
  nextVideoUrl: text("next_video_url").notNull(),
  order: integer("order").notNull(),
});

export const videoSwitchPointsRelations = relations(videoSwitchPoints, ({ one }) => ({
  exercise: one(exercises, { fields: [videoSwitchPoints.exerciseId], references: [exercises.id] }),
}));

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