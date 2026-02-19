/**
 * v1 Inventory Routes
 * 使用 cookieAuth middleware 取代 x-user-id header
 */
import { Router } from "express";
import { cookieAuth } from "../../middleware/cookieAuth.js";
import { V1InventoryController } from "../../controllers/V1InventoryController.js";
const router = Router({ mergeParams: true });
const controller = new V1InventoryController();
// 所有路由都需要認證（cookieAuth 會 fallback 到 x-user-id header）
router.use(cookieAuth);
router.get("/", (req, res) => controller.list(req, res));
router.get("/categories", (req, res) => controller.getCategories(req, res));
router.get("/summary", (req, res) => controller.getSummary(req, res));
router.get("/settings", (req, res) => controller.getSettings(req, res));
router.put("/settings", (req, res) => controller.updateSettings(req, res));
router.patch("/settings", (req, res) => controller.updateSettings(req, res));
router.get("/:id", (req, res) => controller.getById(req, res));
router.post("/", (req, res) => controller.create(req, res));
router.put("/:id", (req, res) => controller.update(req, res));
router.delete("/:id", (req, res) => controller.remove(req, res));
router.post("/:id/consume", (req, res) => controller.consume(req, res));
export default router;
