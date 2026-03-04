/**
 * V2AiController
 * AI 食譜生成 v2（JWT 認證 + BaseController 模式）
 * 底層服務沿用 aiRecipeService.ts，不影響 v1 API
 */
import * as Sentry from "@sentry/node";
import { BaseController } from "./BaseController.js";
import { generateMultipleRecipes, streamRecipe, AI_SUGGESTION_PROMPTS, } from "../services/aiRecipeService.js";
import { ApiError } from "../errors/ApiError.js";
import { notificationService } from "../services/notificationService.js";
import { z } from "zod";
// ===== Zod 驗證 Schema =====
const aiRecipeRequestSchema = z.object({
    prompt: z
        .string()
        .trim()
        .min(3, "prompt 至少 3 個字")
        .max(500, "prompt 不得超過 500 個字"),
    servings: z.number().int().min(1).max(20).optional(),
    difficulty: z.enum(["簡單", "中等", "困難"]).optional(),
    category: z.string().optional(),
    selectedIngredients: z.array(z.string()).optional(),
    excludeIngredients: z.array(z.string()).optional(),
    recipeCount: z.number().int().min(1).max(5).optional(),
    includeInventory: z.boolean().optional(),
    applyDietaryPreferences: z.boolean().optional(),
});
// ===== Controller =====
export class V2AiController extends BaseController {
    /**
     * POST /api/v2/ai/recipe
     * 標準（非串流）AI 食譜生成
     */
    async generate(req, res) {
        try {
            const body = aiRecipeRequestSchema.parse(req.body);
            const userId = req.user?.userId ?? "anonymous";
            const request = body;
            const response = await generateMultipleRecipes(request, userId);
            this.handleSuccess(res, response.data);
            // Fire-and-forget 推播通知（僅已登入使用者）
            if (userId !== "anonymous" && response?.data) {
                const recipes = Array.isArray(response.data.recipes)
                    ? response.data.recipes
                    : [];
                const firstName = recipes[0]?.name || "新食譜";
                const count = recipes.length;
                const title = count > 1
                    ? `阿福靈感大爆發！${count} 道新食譜出爐`
                    : `阿福靈感大爆發！新食譜出爐`;
                const body = count > 1
                    ? `冰箱小隊為您獻上 ${firstName} 等 ${count} 道料理靈感！`
                    : `冰箱小隊為您獻上今日料理靈感：${firstName}`;
                notificationService
                    .send(userId, title, body, "recipe", { type: "recipe", payload: { recipeId: recipes[0]?.id } }, "inspiration", "generate")
                    .catch((e) => console.error("[V2AI Notification] error:", e));
            }
        }
        catch (error) {
            this.handleError(error, res, "V2AiController.generate");
        }
    }
    /**
     * POST /api/v2/ai/recipe/stream
     * SSE 串流生成
     * 注意：SSE 不適合用 handleSuccess / handleError，需要手動操作 res
     */
    async stream(req, res) {
        try {
            // 先驗證 body，失敗直接回傳 JSON 錯誤
            const body = aiRecipeRequestSchema.parse(req.body);
            const userId = req.user?.userId ?? "anonymous";
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("X-Accel-Buffering", "no");
            const request = body;
            for await (const event of streamRecipe(request, userId)) {
                res.write(`event: ${event.event}\n`);
                res.write(`data: ${JSON.stringify(event)}\n\n`);
            }
        }
        catch (error) {
            // 若 headers 尚未送出（Zod 驗證失敗），走一般 JSON 錯誤
            if (!res.headersSent) {
                this.handleError(error, res, "V2AiController.stream");
                return;
            }
            // headers 已送出（SSE 過程中崩潰）
            Sentry.captureException(error);
            const message = error instanceof Error ? error.message : "AI 服務暫時無法使用";
            const errorEvent = {
                id: `evt-${Date.now()}`,
                timestamp: new Date().toISOString(),
                event: "error",
                data: { code: "AI_005", message },
            };
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
        }
        finally {
            res.end();
        }
    }
    /**
     * GET /api/v2/ai/recipe/suggestions
     * 回傳預設 Prompt 建議（無需認證）
     */
    getSuggestions(_req, res) {
        this.handleSuccess(res, { suggestions: AI_SUGGESTION_PROMPTS });
    }
    /**
     * GET /api/v2/ai/recipe/quota
     * 回傳當前使用者剩餘查詢次數（需認證）
     */
    getQuota(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId)
                throw ApiError.unauthorized("請先登入");
            // 直接回傳 userId（前端可呼叫後比對 daily limit）
            // 真實剩餘次數由 generateMultipleRecipes 回傳，這裡僅做確認用
            this.handleSuccess(res, {
                userId,
                message: "請呼叫 POST /api/v2/ai/recipe 以取得剩餘次數",
            });
        }
        catch (error) {
            this.handleError(error, res, "V2AiController.getQuota");
        }
    }
}
