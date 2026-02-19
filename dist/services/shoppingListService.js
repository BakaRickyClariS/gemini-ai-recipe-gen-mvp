/**
 * Shopping List Service
 */
import { shoppingListRepository } from "../repositories/shoppingListRepository.js";
import { groupRepository } from "../repositories/groupRepository.js";
import { ApiError } from "../errors/ApiError.js";
export const shoppingListService = {
    async listByGroup(groupId, userId) {
        const isMember = await groupRepository.isMember(groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member of this group");
        return shoppingListRepository.findByGroupId(groupId);
    },
    async create(groupId, userId, data) {
        const isMember = await groupRepository.isMember(groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member of this group");
        return shoppingListRepository.create({
            groupId,
            title: data.title,
            coverPhotoPath: data.coverPhotoPath,
            startsAt: new Date(data.startsAt),
            enableNotifications: data.enableNotifications,
            createdBy: userId,
        });
    },
    async getById(id, userId) {
        const list = await shoppingListRepository.findById(id);
        if (!list)
            throw ApiError.notFound("Shopping list not found");
        const isMember = await groupRepository.isMember(list.groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member");
        const items = await shoppingListRepository.getItems(id);
        return { ...list, items };
    },
    async update(id, userId, data) {
        const list = await shoppingListRepository.findById(id);
        if (!list)
            throw ApiError.notFound("Shopping list not found");
        const isMember = await groupRepository.isMember(list.groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member");
        const updateData = { ...data };
        if (data.startsAt)
            updateData.startsAt = new Date(data.startsAt);
        return shoppingListRepository.update(id, updateData);
    },
    async delete(id, userId) {
        const list = await shoppingListRepository.findById(id);
        if (!list)
            throw ApiError.notFound("Shopping list not found");
        const isMember = await groupRepository.isMember(list.groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member");
        await shoppingListRepository.delete(id);
    },
    // Items
    async getItems(listId, userId) {
        const list = await shoppingListRepository.findById(listId);
        if (!list)
            throw ApiError.notFound("Shopping list not found");
        const isMember = await groupRepository.isMember(list.groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member");
        return shoppingListRepository.getItems(listId);
    },
    async createItem(listId, userId, data) {
        const list = await shoppingListRepository.findById(listId);
        if (!list)
            throw ApiError.notFound("Shopping list not found");
        const isMember = await groupRepository.isMember(list.groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member");
        return shoppingListRepository.createItem({
            shoppingListId: listId,
            name: data.name,
            quantity: data.quantity?.toString(),
            unit: data.unit,
            photoPath: data.photoPath,
            addedBy: userId,
        });
    },
    async updateItem(itemId, userId, data) {
        const item = await shoppingListRepository.findItemById(itemId);
        if (!item)
            throw ApiError.notFound("Item not found");
        const list = await shoppingListRepository.findById(item.shoppingListId);
        if (!list)
            throw ApiError.notFound("Shopping list not found");
        const isMember = await groupRepository.isMember(list.groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member");
        const updateData = { ...data };
        if (data.quantity !== undefined)
            updateData.quantity = data.quantity?.toString() ?? null;
        return shoppingListRepository.updateItem(itemId, updateData);
    },
    async deleteItem(itemId, userId) {
        const item = await shoppingListRepository.findItemById(itemId);
        if (!item)
            throw ApiError.notFound("Item not found");
        const list = await shoppingListRepository.findById(item.shoppingListId);
        if (!list)
            throw ApiError.notFound("Shopping list not found");
        const isMember = await groupRepository.isMember(list.groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member");
        await shoppingListRepository.deleteItem(itemId);
    },
};
