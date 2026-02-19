/**
 * Subscription Routes v2
 */
import { Router } from "express";
import { SubscriptionController } from "../../controllers/SubscriptionController.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";
import { validate } from "../../middleware/validate.js";
import { subscribeSchema } from "../../validators/subscriptionSchemas.js";
const router = Router();
const controller = new SubscriptionController();
router.post("/", jwtAuth, validate(subscribeSchema), (req, res) => controller.subscribe(req, res));
router.delete("/", jwtAuth, (req, res) => controller.unsubscribe(req, res));
export default router;
