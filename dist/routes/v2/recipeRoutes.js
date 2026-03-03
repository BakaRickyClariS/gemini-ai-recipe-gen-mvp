/**
 * v2 Recipe Routes
 * 使用 JWT 認證
 */
import { Router } from "express";
import { jwtAuth, optionalAuth } from "../../middleware/jwtAuth.js";
import { V2RecipeController } from "../../controllers/V2RecipeController.js";
const router = Router();
const controller = new V2RecipeController();
// GET /:id 不需要強制認證
router.get("/:id", (req, res) => controller.getById(req, res));
// GET / 使用 optional auth（可接受 query.userId）
router.get("/", optionalAuth, (req, res) => controller.list(req, res));
// 寫入操作需要認證
router.post("/", jwtAuth, (req, res) => controller.create(req, res));
router.put("/:id", jwtAuth, (req, res) => controller.update(req, res));
router.delete("/:id", jwtAuth, (req, res) => controller.remove(req, res));
export default router;
