/**
 * Subscriptions Schema（從 .NET 遷移）
 */

import { pgTable, uuid, varchar, text, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: varchar("user_id", { length: 255 })
    .notNull()
    .references(() => users.id),
  endpoint: text("endpoint").notNull(),
  p256dh: text("p256dh"),
  auth: text("auth"),
  createdAt: timestamp("created_at").defaultNow(),
});
