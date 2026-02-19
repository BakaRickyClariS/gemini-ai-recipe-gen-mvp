/**
 * User Repository
 * 遵循 backend-patterns：Repository 封裝資料存取
 */

import { eq } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { users } from "../db/schema/index.js";

export interface UpdateProfileDto {
  displayName?: string;
  email?: string;
  profilePictureUrl?: string | null;
  avatar?: string | null;
  gender?: string;
  customGender?: string | null;
  preferences?: unknown[];
}

export const userRepository = {
  async findById(id: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  },

  async findByLineUserId(lineUserId: string) {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.lineUserId, lineUserId))
      .limit(1);
    return result[0] || null;
  },

  async upsert(
    id: string,
    data: {
      displayName?: string;
      lineUserId?: string;
      profilePictureUrl?: string;
    },
  ) {
    const existing = await this.findById(id);
    if (existing) {
      await db
        .update(users)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(users.id, id));
      return { ...existing, ...data };
    }
    const [created] = await db
      .insert(users)
      .values({ id, ...data })
      .returning();
    return created;
  },

  async updateProfile(id: string, data: UpdateProfileDto) {
    const [updated] = await db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updated || null;
  },
};
