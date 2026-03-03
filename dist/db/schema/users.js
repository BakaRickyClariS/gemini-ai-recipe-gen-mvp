/**
 * Users Schema
 */
import { pgTable, varchar, text, timestamp, jsonb, boolean, integer, } from "drizzle-orm/pg-core";
export const users = pgTable("users", {
    id: varchar("id", { length: 255 }).primaryKey(),
    displayName: varchar("display_name", { length: 255 }),
    email: varchar("email", { length: 255 }).unique(),
    passwordHash: varchar("password_hash", { length: 255 }),
    profilePictureUrl: text("profile_picture_url"),
    avatar: text("avatar"),
    gender: varchar("gender", { length: 20 }).default("NotSpecified"),
    customGender: varchar("custom_gender", { length: 100 }),
    preferences: jsonb("preferences").default([]),
    lineUserId: varchar("line_user_id", { length: 255 }),
    provider: varchar("provider", { length: 20 }).default("local"),
    // Legacy columns (keep them to prevent data loss during push)
    fcmToken: text("fcm_token"),
    notifyPush: boolean("notify_push"),
    notifyExpiry: boolean("notify_expiry"),
    notifyMarketing: boolean("notify_marketing"),
    notifyLowStock: boolean("notify_low_stock"),
    daysBeforeExpiry: integer("days_before_expiry"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
