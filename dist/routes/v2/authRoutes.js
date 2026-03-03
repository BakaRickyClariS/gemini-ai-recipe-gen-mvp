/**
 * Auth Routes v2
 * 遵循 clean-code：routes 只做路由，委派 controller
 */
import { Router } from "express";
import { AuthController } from "../../controllers/AuthController.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { validate } from "../../middleware/validate.js";
import { registerSchema, loginSchema } from "../../validators/authSchemas.js";
import { generateCsrfToken } from "../../middleware/csrfProtection.js";
const router = Router();
const controller = new AuthController();
router.post("/line/init", authLimiter, (req, res) => controller.lineInit(req, res));
router.get("/line/callback", (req, res) => controller.lineCallback(req, res));
router.post("/logout", (req, res) => controller.logout(req, res));
router.get("/csrf-token", generateCsrfToken, (req, res) => controller.getCsrfToken(req, res));
router.post("/refresh", authLimiter, (req, res) => controller.refresh(req, res));
router.get("/me", jwtAuth, (req, res) => controller.me(req, res));
router.post("/register", validate(registerSchema), (req, res) => controller.register(req, res));
router.post("/login", validate(loginSchema), (req, res) => controller.login(req, res));
export default router;
