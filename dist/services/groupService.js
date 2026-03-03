/**
 * Group Service
 */
import { groupRepository, invitationRepository, } from "../repositories/groupRepository.js";
import { ApiError } from "../errors/ApiError.js";
export const groupService = {
    async listByUser(userId) {
        let groups = await groupRepository.findByUserId(userId);
        if (!groups || groups.length === 0) {
            // Auto-create a default group if the user has none
            await this.create("我的冰箱", userId);
            groups = await groupRepository.findByUserId(userId);
        }
        return groups;
    },
    async getById(id, userId) {
        const group = await groupRepository.findById(id);
        if (!group)
            throw ApiError.notFound("Group not found");
        const isMember = await groupRepository.isMember(id, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member of this group");
        const members = await groupRepository.getMembers(id);
        return { ...group, members };
    },
    async create(name, ownerId) {
        return groupRepository.create({ name, ownerId });
    },
    async update(id, userId, data) {
        const isOwner = await groupRepository.isOwner(id, userId);
        if (!isOwner)
            throw ApiError.forbidden("Only owner can update group");
        return groupRepository.update(id, data);
    },
    async delete(id, userId) {
        const isOwner = await groupRepository.isOwner(id, userId);
        if (!isOwner)
            throw ApiError.forbidden("Only owner can delete group");
        await groupRepository.delete(id);
    },
    async createInvitation(groupId, userId) {
        const isMember = await groupRepository.isMember(groupId, userId);
        if (!isMember)
            throw ApiError.forbidden("Not a member");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        return invitationRepository.create({
            groupId,
            createdBy: userId,
            expiresAt,
        });
    },
    async getInvitation(token) {
        const invitation = await invitationRepository.findByToken(token);
        if (!invitation)
            throw ApiError.notFound("Invitation not found");
        if (invitation.expiresAt && invitation.expiresAt < new Date()) {
            throw ApiError.badRequest("Invitation expired");
        }
        if (invitation.maxUses && invitation.usedCount >= invitation.maxUses) {
            throw ApiError.badRequest("Invitation usage limit reached");
        }
        const group = await groupRepository.findById(invitation.groupId);
        return { invitation, group };
    },
    async joinGroup(token, userId) {
        const { invitation, group } = await this.getInvitation(token);
        const alreadyMember = await groupRepository.isMember(invitation.groupId, userId);
        if (alreadyMember)
            throw ApiError.conflict("Already a member");
        await groupRepository.addMember(invitation.groupId, userId);
        await invitationRepository.incrementUsedCount(invitation.id);
        return group;
    },
    async removeMember(groupId, requesterId, memberId) {
        const isOwner = await groupRepository.isOwner(groupId, requesterId);
        if (!isOwner)
            throw ApiError.forbidden("Only owner can remove members");
        if (requesterId === memberId)
            throw ApiError.badRequest("Cannot remove yourself, use leave instead");
        await groupRepository.removeMember(groupId, memberId);
    },
    async leaveGroup(groupId, userId) {
        const isOwner = await groupRepository.isOwner(groupId, userId);
        if (isOwner)
            throw ApiError.badRequest("Owner cannot leave. Transfer ownership or delete the group");
        await groupRepository.removeMember(groupId, userId);
    },
};
