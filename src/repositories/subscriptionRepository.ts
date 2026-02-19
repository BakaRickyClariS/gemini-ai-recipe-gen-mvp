/**
 * Subscription Repository
 */

import { eq, and } from "drizzle-orm";
import { db } from "../db/drizzle.js";
import { subscriptions } from "../db/schema/index.js";

export const subscriptionRepository = {
  async create(data: {
    userId: string;
    endpoint: string;
    p256dh?: string;
    auth?: string;
  }) {
    const [sub] = await db.insert(subscriptions).values(data).returning();
    return sub;
  },

  async deleteByUserAndEndpoint(userId: string, endpoint: string) {
    await db
      .delete(subscriptions)
      .where(
        and(
          eq(subscriptions.userId, userId),
          eq(subscriptions.endpoint, endpoint),
        ),
      );
  },

  async findByUserId(userId: string) {
    return db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, userId));
  },
};
