/**
 * V2 Group Service
 * Dedicated service for v2 API to provide additional info like member counts, avatars, etc.
 * without breaking legacy v1 endpoints.
 */

import {
  v2GroupRepository,
  groupRepository,
  invitationRepository,
} from "../repositories/groupRepository.js";
import { ApiError } from "../errors/ApiError.js";
import { createInventoryItem } from "./inventoryService.js";

export const v2GroupService = {
  async listByUser(userId: string) {
    let groups = await v2GroupRepository.findGroupsByUserId(userId);
    if (!groups || groups.length === 0) {
      // Auto-create a default group if the user has none using v1 repo
      await groupRepository.create({ name: "我的冰箱", ownerId: userId });
      groups = await v2GroupRepository.findGroupsByUserId(userId);
    }
    return groups;
  },

  async getById(id: string, userId: string) {
    const isMember = await groupRepository.isMember(id, userId);
    if (!isMember) throw ApiError.forbidden("Not a member of this group");

    const group = await v2GroupRepository.findGroupDetailById(id, userId);
    if (!group) throw ApiError.notFound("Group not found");

    return group;
  },

  // Re-use v1 methods where there is no difference in response shape needed
  async create(name: string, ownerId: string) {
    const group = await groupRepository.create({ name, ownerId });

    // Test drive / Onboarding: mock inventory for new groups
    try {
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
      await createInventoryItem(ownerId, group.id, {
        name: "迎賓牛奶 (示範)",
        category: "milk",
        quantity: 1,
        unit: "瓶",
        purchaseDate: new Date().toISOString().split("T")[0],
        expiryDate: tomorrow,
        notes: "這是自動為你準備的示範食材，幫助你體驗即期食譜功能 ✨",
        lowStockAlert: true,
        lowStockThreshold: 1,
      });
    } catch (e) {
      console.warn("[Onboarding] Failed to create mock inventory item", e);
    }

    return group;
  },

  async update(id: string, userId: string, data: { name?: string }) {
    const isOwner = await groupRepository.isOwner(id, userId);
    if (!isOwner) throw ApiError.forbidden("Only owner can update group");
    return groupRepository.update(id, data);
  },

  async delete(id: string, userId: string) {
    const isOwner = await groupRepository.isOwner(id, userId);
    if (!isOwner) throw ApiError.forbidden("Only owner can delete group");
    await groupRepository.delete(id);
  },

  async createInvitation(groupId: string, userId: string) {
    const isMember = await groupRepository.isMember(groupId, userId);
    if (!isMember) throw ApiError.forbidden("Not a member");

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    return invitationRepository.create({
      groupId,
      createdBy: userId,
      expiresAt,
    });
  },

  async getInvitation(token: string) {
    const invitation = await invitationRepository.findByToken(token);
    if (!invitation) throw ApiError.notFound("Invitation not found");

    if (invitation.expiresAt && invitation.expiresAt < new Date()) {
      throw ApiError.badRequest("Invitation expired");
    }

    if (invitation.maxUses && invitation.usedCount! >= invitation.maxUses) {
      throw ApiError.badRequest("Invitation usage limit reached");
    }

    const group = await groupRepository.findById(invitation.groupId);
    return { invitation, group };
  },

  async joinGroup(token: string, userId: string) {
    const { invitation, group } = await this.getInvitation(token);

    if (!group) {
      throw ApiError.notFound("Group not found");
    }

    const alreadyMember = await groupRepository.isMember(
      invitation.groupId,
      userId,
    );
    if (alreadyMember) throw ApiError.conflict("Already a member");

    await groupRepository.addMember(invitation.groupId, userId);
    await invitationRepository.incrementUsedCount(invitation.id);

    return group;
  },

  async removeMember(groupId: string, requesterId: string, memberId: string) {
    const isOwner = await groupRepository.isOwner(groupId, requesterId);
    if (!isOwner) throw ApiError.forbidden("Only owner can remove members");
    if (requesterId === memberId)
      throw ApiError.badRequest("Cannot remove yourself, use leave instead");
    await groupRepository.removeMember(groupId, memberId);
  },

  async leaveGroup(groupId: string, userId: string) {
    const isOwner = await groupRepository.isOwner(groupId, userId);
    if (isOwner)
      throw ApiError.badRequest(
        "Owner cannot leave. Transfer ownership or delete the group",
      );
    await groupRepository.removeMember(groupId, userId);
  },
};
