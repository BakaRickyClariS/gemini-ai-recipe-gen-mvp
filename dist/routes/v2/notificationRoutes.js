import { Router } from "express";
import { NotificationController } from "../../controllers/NotificationController.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";
import { validate } from "../../middleware/validate.js";
import { registerTokenSchema, removeTokenSchema, updateNotificationSettingsSchema, batchOperationSchema, sendNotificationSchema, } from "../../validators/notificationSchemas.js";
const router = Router();
const controller = new NotificationController();
// 所有 v2 notification 路由皆需 JWT 認證
router.use(jwtAuth);
router.get("/", (req, res) => controller.getNotifications(req, res));
// Token management
router.post("/token", validate(registerTokenSchema), (req, res) => controller.registerToken(req, res));
router.delete("/token", validate(removeTokenSchema), (req, res) => controller.removeToken(req, res));
// Settings
router.get("/settings", (req, res) => controller.getSettings(req, res));
router.patch("/settings", validate(updateNotificationSettingsSchema), (req, res) => controller.updateSettings(req, res));
// Batch operations
router.post("/batch-read", validate(batchOperationSchema), (req, res) => controller.batchRead(req, res));
router.post("/batch-delete", validate(batchOperationSchema), (req, res) => controller.batchDelete(req, res));
// Internal send (could be restricted to admin if needed)
router.post("/send", validate(sendNotificationSchema), (req, res) => controller.send(req, res));
export default router;
