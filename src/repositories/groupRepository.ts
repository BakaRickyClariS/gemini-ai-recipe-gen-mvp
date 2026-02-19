/**
 * Group Repository
 */

import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import {
  groups,
  groupMemberships,
  groupInvitations,
} from "../db/schema/index.js";

export const groupRepository = {
  async findByUserId(userId: string) {
    const result = await db
      .select({
        id: groups.id,
        name: groups.name,
        ownerId: groups.ownerId,
        createdAt: groups.createdAt,
        role: groupMemberships.role,
      })
      .from(groups)
      .innerJoin(groupMemberships, eq(groups.id, groupMemberships.groupId))
      .where(eq(groupMemberships.userId, userId));
    return result;
  },

  async findById(id: string) {
    const result = await db
      .select()
      .from(groups)
      .where(eq(groups.id, id))
      .limit(1);
    return result[0] || null;
  },

  async create(data: { name: string; ownerId: string }) {
    const [group] = await db.insert(groups).values(data).returning();
    await db.insert(groupMemberships).values({
      groupId: group.id,
      userId: data.ownerId,
      role: "owner",
    });
    return group;
  },

  async update(id: string, data: { name?: string }) {
    const [updated] = await db
      .update(groups)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(groups.id, id))
      .returning();
    return updated || null;
  },

  async delete(id: string) {
    await db.delete(groups).where(eq(groups.id, id));
  },

  async getMembers(groupId: string) {
    return db
      .select({
        membershipId: groupMemberships.id,
        userId: groupMemberships.userId,
        role: groupMemberships.role,
        joinedAt: groupMemberships.joinedAt,
      })
      .from(groupMemberships)
      .where(eq(groupMemberships.groupId, groupId));
  },

  async isMember(groupId: string, userId: string) {
    const result = await db
      .select()
      .from(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, userId),
        ),
      )
      .limit(1);
    return result.length > 0;
  },

  async isOwner(groupId: string, userId: string) {
    const result = await db
      .select()
      .from(groups)
      .where(and(eq(groups.id, groupId), eq(groups.ownerId, userId)))
      .limit(1);
    return result.length > 0;
  },

  async addMember(groupId: string, userId: string, role = "member") {
    const [membership] = await db
      .insert(groupMemberships)
      .values({ groupId, userId, role })
      .returning();
    return membership;
  },

  async removeMember(groupId: string, userId: string) {
    await db
      .delete(groupMemberships)
      .where(
        and(
          eq(groupMemberships.groupId, groupId),
          eq(groupMemberships.userId, userId),
        ),
      );
  },
};

export const invitationRepository = {
  async create(data: { groupId: string; createdBy: string; expiresAt?: Date }) {
    const token = crypto.randomUUID();
    const [invitation] = await db
      .insert(groupInvitations)
      .values({ ...data, token })
      .returning();
    return invitation;
  },

  async findByToken(token: string) {
    const result = await db
      .select()
      .from(groupInvitations)
      .where(eq(groupInvitations.token, token))
      .limit(1);
    return result[0] || null;
  },

  async incrementUsedCount(id: string) {
    await db
      .update(groupInvitations)
      .set({ usedCount: sql`${groupInvitations.usedCount} + 1` })
      .where(eq(groupInvitations.id, id));
  },
};
