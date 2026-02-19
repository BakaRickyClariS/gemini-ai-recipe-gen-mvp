/**
 * Users Schema
 */

import { pgTable, varchar, text, timestamp, jsonb } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: varchar("id", { length: 255 }).primaryKey(),
  displayName: varchar("display_name", { length: 255 }),
  email: varchar("email", { length: 255 }),
  profilePictureUrl: text("profile_picture_url"),
  avatar: text("avatar"),
  gender: varchar("gender", { length: 20 }).default("NotSpecified"),
  customGender: varchar("custom_gender", { length: 100 }),
  preferences: jsonb("preferences").default([]),
  lineUserId: varchar("line_user_id", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
