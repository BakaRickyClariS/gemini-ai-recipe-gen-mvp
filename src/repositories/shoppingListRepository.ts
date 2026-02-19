/**
 * Shopping List Repository
 */

import { eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { shoppingLists, shoppingListItems } from "../db/schema/index.js";

export const shoppingListRepository = {
  async findByGroupId(groupId: string) {
    return db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.groupId, groupId));
  },

  async findById(id: string) {
    const result = await db
      .select()
      .from(shoppingLists)
      .where(eq(shoppingLists.id, id))
      .limit(1);
    return result[0] || null;
  },

  async create(data: {
    groupId: string;
    title?: string | null;
    coverPhotoPath?: string | null;
    startsAt: Date;
    enableNotifications?: boolean;
    createdBy: string;
  }) {
    const [list] = await db.insert(shoppingLists).values(data).returning();
    return list;
  },

  async update(
    id: string,
    data: Partial<{
      title: string | null;
      coverPhotoPath: string | null;
      startsAt: Date;
      enableNotifications: boolean;
    }>,
  ) {
    const [updated] = await db
      .update(shoppingLists)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shoppingLists.id, id))
      .returning();
    return updated || null;
  },

  async delete(id: string) {
    await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
  },

  async getItems(listId: string) {
    return db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.shoppingListId, listId));
  },

  async createItem(data: {
    shoppingListId: string;
    name: string;
    quantity?: string;
    unit?: string;
    photoPath?: string | null;
    addedBy: string;
  }) {
    const [item] = await db.insert(shoppingListItems).values(data).returning();
    return item;
  },

  async updateItem(
    itemId: string,
    data: Partial<{
      name: string;
      quantity: string | null;
      unit: string | null;
      photoPath: string | null;
      isChecked: boolean;
    }>,
  ) {
    const [updated] = await db
      .update(shoppingListItems)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(shoppingListItems.id, itemId))
      .returning();
    return updated || null;
  },

  async deleteItem(itemId: string) {
    await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));
  },

  async findItemById(itemId: string) {
    const result = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.id, itemId))
      .limit(1);
    return result[0] || null;
  },
};
