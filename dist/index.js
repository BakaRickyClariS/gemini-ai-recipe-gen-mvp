import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { analyzeImageByUrl, analyzeLocalImage, } from "./services/recipeService.js";
import { aiRecipeErrorHandler, } from "./middleware/errorHandler.js";
import { uploadToCloudinary } from "./services/mediaService.js";
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
    ],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Load OpenAPI spec
const openapiPath = path.join(process.cwd(), "openapi.json");
const openapi = JSON.parse(fs.readFileSync(openapiPath, "utf-8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
// Root route - API info
app.get("/", (_req, res) => {
    res.json({
        name: "Recipe API",
        version: "2.0.0",
        description: "AI 食譜生成 API - 支援 Gemini AI 多食譜推薦與 SSE Streaming",
        endpoints: {
            health: "/health",
            status: "/status",
            documentation: "/docs",
            openapi: "/openapi.json",
            generateRecipe: "POST /api/v1/ai/recipe",
            streamRecipe: "POST /api/v1/ai/recipe/stream",
            recipeSuggestions: "GET /api/v1/ai/recipe/suggestions",
            analyzeImage: "POST /api/v1/ai/analyze-image",
        },
        features: {
            multipleRecipes: "支援一次產生多道食譜推薦",
            sseStreaming: "支援 Server-Sent Events 即時串流",
            dailyLimit: "每日查詢次數限制",
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
// ... (省略中間部分以保持 replace 範圍準確) 
// 1. 媒體上傳 API
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
        console.error('Upload error:', error);
        return res.status(500).json({
            success: false,
            code: "MEDIA_005",
            message: "上傳失敗",
            details: error.message
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
                    imageUrl: finalImageUrl || null // 加入實體 URL
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
                    imageUrl: finalImageUrl
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
