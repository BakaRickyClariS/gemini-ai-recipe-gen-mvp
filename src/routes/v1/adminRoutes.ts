/**
 * v1 Admin Routes
 * 使用 unifiedConfig 取代 process.env
 */

import { Router } from "express";
import { V1AdminController } from "../../controllers/V1AdminController.js";

const router = Router();
const controller = new V1AdminController();

router.post(
  "/announcements",
  (req, res, next) => controller.requireDeploySecret(req, res, next),
  (req, res, next) => controller.requireAdmin(req, res, next),
  (req, res) => controller.sendAnnouncement(req, res),
);

router.post(
  "/release",
  (req, res, next) => controller.requireDeploySecret(req, res, next),
  (req, res) => controller.sendRelease(req, res),
);

export default router;
