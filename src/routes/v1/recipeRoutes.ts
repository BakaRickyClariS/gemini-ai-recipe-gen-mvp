/**
 * v1 Recipe Routes
 * 使用 cookieAuth（fallback x-user-id）
 */

import { Router } from "express";
import { cookieAuth, optionalCookieAuth } from "../../middleware/cookieAuth.js";
import { V1RecipeController } from "../../controllers/V1RecipeController.js";

const router = Router();
const controller = new V1RecipeController();

// GET /:id 不需要強制認證
router.get("/:id", (req, res) => controller.getById(req, res));

// GET / 使用 optional auth（可接受 query.userId）
router.get("/", optionalCookieAuth, (req, res) => controller.list(req, res));

// 寫入操作需要認證
router.post("/", cookieAuth, (req, res) => controller.create(req, res));
router.put("/:id", cookieAuth, (req, res) => controller.update(req, res));
router.delete("/:id", cookieAuth, (req, res) => controller.remove(req, res));

export default router;
