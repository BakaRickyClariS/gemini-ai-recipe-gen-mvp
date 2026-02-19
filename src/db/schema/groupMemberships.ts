/**
 * Group Memberships Schema
 */

import { pgTable, uuid, varchar, timestamp, unique } from "drizzle-orm/pg-core";
import { groups } from "./groups.js";
import { users } from "./users.js";

export const groupMemberships = pgTable(
  "group_memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    role: varchar("role", { length: 20 }).default("member"),
    joinedAt: timestamp("joined_at").defaultNow(),
  },
  (table) => ({
    uniqueMembership: unique().on(table.groupId, table.userId),
  }),
);
