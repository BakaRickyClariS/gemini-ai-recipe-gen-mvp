/**
 * v2 AI Routes
 * 使用 JWT 認證 + 遵循 backend-dev-guidelines 模式
 * 底層服務沿用 v1 的 aiRecipeService，不影響 v1 API
 */

import { Router } from "express";
import { jwtAuth, optionalAuth } from "../../middleware/jwtAuth.js";
import { V2AiController } from "../../controllers/V2AiController.js";

const router = Router();
const controller = new V2AiController();

// GET /suggestions — 預設 Prompt 建議（無需認證）
router.get("/recipe/suggestions", (req, res) =>
  controller.getSuggestions(req, res),
);

// GET /recipe/quota — 查詢剩餘次數（需認證）
router.get("/recipe/quota", jwtAuth, (req, res) =>
  controller.getQuota(req, res),
);

// POST /recipe/stream — SSE 串流生成（Optional Auth）
router.post("/recipe/stream", optionalAuth, (req, res) =>
  controller.stream(req, res),
);

// POST /recipe — 標準生成（Optional Auth）
router.post("/recipe", optionalAuth, (req, res) =>
  controller.generate(req, res),
);

export default router;
