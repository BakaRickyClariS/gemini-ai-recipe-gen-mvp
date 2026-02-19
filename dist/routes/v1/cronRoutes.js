/**
 * v1 Cron Routes
 * 使用 unifiedConfig 取代 process.env
 */
import { Router } from "express";
import { V1CronController } from "../../controllers/V1CronController.js";
const router = Router();
const controller = new V1CronController();
router.post("/check-expiry", (req, res, next) => controller.validateCronSecret(req, res, next), (req, res) => controller.checkExpiry(req, res));
export default router;
