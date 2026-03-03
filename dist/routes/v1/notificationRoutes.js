/**
 * v1 Notification Routes
 * 使用 cookieAuth middleware 取代 x-user-id header
 */
import { Router } from "express";
import { cookieAuth } from "../../middleware/cookieAuth.js";
import { V1NotificationController } from "../../controllers/V1NotificationController.js";
import { validate } from "../../middleware/validate.js";
import { registerTokenSchema, removeTokenSchema, updateNotificationSettingsSchema, batchOperationSchema, sendNotificationSchema, } from "../../validators/notificationSchemas.js";
const router = Router();
const controller = new V1NotificationController();
// 所有路由都需要認證
router.use(cookieAuth);
router.post("/batch-read", validate(batchOperationSchema), (req, res) => controller.batchRead(req, res));
router.post("/batch-delete", validate(batchOperationSchema), (req, res) => controller.batchDelete(req, res));
router.post("/token", validate(registerTokenSchema), (req, res) => controller.registerToken(req, res));
router.delete("/token", validate(removeTokenSchema), (req, res) => controller.removeToken(req, res));
router.get("/settings", (req, res) => controller.getSettings(req, res));
router.patch("/settings", validate(updateNotificationSettingsSchema), (req, res) => controller.updateSettings(req, res));
router.get("/", (req, res) => controller.getNotifications(req, res));
router.post("/send", validate(sendNotificationSchema), (req, res) => controller.sendNotification(req, res));
export default router;
