/**
 * Shopping Lists Schema
 */
import { pgTable, uuid, varchar, text, timestamp, boolean, } from "drizzle-orm/pg-core";
import { groups } from "./groups.js";
import { users } from "./users.js";
export const shoppingLists = pgTable("shopping_lists", {
    id: uuid("id").primaryKey().defaultRandom(),
    groupId: uuid("group_id")
        .notNull()
        .references(() => groups.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 255 }),
    coverPhotoPath: text("cover_photo_path"),
    startsAt: timestamp("starts_at").notNull(),
    enableNotifications: boolean("enable_notifications").default(false),
    createdBy: varchar("created_by", { length: 255 }).references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});
