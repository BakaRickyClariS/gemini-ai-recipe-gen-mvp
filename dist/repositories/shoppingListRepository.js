/**
 * Shopping List Repository
 */
import { eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { shoppingLists, shoppingListItems } from "../db/schema/index.js";
export const shoppingListRepository = {
    async findByGroupId(groupId) {
        return db
            .select()
            .from(shoppingLists)
            .where(eq(shoppingLists.groupId, groupId));
    },
    async findById(id) {
        const result = await db
            .select()
            .from(shoppingLists)
            .where(eq(shoppingLists.id, id))
            .limit(1);
        return result[0] || null;
    },
    async create(data) {
        const [list] = await db.insert(shoppingLists).values(data).returning();
        return list;
    },
    async update(id, data) {
        const [updated] = await db
            .update(shoppingLists)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(shoppingLists.id, id))
            .returning();
        return updated || null;
    },
    async delete(id) {
        await db.delete(shoppingLists).where(eq(shoppingLists.id, id));
    },
    async getItems(listId) {
        return db
            .select()
            .from(shoppingListItems)
            .where(eq(shoppingListItems.shoppingListId, listId));
    },
    async createItem(data) {
        const [item] = await db.insert(shoppingListItems).values(data).returning();
        return item;
    },
    async updateItem(itemId, data) {
        const [updated] = await db
            .update(shoppingListItems)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(shoppingListItems.id, itemId))
            .returning();
        return updated || null;
    },
    async deleteItem(itemId) {
        await db.delete(shoppingListItems).where(eq(shoppingListItems.id, itemId));
    },
    async findItemById(itemId) {
        const result = await db
            .select()
            .from(shoppingListItems)
            .where(eq(shoppingListItems.id, itemId))
            .limit(1);
        return result[0] || null;
    },
};
