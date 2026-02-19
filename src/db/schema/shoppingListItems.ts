/**
 * Shopping List Items Schema
 */

import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  boolean,
  numeric,
} from "drizzle-orm/pg-core";
import { shoppingLists } from "./shoppingLists.js";
import { users } from "./users.js";

export const shoppingListItems = pgTable("shopping_list_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  shoppingListId: uuid("shopping_list_id")
    .notNull()
    .references(() => shoppingLists.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 255 }).notNull(),
  quantity: numeric("quantity", { precision: 10, scale: 2 }),
  unit: varchar("unit", { length: 20 }),
  photoPath: text("photo_path"),
  isChecked: boolean("is_checked").default(false),
  addedBy: varchar("added_by", { length: 255 }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
