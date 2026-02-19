/**
 * v1 Auth Routes
 * POST /api/v1/auth/sync - 同步 Session
 * POST /api/v1/auth/logout - 登出
 */

import { Router } from "express";
import { V1AuthController } from "../../controllers/V1AuthController.js";

const router = Router();
const controller = new V1AuthController();

router.post("/sync", (req, res) => controller.syncSession(req, res));
router.post("/logout", (req, res) => controller.logout(req, res));

export default router;
