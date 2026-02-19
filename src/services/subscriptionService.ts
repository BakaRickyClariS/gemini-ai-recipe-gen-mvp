/**
 * Subscription Service
 */

import { subscriptionRepository } from "../repositories/subscriptionRepository.js";

export const subscriptionService = {
  async subscribe(
    userId: string,
    data: { endpoint: string; keys: { p256dh: string; auth: string } },
  ) {
    return subscriptionRepository.create({
      userId,
      endpoint: data.endpoint,
      p256dh: data.keys.p256dh,
      auth: data.keys.auth,
    });
  },

  async unsubscribe(userId: string, endpoint: string) {
    await subscriptionRepository.deleteByUserAndEndpoint(userId, endpoint);
  },
};
