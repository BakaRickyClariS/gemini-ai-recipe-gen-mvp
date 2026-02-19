/**
 * Subscription Controller
 */
import { BaseController } from "./BaseController.js";
import { subscriptionService } from "../services/subscriptionService.js";
export class SubscriptionController extends BaseController {
    async subscribe(req, res) {
        try {
            const sub = await subscriptionService.subscribe(req.user.userId, req.body);
            this.handleCreated(res, sub);
        }
        catch (error) {
            this.handleError(error, res, "SubscriptionController.subscribe");
        }
    }
    async unsubscribe(req, res) {
        try {
            await subscriptionService.unsubscribe(req.user.userId, req.body.endpoint);
            this.handleNoContent(res);
        }
        catch (error) {
            this.handleError(error, res, "SubscriptionController.unsubscribe");
        }
    }
}
