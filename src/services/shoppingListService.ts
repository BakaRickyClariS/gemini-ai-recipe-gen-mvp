/**
 * Shopping List Service
 */

import { shoppingListRepository } from "../repositories/shoppingListRepository.js";
import { groupRepository } from "../repositories/groupRepository.js";
import { ApiError } from "../errors/ApiError.js";

const formatItem = (item: any) => {
  if (!item) return item;
  return {
    ...item,
    creator_id: item.addedBy,
  };
};

export const shoppingListService = {
  async listByGroup(groupId: string, userId: string) {
    const isMember = await groupRepository.isMember(groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member of this group");
    return shoppingListRepository.findByGroupId(groupId);
  },

  async create(
    groupId: string,
    userId: string,
    data: {
      title?: string | null;
      coverPhotoPath?: string | null;
      startsAt: string;
      enableNotifications?: boolean;
    },
  ) {
    const isMember = await groupRepository.isMember(groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member of this group");
    return shoppingListRepository.create({
      groupId,
      title: data.title,
      coverPhotoPath: data.coverPhotoPath,
      startsAt: new Date(data.startsAt),
      enableNotifications: data.enableNotifications,
      createdBy: userId,
    });
  },

  async getById(id: string, userId: string) {
    const list = await shoppingListRepository.findById(id);
    if (!list) throw ApiError.notFound("Shopping list not found");

    const isMember = await groupRepository.isMember(list.groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member");

    const items = await shoppingListRepository.getItems(id);
    return { ...list, items: items.map(formatItem) };
  },

  async update(id: string, userId: string, data: any) {
    const list = await shoppingListRepository.findById(id);
    if (!list) throw ApiError.notFound("Shopping list not found");

    const isMember = await groupRepository.isMember(list.groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member");

    const updateData = { ...data };
    if (data.startsAt) updateData.startsAt = new Date(data.startsAt);

    return shoppingListRepository.update(id, updateData);
  },

  async delete(id: string, userId: string) {
    const list = await shoppingListRepository.findById(id);
    if (!list) throw ApiError.notFound("Shopping list not found");

    const isMember = await groupRepository.isMember(list.groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member");

    await shoppingListRepository.delete(id);
  },

  // Items
  async getItems(listId: string, userId: string) {
    const list = await shoppingListRepository.findById(listId);
    if (!list) throw ApiError.notFound("Shopping list not found");

    const isMember = await groupRepository.isMember(list.groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member");

    const items = await shoppingListRepository.getItems(listId);
    return items.map(formatItem);
  },

  async createItem(
    listId: string,
    userId: string,
    data: {
      name: string;
      quantity?: number;
      unit?: string;
      photoPath?: string | null;
    },
  ) {
    const list = await shoppingListRepository.findById(listId);
    if (!list) throw ApiError.notFound("Shopping list not found");

    const isMember = await groupRepository.isMember(list.groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member");

    const item = await shoppingListRepository.createItem({
      shoppingListId: listId,
      name: data.name,
      quantity: data.quantity?.toString(),
      unit: data.unit,
      photoPath: data.photoPath,
      addedBy: userId,
    });
    return formatItem(item);
  },

  async updateItem(itemId: string, userId: string, data: any) {
    const item = await shoppingListRepository.findItemById(itemId);
    if (!item) throw ApiError.notFound("Item not found");

    const list = await shoppingListRepository.findById(item.shoppingListId);
    if (!list) throw ApiError.notFound("Shopping list not found");

    const isMember = await groupRepository.isMember(list.groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member");

    const updateData = { ...data };
    if (data.quantity !== undefined)
      updateData.quantity = data.quantity?.toString() ?? null;

    const updated = await shoppingListRepository.updateItem(itemId, updateData);
    return formatItem(updated);
  },

  async deleteItem(itemId: string, userId: string) {
    const item = await shoppingListRepository.findItemById(itemId);
    if (!item) throw ApiError.notFound("Item not found");

    const list = await shoppingListRepository.findById(item.shoppingListId);
    if (!list) throw ApiError.notFound("Shopping list not found");

    const isMember = await groupRepository.isMember(list.groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member");

    await shoppingListRepository.deleteItem(itemId);
  },
};
