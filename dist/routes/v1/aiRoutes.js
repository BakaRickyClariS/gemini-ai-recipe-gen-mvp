/**
 * v1 AI Routes
 * 從 index.ts 提取的 AI 食譜/影像/媒體路由
 */
import { Router } from "express";
import multer from "multer";
import fs from "fs";
import * as Sentry from "@sentry/node";
import { analyzeImageByUrl, analyzeLocalImage, } from "../../services/imageAnalysisService.js";
import { generateMultipleRecipes, streamRecipe, AI_SUGGESTION_PROMPTS, } from "../../services/aiRecipeService.js";
import { validateAIRecipeRequest } from "../../middleware/errorHandler.js";
import { uploadToCloudinary } from "../../services/mediaService.js";
import { analyzeMultipleIngredients } from "../../services/multipleIngredientsService.js";
import { optionalCookieAuth, } from "../../middleware/cookieAuth.js";
const router = Router();
// 智能判斷上傳目錄
const uploadDir = (() => {
    try {
        if (fs.existsSync("/tmp"))
            return "/tmp/uploads";
        return "uploads/";
    }
    catch {
        return "uploads/";
    }
})();
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const upload = multer({ dest: uploadDir });
// ===== AI 食譜生成 =====
/** POST /recipe — 標準回應 */
router.post("/recipe", validateAIRecipeRequest, optionalCookieAuth, async (req, res, next) => {
    try {
        const request = req.body;
        const userId = req.userId || "anonymous";
        const response = await generateMultipleRecipes(request, userId);
        res.json(response);
    }
    catch (err) {
        next(err);
    }
});
/** POST /recipe/stream — SSE Streaming */
router.post("/recipe/stream", validateAIRecipeRequest, optionalCookieAuth, async (req, res) => {
    const request = req.body;
    const userId = req.userId || "anonymous";
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    try {
        for await (const event of streamRecipe(request, userId)) {
            res.write(`event: ${event.event}\n`);
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
    }
    catch (err) {
        Sentry.captureException(err);
        const message = err instanceof Error ? err.message : "AI 服務暫時無法使用";
        const code = err?.code || "AI_005";
        const errorEvent = {
            id: `evt-${Date.now()}`,
            timestamp: new Date().toISOString(),
            event: "error",
            data: { code, message },
        };
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    }
    finally {
        res.end();
    }
});
/** GET /recipe/suggestions — 預設 Prompt 建議 */
router.get("/recipe/suggestions", (_req, res) => {
    res.json({
        status: true,
        message: "ok",
        data: { suggestions: AI_SUGGESTION_PROMPTS },
    });
});
// ===== 媒體上傳 =====
/** POST /media/upload — 上傳到 Cloudinary */
router.post("/media/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        res.status(400).json({
            success: false,
            code: "MEDIA_001",
            message: "未提供檔案",
        });
        return;
    }
    try {
        const result = await uploadToCloudinary(req.file.path);
        try {
            fs.unlinkSync(req.file.path);
        }
        catch {
            console.warn(`[WARN] 無法刪除暫存檔: ${req.file.path}`);
        }
        res.json({
            success: true,
            data: { url: result.secure_url, publicId: result.public_id },
        });
    }
    catch (error) {
        Sentry.captureException(error);
        const message = error instanceof Error ? error.message : "上傳失敗";
        console.error("Upload error:", error);
        res.status(500).json({
            success: false,
            code: "MEDIA_005",
            message: "上傳失敗",
            details: message,
        });
    }
});
// ===== 影像辨識 =====
/** POST /analyze-image — 單品辨識 */
router.post("/analyze-image", upload.single("file"), async (req, res) => {
    try {
        const imageUrl = req.body?.imageUrl;
        let finalImageUrl = imageUrl;
        // 有上傳檔案
        if (req.file && !imageUrl) {
            const filePath = req.file.path;
            try {
                const uploadResult = await uploadToCloudinary(filePath);
                finalImageUrl = uploadResult.secure_url;
            }
            catch (uploadErr) {
                console.error("[Upload Error during analyze]", uploadErr);
            }
            const data = await analyzeLocalImage(filePath);
            try {
                fs.unlinkSync(filePath);
            }
            catch {
                console.warn(`[WARN] 無法刪除暫存檔: ${filePath}`);
            }
            res.json({
                success: true,
                data: { ...data, imageUrl: finalImageUrl || null },
                timestamp: new Date().toISOString(),
            });
            return;
        }
        // 有 imageUrl
        if (imageUrl) {
            const data = await analyzeImageByUrl(imageUrl);
            res.json({
                success: true,
                data: { ...data, imageUrl: finalImageUrl },
                timestamp: new Date().toISOString(),
            });
            return;
        }
        res.status(400).json({
            success: false,
            error: '請提供 imageUrl 或使用 form-data 上傳檔案（欄位名稱為 "file"）',
        });
    }
    catch (err) {
        Sentry.captureException(err);
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("[Analyze Image Error]", err);
        res.status(500).json({ success: false, error: message });
    }
});
/** POST /analyze-image/multiple — 多品項辨識 */
router.post("/analyze-image/multiple", upload.single("file"), async (req, res) => {
    try {
        const imageUrl = req.body?.imageUrl;
        const cropImages = req.body?.cropImages !== "false";
        const maxIngredients = parseInt(req.body?.maxIngredients) || 10;
        let imageSource;
        if (req.file) {
            imageSource = req.file.path;
        }
        else if (imageUrl) {
            imageSource = imageUrl;
        }
        else {
            res.status(400).json({
                success: false,
                error: '請提供 imageUrl 或使用 form-data 上傳檔案（欄位名稱為 "file"）',
            });
            return;
        }
        const result = await analyzeMultipleIngredients(imageSource, {
            cropImages,
            maxIngredients,
        });
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            }
            catch {
                /* ignore */
            }
        }
        res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        Sentry.captureException(err);
        const message = err instanceof Error ? err.message : "Internal server error";
        console.error("[Analyze Multiple Error]", err);
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            }
            catch {
                /* ignore */
            }
        }
        res.status(500).json({ success: false, error: message });
    }
});
export default router;
