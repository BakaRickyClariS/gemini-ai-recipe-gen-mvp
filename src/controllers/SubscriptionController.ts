/**
 * Subscription Controller
 */

import type { Request, Response } from "express";
import { BaseController } from "./BaseController.js";
import { subscriptionService } from "../services/subscriptionService.js";

export class SubscriptionController extends BaseController {
  async subscribe(req: Request, res: Response): Promise<void> {
    try {
      const sub = await subscriptionService.subscribe(
        req.user!.userId,
        req.body,
      );
      this.handleCreated(res, sub);
    } catch (error) {
      this.handleError(error, res, "SubscriptionController.subscribe");
    }
  }

  async unsubscribe(req: Request, res: Response): Promise<void> {
    try {
      await subscriptionService.unsubscribe(
        req.user!.userId,
        req.body.endpoint,
      );
      this.handleNoContent(res);
    } catch (error) {
      this.handleError(error, res, "SubscriptionController.unsubscribe");
    }
  }
}
