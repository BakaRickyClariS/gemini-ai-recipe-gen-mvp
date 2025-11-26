import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { generateRecipeFromText, analyzeImageByUrl, analyzeLocalImage, } from "./services/recipeService.js";
const app = express();
const PORT = Number(process.env.PORT || 3000);
const upload = multer({ dest: "uploads/" });
app.use(cors({
    origin: [
        "https://fufood.vercel.app",
        "https://gemini-ai-recipe-gen-mvp.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ],
    credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
// Load OpenAPI spec
const openapiPath = path.join(process.cwd(), "openapi.json");
const openapi = JSON.parse(fs.readFileSync(openapiPath, "utf-8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));
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
// Generate recipe
app.post("/api/v1/recipe/generate", async (req, res) => {
    try {
        const { input } = req.body || {};
        if (!input || typeof input !== "string") {
            return res.status(400).json({ success: false, error: "Missing input" });
        }
        const data = await generateRecipeFromText(input);
        res.json({ success: true, data, timestamp: new Date().toISOString() });
    }
    catch (err) {
        res
            .status(500)
            .json({ success: false, error: err?.message || "Internal error" });
    }
});
// Analyze image - either file upload OR imageUrl
// 圖片分析：可接受本地上傳或 imageUrl
app.post("/api/v1/recipe/analyze-image", upload.single("file"), async (req, res) => {
    try {
        const imageUrl = req.body?.imageUrl;
        // ✅ 1️⃣ 有上傳檔案（本地模式）
        if (req.file && !imageUrl) {
            const filePath = req.file.path;
            // 呼叫本地分析函式（Base64 傳給 Gemini Vision）
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
                data,
                timestamp: new Date().toISOString(),
            });
        }
        // ✅ 2️⃣ 若有提供 imageUrl
        if (imageUrl) {
            const data = await analyzeImageByUrl(imageUrl);
            return res.json({
                success: true,
                data,
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
// 本地開發時啟動伺服器
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`🚀 Server running on http://localhost:${PORT}`);
        console.log(`📚 Swagger UI at http://localhost:${PORT}/docs`);
    });
}
// 導出 app 供 Vercel serverless function 使用
export default app;
