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
import {
  generateMultipleRecipes,
  streamRecipe,
  AI_SUGGESTION_PROMPTS,
} from "./services/aiRecipeService.js";
import {
  aiRecipeErrorHandler,
  validateAIRecipeRequest,
  AIRecipeError,
} from "./middleware/errorHandler.js";
import type { AIRecipeRequest } from "./types/aiRecipe.js";

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
  } catch {
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

app.use(
  cors({
    origin: [
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
  })
);
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
      inventorySelection: "GET /api/v1/inventory/ai-selection",
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

// 取得預設 prompt 建議
app.get("/api/v1/ai/recipe/suggestions", (_req, res) => {
  res.json({
    status: true,
    message: "ok",
    data: AI_SUGGESTION_PROMPTS,
  });
});

// 多食譜生成（標準回應）
app.post("/api/v1/ai/recipe", async (req, res, next) => {
  try {
    const body = req.body as AIRecipeRequest;

    // 驗證請求
    validateAIRecipeRequest(body.prompt);

    // 取得使用者 ID（如有認證系統，可從 token 取得）
    const userId = (req.headers["x-user-id"] as string) || "anonymous";

    const response = await generateMultipleRecipes(body, userId);
    res.json(response);
  } catch (err) {
    next(err);
  }
});

// SSE Streaming 食譜生成
app.post("/api/v1/ai/recipe/stream", async (req, res) => {
  try {
    const body = req.body as AIRecipeRequest;

    // 驗證請求
    validateAIRecipeRequest(body.prompt);

    const userId = (req.headers["x-user-id"] as string) || "anonymous";

    // 設置 SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // Nginx buffering 關閉

    // 串流回應
    for await (const event of streamRecipe(body, userId)) {
      res.write(
        `event: ${event.event}\ndata: ${JSON.stringify(event.data)}\n\n`
      );
    }

    res.end();
  } catch (err: any) {
    // SSE 錯誤回應
    if (err instanceof AIRecipeError) {
      res.write(`event: error\ndata: ${JSON.stringify(err.toResponse())}\n\n`);
    } else {
      res.write(
        `event: error\ndata: ${JSON.stringify({
          code: "AI_005",
          message: err.message,
        })}\n\n`
      );
    }
    res.end();
  }
});

// 庫存食材選擇 API（Proxy 模式佔位，需設定主應用後端 URL）
app.get("/api/v1/inventory/ai-selection", async (req, res) => {
  const backendUrl = process.env.MAIN_BACKEND_URL;

  if (!backendUrl) {
    // 未設定後端 URL 時回傳 mock 資料
    return res.json({
      status: true,
      message: "mock data - 請設定 MAIN_BACKEND_URL 環境變數以啟用 Proxy 模式",
      data: {
        categories: [
          {
            name: "蔬果類",
            items: [
              {
                id: "1",
                name: "番茄",
                category: "蔬果類",
                quantity: 5,
                unit: "顆",
                tag: "available",
              },
              {
                id: "2",
                name: "洋蔥",
                category: "蔬果類",
                quantity: 2,
                unit: "顆",
                tag: "priority",
                priorityReason: "3天後過期",
              },
            ],
          },
          {
            name: "肉蛋類",
            items: [
              {
                id: "3",
                name: "雞蛋",
                category: "肉蛋類",
                quantity: 10,
                unit: "顆",
                tag: "available",
              },
            ],
          },
        ],
        maxSelection: 5,
      },
    });
  }

  try {
    // Proxy 到主應用後端
    const authHeader = req.headers.authorization;
    const response = await fetch(
      `${backendUrl}/api/v1/inventory/ai-selection`,
      {
        headers: authHeader ? { Authorization: authHeader } : {},
      }
    );
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err: any) {
    res.status(502).json({
      status: false,
      message: "無法連接到主應用後端",
      error: err.message,
    });
  }
});

// Analyze image - either file upload OR imageUrl
// 圖片分析：可接受本地上傳或 imageUrl
app.post(
  "/api/v1/ai/analyze-image",
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

// 錯誤處理中介層
app.use(aiRecipeErrorHandler);

// 本地開發時啟動伺服器
if (
  process.env.NODE_ENV !== "production" ||
  process.env.npm_lifecycle_event === "dev"
) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger UI at http://localhost:${PORT}/docs`);
  });
}

// 導出 app 供 Vercel serverless function 使用
export default app;
