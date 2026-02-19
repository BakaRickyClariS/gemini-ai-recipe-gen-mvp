/**
 * Auth Routes v2
 * 遵循 clean-code：routes 只做路由，委派 controller
 */

import { Router } from "express";
import { AuthController } from "../../controllers/AuthController.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";
import { authLimiter } from "../../middleware/rateLimiter.js";

const router = Router();
const controller = new AuthController();

router.post("/line/init", authLimiter, (req, res) =>
  controller.lineInit(req, res),
);
router.get("/line/callback", (req, res) => controller.lineCallback(req, res));
router.post("/logout", (req, res) => controller.logout(req, res));
router.post("/refresh", authLimiter, (req, res) =>
  controller.refresh(req, res),
);
router.get("/me", jwtAuth, (req, res) => controller.me(req, res));

export default router;
