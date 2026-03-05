/**
 * Group Repository
 */

import { eq, and, sql } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import {
  groups,
  groupMemberships,
  groupInvitations,
  users,
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

export const v2GroupRepository = {
  async findGroupsByUserId(userId: string) {
    // 1. Get all group IDs where the user is a member
    const userMemberships = await db
      .select({ groupId: groupMemberships.groupId })
      .from(groupMemberships)
      .where(eq(groupMemberships.userId, userId));

    const groupIds = userMemberships.map((m) => m.groupId);

    if (groupIds.length === 0) return [];

    // 2. Fetch those groups with their members and member user info
    const groupsWithMembers = await db
      .select({
        // Group fields
        id: groups.id,
        name: groups.name,
        ownerId: groups.ownerId,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
        // Membership fields
        membershipId: groupMemberships.id,
        membershipRole: groupMemberships.role,
        membershipJoinedAt: groupMemberships.joinedAt,
        // User fields
        userId: users.id,
        userName: sql<string>`COALESCE(${users.displayName}, '未知')`,
        userAvatar: sql<
          string | null
        >`COALESCE(${users.profilePictureUrl}, ${users.avatar})`,
      })
      .from(groups)
      .innerJoin(groupMemberships, eq(groups.id, groupMemberships.groupId))
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(sql`${groups.id} IN ${groupIds}`);

    // 3. Aggregate results per group
    const groupsMap = new Map<string, any>();

    for (const row of groupsWithMembers) {
      if (!groupsMap.has(row.id)) {
        groupsMap.set(row.id, {
          id: row.id,
          name: row.name,
          ownerId: row.ownerId,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          memberCount: 0,
          members: [],
        });
      }

      const group = groupsMap.get(row.id)!;
      group.memberCount++;
      group.members.push({
        membershipId: row.membershipId,
        userId: row.userId,
        role: row.membershipRole,
        joinedAt: row.membershipJoinedAt,
        name: row.userName,
        avatar: row.userAvatar,
      });

      // To find current user's role on the group level for legacy compatibility
      if (row.userId === userId) {
        group.role = row.membershipRole;
      }
    }

    // Convert map to array and compute preview avatars
    return Array.from(groupsMap.values()).map((g) => {
      // Sort members (e.g. owners first, or by join date)
      g.members.sort((a: any, b: any) => {
        if (a.role === "owner" && b.role !== "owner") return -1;
        if (a.role !== "owner" && b.role === "owner") return 1;
        return new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime();
      });

      // Take first 4 members with avatars
      g.memberAvatars = g.members
        .map((m: any) => m.avatar)
        .filter(Boolean)
        .slice(0, 4);

      // We might not need to expose full members array in list view if payload is large,
      // but keeping it simple for now or pick specific fields.
      // Let's delete the full `members` array to keep the list endpoint lightweight,
      // as `GET /groups` usually only needs counts and previews.
      const { members, ...groupBase } = g;
      return groupBase;
    });
  },

  async findGroupDetailById(groupId: string, userId: string) {
    // Note: Calling code should have verified that userId is a member

    // 1. Fetch group base info
    const [group] = await db
      .select({
        id: groups.id,
        name: groups.name,
        ownerId: groups.ownerId,
        createdAt: groups.createdAt,
        updatedAt: groups.updatedAt,
      })
      .from(groups)
      .where(eq(groups.id, groupId))
      .limit(1);

    if (!group) return null;

    // 2. Fetch all members with their user info
    const members = await db
      .select({
        membershipId: groupMemberships.id,
        userId: groupMemberships.userId,
        role: groupMemberships.role,
        joinedAt: groupMemberships.joinedAt,
        name: sql<string>`COALESCE(${users.displayName}, '未知')`,
        avatar: sql<
          string | null
        >`COALESCE(${users.profilePictureUrl}, ${users.avatar})`,
      })
      .from(groupMemberships)
      .innerJoin(users, eq(groupMemberships.userId, users.id))
      .where(eq(groupMemberships.groupId, groupId));

    // Sort owners first
    members.sort((a, b) => {
      if (a.role === "owner" && b.role !== "owner") return -1;
      if (a.role !== "owner" && b.role === "owner") return 1;
      return (a.joinedAt?.getTime() || 0) - (b.joinedAt?.getTime() || 0);
    });

    return {
      ...group,
      members,
    };
  },
};
