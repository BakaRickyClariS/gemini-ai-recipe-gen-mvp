/**
 * Group Invitations Schema
 */

import {
  pgTable,
  uuid,
  varchar,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { groups } from "./groups.js";
import { users } from "./users.js";

export const groupInvitations = pgTable("group_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  groupId: uuid("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 255 }).notNull().unique(),
  createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
  expiresAt: timestamp("expires_at"),
  maxUses: integer("max_uses").default(1),
  usedCount: integer("used_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});
