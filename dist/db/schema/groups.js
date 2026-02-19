/**
 * Groups Schema
 */
import { pgTable, uuid, varchar, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users.js";
export const groups = pgTable("groups", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    ownerId: varchar("owner_id", { length: 255 })
        .notNull()
        .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
