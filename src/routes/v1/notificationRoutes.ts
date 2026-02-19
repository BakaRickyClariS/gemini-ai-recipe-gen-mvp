/**
 * v1 Notification Routes
 * 使用 cookieAuth middleware 取代 x-user-id header
 */

import { Router } from "express";
import { cookieAuth } from "../../middleware/cookieAuth.js";
import { V1NotificationController } from "../../controllers/V1NotificationController.js";

const router = Router();
const controller = new V1NotificationController();

// 所有路由都需要認證
router.use(cookieAuth);

router.post("/batch-read", (req, res) => controller.batchRead(req, res));
router.post("/batch-delete", (req, res) => controller.batchDelete(req, res));
router.post("/token", (req, res) => controller.registerToken(req, res));
router.delete("/token", (req, res) => controller.removeToken(req, res));
router.get("/settings", (req, res) => controller.getSettings(req, res));
router.patch("/settings", (req, res) => controller.updateSettings(req, res));
router.get("/", (req, res) => controller.getNotifications(req, res));
router.post("/send", (req, res) => controller.sendNotification(req, res));

export default router;
