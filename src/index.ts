import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import {
  generateRecipeFromText,
  analyzeImageByUrl,
  analyzeLocalImage,
} from "./services/recipeService.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);

// 智能判斷上傳目錄：
// - 優先使用 /tmp（serverless 環境標準：Vercel、AWS Lambda、Google Cloud Functions）
// - 回退到相對路徑（本地開發或 Docker）
const uploadDir = (() => {
  try {
    // 檢查 /tmp 目錄是否存在（適用於所有 serverless 環境）
    if (fs.existsSync('/tmp')) {
      return '/tmp/uploads';
    }
    // /tmp 不存在，使用相對路徑（本地開發或特殊環境）
    return 'uploads/';
  } catch {
    // 出錯時回退到相對路徑
    return 'uploads/';
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

app.use(
  cors({
    origin: [
      "https://fufood.vercel.app",
      "https://gemini-ai-recipe-gen-mvp.vercel.app",
      "http://localhost:5173",
      "http://localhost:3000",
    ],
    credentials: true,
  })
);

// Explicit OPTIONS handler for preflight requests
app.options("*", (req, res) => {
  res.header("Access-Control-Allow-Origin", "https://fufood.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.header(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(200);
});
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
  } catch (err: any) {
    res
      .status(500)
      .json({ success: false, error: err?.message || "Internal error" });
  }
});

// Analyze image - either file upload OR imageUrl
// 圖片分析：可接受本地上傳或 imageUrl
app.post(
  "/api/v1/recipe/analyze-image",
  upload.single("file"),
  async (req, res) => {
    try {
      const imageUrl: string | undefined = req.body?.imageUrl;

      // ✅ 1️⃣ 有上傳檔案（本地模式）
      if (req.file && !imageUrl) {
        const filePath = req.file.path;

        // 呼叫本地分析函式（Base64 傳給 Gemini Vision）
        const data = await analyzeLocalImage(filePath);

        // 分析後刪除暫存檔案
        try {
          fs.unlinkSync(filePath);
        } catch {
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
    } catch (err: any) {
      console.error("[Analyze Image Error]", err);
      return res.status(500).json({
        success: false,
        error: err?.message || "Internal server error",
      });
    }
  }
);

// 本地開發時啟動伺服器
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger UI at http://localhost:${PORT}/docs`);
  });
}

// 導出 app 供 Vercel serverless function 使用
export default app;
