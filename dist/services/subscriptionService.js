/**
 * Subscription Service
 */
import { subscriptionRepository } from "../repositories/subscriptionRepository.js";
export const subscriptionService = {
    async subscribe(userId, data) {
        return subscriptionRepository.create({
            userId,
            endpoint: data.endpoint,
            p256dh: data.keys.p256dh,
            auth: data.keys.auth,
        });
    },
    async unsubscribe(userId, endpoint) {
        await subscriptionRepository.deleteByUserAndEndpoint(userId, endpoint);
    },
};
