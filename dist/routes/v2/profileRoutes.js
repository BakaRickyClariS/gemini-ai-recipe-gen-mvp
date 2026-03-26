/**
 * Profile Routes v2
 */
import { Router } from "express";
import { ProfileController } from "../../controllers/ProfileController.js";
import { jwtAuth } from "../../middleware/jwtAuth.js";
const router = Router();
const controller = new ProfileController();
router.get("/", jwtAuth, (req, res) => controller.get(req, res));
router.put("/", jwtAuth, (req, res) => controller.update(req, res));
router.patch("/tour", jwtAuth, (req, res) => controller.updateTour(req, res));
export default router;
