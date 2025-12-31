import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { analyzeImageByUrl, analyzeLocalImage, } from "./services/imageAnalysisService.js";
import { generateMultipleRecipes, streamRecipe, AI_SUGGESTION_PROMPTS, } from "./services/aiRecipeService.js";
import { aiRecipeErrorHandler, validateAIRecipeRequest, } from "./middleware/errorHandler.js";
import { uploadToCloudinary } from "./services/mediaService.js";
import { analyzeMultipleIngredients } from "./services/multipleIngredientsService.js";
import recipeRoutes from "./routes/recipeRoutes.js";
import inventoryRoutes from "./routes/inventoryRoutes.js";
import { testConnection } from "./db/index.js";
const app = express();
const PORT = Number(process.env.PORT || 3000);
// 智能判斷上傳目錄：
// - 優先使用 /tmp（serverless 環境標準：Vercel、AWS Lambda、Google Cloud Functions）
// - 回退到相對路徑（本地開發或 Docker）
const uploadDir = (() => {
    try {
        // 檢查 /tmp 目錄是否存在（適用於所有 serverless 環境）
        if (fs.existsSync("/tmp")) {
            return "/tmp/uploads";
        }
        // /tmp 不存在，使用相對路徑（本地開發或特殊環境）
        return "uploads/";
    }
    catch {
        // 出錯時回退到相對路徑
        return "uploads/";
    }
})();
// 確保上傳目錄存在
// - Serverless 環境每次冷啟動時 /tmp 是空的
// - 本地/Docker 環境首次運行時目錄可能不存在
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log(`📁 [INFO] 建立上傳目錄: ${uploadDir}`);
}
const upload = multer({ dest: uploadDir });
app.use(cors({
    origin: [
        "https://fufood.jocelynh.me",
        "https://fufood.vercel.app",
        "https://gemini-ai-recipe-gen-mvp.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "Accept",
        "Origin",
        "X-User-Id", // 前端傳遞使用者 ID 用於庫存 API
    ],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Load OpenAPI spec
const openapiPath = path.join(process.cwd(), "openapi.json");
const openapi = JSON.parse(fs.readFileSync(openapiPath, "utf-8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
// Swagger UI（CDN 版本）- 適用於 Vercel Serverless 環境
// 使用 CDN 載入靜態資源，避免 Vercel 上 CSS/JS 無法載入的問題
const swaggerCdnOptions = {
    customCssUrl: "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
    customJs: [
        "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
        "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js",
    ],
};
app.use("/docs-cdn", swaggerUi.serve, swaggerUi.setup(openapi, swaggerCdnOptions));
// ===== 食譜儲存 API =====
app.use("/api/v1/recipes", recipeRoutes);
import notificationRoutes from "./routes/notificationRoutes.js";
// ... (existing code)
// ===== 庫存管理 API =====
app.use("/api/v1/refrigerators/:refrigeratorId/inventory", inventoryRoutes);
// ===== 推播通知 API =====
app.use("/api/v1/notifications", notificationRoutes);
// 測試資料庫連線（背景執行）
testConnection().catch(console.error);
// Root route - API info
app.get("/", (_req, res) => {
    res.json({
        name: "Recipe API",
        version: "2.3.0", // Minor version bump
        description: "AI 食譜生成 API - 支援 Gemini AI 多食譜推薦與 SSE Streaming",
        endpoints: {
            health: "/health",
            status: "/status",
            documentation: "/docs (本地開發) 或 /docs-cdn (Vercel 部署)",
            openapi: "/openapi.json",
            generateRecipe: "POST /api/v1/ai/recipe",
            streamRecipe: "POST /api/v1/ai/recipe/stream",
            recipeSuggestions: "GET /api/v1/ai/recipe/suggestions",
            analyzeImage: "POST /api/v1/ai/analyze-image",
            savedRecipes: "GET/POST /api/v1/recipes (食譜儲存)",
            inventory: "GET/POST /api/v1/refrigerators/:refrigeratorId/inventory (庫存管理)",
            inventorySettings: "GET/PUT /api/v1/refrigerators/:refrigeratorId/inventory/settings (庫存設定)",
            notifications: "POST /api/v1/notifications/token (推播註冊)",
        },
        features: {
            multipleRecipes: "支援一次產生多道食譜推薦",
            sseStreaming: "支援 Server-Sent Events 即時串流",
            dailyLimit: "每日查詢次數限制",
            recipeStorage: "支援儲存 AI 生成的食譜",
            inventoryManagement: "支援庫存食材管理 (CRUD、消耗、統計)",
            pushNotifications: "支援 FCM 推播與通知中心",
        },
    });
});
// Provide OpenAPI spec as JSON
app.get("/openapi.json", (_req, res) => {
    res.json(openapi);
});
app.get("/health", (_req, res) => {
    res.json({
        status: "✅ 食譜 API 運行正常",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
    });
});
app.get("/status", (_req, res) => {
    res.json({
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
    });
});
// ===== AI 食譜生成 API（新版）=====
// 1. AI 食譜生成（標準回應）
app.post("/api/v1/ai/recipe", validateAIRecipeRequest, async (req, res, next) => {
    try {
        const request = req.body;
        const userId = req.headers["x-user-id"] || "anonymous";
        const response = await generateMultipleRecipes(request, userId);
        return res.json(response);
    }
    catch (err) {
        next(err);
    }
});
// 2. AI 食譜生成（SSE Streaming）
app.post("/api/v1/ai/recipe/stream", validateAIRecipeRequest, async (req, res) => {
    const request = req.body;
    const userId = req.headers["x-user-id"] || "anonymous";
    // 設定 SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // 禁用 Nginx 緩衝
    try {
        for await (const event of streamRecipe(request, userId)) {
            res.write(`event: ${event.event}\n`);
            res.write(`data: ${JSON.stringify(event)}\n\n`);
        }
    }
    catch (err) {
        const errorEvent = {
            id: `evt-${Date.now()}`,
            timestamp: new Date().toISOString(),
            event: "error",
            data: {
                code: err.code || "AI_005",
                message: err.message || "AI 服務暫時無法使用",
            },
        };
        res.write(`event: error\n`);
        res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
    }
    finally {
        res.end();
    }
});
// 3. 取得預設 Prompt 建議
app.get("/api/v1/ai/recipe/suggestions", (_req, res) => {
    res.json({
        status: true,
        message: "ok",
        data: {
            suggestions: AI_SUGGESTION_PROMPTS,
        },
    });
});
// ===== 媒體與影像辨識 API =====
// 4. 媒體上傳 API
app.post("/api/v1/media/upload", upload.single("file"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            code: "MEDIA_001",
            message: "未提供檔案",
        });
    }
    try {
        const result = await uploadToCloudinary(req.file.path);
        // 上傳後刪除本地暫存
        try {
            fs.unlinkSync(req.file.path);
        }
        catch (err) {
            console.warn(`[WARN] 無法刪除暫存檔: ${req.file.path}`);
        }
        return res.json({
            success: true,
            data: {
                url: result.secure_url,
                publicId: result.public_id,
            },
        });
    }
    catch (error) {
        console.error("Upload error:", error);
        return res.status(500).json({
            success: false,
            code: "MEDIA_005",
            message: "上傳失敗",
            details: error.message,
        });
    }
});
// 2. 影像辨識 API (更新版：確保回傳包含 imageUrl)
app.post("/api/v1/ai/analyze-image", upload.single("file"), async (req, res) => {
    try {
        let imageUrl = req.body?.imageUrl;
        let finalImageUrl = imageUrl;
        // ✅ 1️⃣ 有上傳檔案（本地模式）
        if (req.file && !imageUrl) {
            const filePath = req.file.path;
            // 先上傳到 Cloudinary (根據最新開發習慣，分析前應有 URL，或分析完回傳該 URL)
            // 為了符合 spec 要求的回應結構，如果 user 直接上傳 file，我們也幫他傳到 Cloudinary
            try {
                const uploadResult = await uploadToCloudinary(filePath);
                finalImageUrl = uploadResult.secure_url;
            }
            catch (uploadErr) {
                console.error("[Upload Error during analyze]", uploadErr);
                // 如果上傳失敗，仍繼續嘗試分析本地檔，但 imageUrl 可能為 null 或暫存
            }
            // 呼叫本地分析函式
            const data = await analyzeLocalImage(filePath);
            // 分析後刪除暫存檔案
            try {
                fs.unlinkSync(filePath);
            }
            catch {
                console.warn(`[WARN] 無法刪除暫存檔: ${filePath}`);
            }
            // 成功回應
            return res.json({
                success: true,
                data: {
                    ...data,
                    imageUrl: finalImageUrl || null, // 加入實體 URL
                },
                timestamp: new Date().toISOString(),
            });
        }
        // ✅ 2️⃣ 若有提供 imageUrl
        if (imageUrl) {
            const data = await analyzeImageByUrl(imageUrl);
            return res.json({
                success: true,
                data: {
                    ...data,
                    imageUrl: finalImageUrl,
                },
                timestamp: new Date().toISOString(),
            });
        }
        // ❌ 3️⃣ 若兩者都沒提供
        return res.status(400).json({
            success: false,
            error: '請提供 imageUrl 或使用 form-data 上傳檔案（欄位名稱為 "file"）',
        });
    }
    catch (err) {
        console.error("[Analyze Image Error]", err);
        return res.status(500).json({
            success: false,
            error: err?.message || "Internal server error",
        });
    }
});
// 3. 多食材影像分析 API (NEW)
app.post("/api/v1/ai/analyze-image/multiple", upload.single("file"), async (req, res) => {
    try {
        let imageUrl = req.body?.imageUrl;
        const cropImages = req.body?.cropImages !== "false"; // 預設 true
        const maxIngredients = parseInt(req.body?.maxIngredients) || 10;
        let imageSource;
        // 1️⃣ 有上傳檔案（本地模式）
        if (req.file) {
            // 使用檔案路徑，讓 service 決定如何讀取
            imageSource = req.file.path;
        }
        // 2️⃣ 若有提供 imageUrl
        else if (imageUrl) {
            imageSource = imageUrl;
        }
        else {
            return res.status(400).json({
                success: false,
                error: '請提供 imageUrl 或使用 form-data 上傳檔案（欄位名稱為 "file"）',
            });
        }
        console.log(`[Analyze Multiple] Start analyzing: ${req.file ? 'File' : 'URL'}`);
        const result = await analyzeMultipleIngredients(imageSource, {
            cropImages,
            maxIngredients
        });
        // 如果是本地檔案，處理完後刪除暫存檔
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            }
            catch (e) { /* ignore */ }
        }
        return res.json({
            success: true,
            data: result,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error("[Analyze Multiple Error]", err);
        // 如果是本地檔案，出錯也要刪除
        if (req.file) {
            try {
                fs.unlinkSync(req.file.path);
            }
            catch (e) { /* ignore */ }
        }
        return res.status(500).json({
            success: false,
            error: err?.message || "Internal server error",
        });
    }
});
// 錯誤處理中介層
app.use(aiRecipeErrorHandler);
// 本地開發時啟動伺服器
if (process.env.NODE_ENV !== "production" ||
    process.env.npm_lifecycle_event === "dev") {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📚 Swagger UI at http://localhost:${PORT}/docs`);
    });
}
// 導出 app 供 Vercel serverless function 使用
export default app;
