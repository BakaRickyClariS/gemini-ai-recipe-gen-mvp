/**
 * v1 User Routes
 * PATCH /api/v1/users/me/tour - 更新使用者導覽狀態
 */
import { Router } from "express";
import { cookieAuth } from "../../middleware/cookieAuth.js";
import { V1UserController } from "../../controllers/V1UserController.js";
const router = Router();
const controller = new V1UserController();
router.patch("/me/tour", cookieAuth, (req, res) => controller.updateTour(req, res));
export default router;
