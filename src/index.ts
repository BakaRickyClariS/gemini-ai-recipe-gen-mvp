import "dotenv/config";
import "./instrument.js";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import { testConnection } from "./db/index.js";
import { config } from "./config/unifiedConfig.js";

// ===== v1 Routes =====
import v1AuthRoutes from "./routes/v1/authRoutes.js";
import v1InventoryRoutes from "./routes/v1/inventoryRoutes.js";
import v1NotificationRoutes from "./routes/v1/notificationRoutes.js";
import v1RecipeRoutes from "./routes/v1/recipeRoutes.js";
import v1AdminRoutes from "./routes/v1/adminRoutes.js";
import v1CronRoutes from "./routes/v1/cronRoutes.js";
import v1AiRoutes from "./routes/v1/aiRoutes.js";

// ===== v2 Routes =====
import v2AuthRoutes from "./routes/v2/authRoutes.js";
import v2ProfileRoutes from "./routes/v2/profileRoutes.js";
import v2GroupRoutes from "./routes/v2/groupRoutes.js";
import v2ShoppingListRoutes from "./routes/v2/shoppingListRoutes.js";
import v2SubscriptionRoutes from "./routes/v2/subscriptionRoutes.js";
import v2InventoryRoutes from "./routes/v2/inventoryRoutes.js";
import v2NotificationRoutes from "./routes/v2/notificationRoutes.js";
import v2RecipeRoutes from "./routes/v2/recipeRoutes.js";
import v2MediaRoutes from "./routes/v2/mediaRoutes.js";
import v2AiRoutes from "./routes/v2/aiRoutes.js";

// ===== Middleware & Error Handling =====
import { aiRecipeErrorHandler } from "./middleware/errorHandler.js";
import { GroupController } from "./controllers/GroupController.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { ApiError } from "./errors/ApiError.js";
import { verifyCsrfToken } from "./middleware/csrfProtection.js";
import * as Sentry from "@sentry/node";

const app = express();
const PORT = config.port;

// ===== Middleware =====
app.use(
  cors({
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
      "X-User-Id", // 向下相容：前端傳遞使用者 ID
    ],
  }),
);
app.use(express.json({ type: ["application/json", "text/plain"] }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ===== Swagger UI =====
const openapiPath = path.join(process.cwd(), "openapi.json");
const openapi = JSON.parse(fs.readFileSync(openapiPath, "utf-8"));
app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapi));

const swaggerCdnOptions = {
  customCssUrl: "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css",
  customJs: [
    "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js",
    "https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-standalone-preset.js",
  ],
};
app.use(
  "/docs-cdn",
  swaggerUi.serve,
  swaggerUi.setup(openapi, swaggerCdnOptions),
);

// ===== v1 API Routes =====
app.use("/api/v1/auth", v1AuthRoutes);
app.use("/api/v1/recipes", v1RecipeRoutes);
app.use("/api/v1/refrigerators/:refrigeratorId/inventory", v1InventoryRoutes);
app.use("/api/v1/notifications", v1NotificationRoutes);
app.use("/api/v1/admin", v1AdminRoutes);
app.use("/api/cron", v1CronRoutes);
app.use("/api/v1/ai", v1AiRoutes);
app.use("/api/v1/media", v1AiRoutes); // media/upload 也在 aiRoutes 中

// ===== v2 API Routes =====
// Apply CSRF checking to all non-GET V2 routes by default
app.use("/api/v2", (req, res, next) => {
  const exemptPaths = [
    "/auth/line/init",
    "/auth/login",
    "/auth/register",
    "/auth/refresh",
  ];
  if (exemptPaths.includes(req.path)) {
    return next();
  }
  verifyCsrfToken(req, res, next);
});

app.use("/api/v2/auth", v2AuthRoutes);
app.use("/api/v2/profile", v2ProfileRoutes);
app.use("/api/v2/groups", v2GroupRoutes);
app.use("/api/v2", v2ShoppingListRoutes);
app.use("/api/v2/subscriptions", v2SubscriptionRoutes);
app.use("/api/v2/groups/:groupId/inventory", v2InventoryRoutes);
app.use("/api/v2/notifications", v2NotificationRoutes);
app.use("/api/v2/recipes", v2RecipeRoutes);
app.use("/api/v2/media", v2MediaRoutes);
app.use("/api/v2/ai", v2AiRoutes);

// Public invitation lookup (no auth required)
const groupController = new GroupController();
app.get("/api/v2/invitations/:token", (req, res) =>
  groupController.getInvitation(req, res),
);

// Rate limit all v2
app.use("/api/v2", apiLimiter);

// 測試資料庫連線（背景執行）
testConnection().catch(console.error);

// ===== Utility Endpoints =====
app.get("/", (_req, res) => {
  res.json({
    name: "Recipe API",
    version: "3.0.0",
    description: "AI 食譜生成 API - 支援 Gemini AI 多食譜推薦與 SSE Streaming",
    endpoints: {
      health: "/health",
      status: "/status",
      documentation: "/docs (本地開發) 或 /docs-cdn (Vercel 部署)",
      openapi: "/openapi.json",
      v1: {
        generateRecipe: "POST /api/v1/ai/recipe",
        streamRecipe: "POST /api/v1/ai/recipe/stream",
        recipeSuggestions: "GET /api/v1/ai/recipe/suggestions",
        analyzeImage: "POST /api/v1/ai/analyze-image",
        savedRecipes: "GET/POST /api/v1/recipes",
        inventory: "GET/POST /api/v1/refrigerators/:id/inventory",
        notifications: "POST /api/v1/notifications/token",
      },
      v2: {
        auth: "/api/v2/auth",
        profile: "/api/v2/profile",
        groups: "/api/v2/groups",
        shoppingLists: "/api/v2/groups/:id/shopping-lists",
        subscriptions: "/api/v2/subscriptions",
      },
    },
  });
});

app.get("/openapi.json", (_req, res) => {
  res.json(openapi);
});

app.get("/health", (_req, res) => {
  res.json({
    status: "✅ 食譜 API 運行正常",
    timestamp: new Date().toISOString(),
    version: "3.0.0",
  });
});

app.get("/status", (_req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    pid: process.pid,
  });
});

// ===== Error Handlers =====
// v1 AI error handler
app.use(aiRecipeErrorHandler);

// v2 centralized error handler
app.use(
  (
    err: unknown,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    if (err instanceof ApiError) {
      res.status(err.statusCode).json({
        success: false,
        error: { code: err.code, message: err.message },
      });
      return;
    }
    Sentry.captureException(err);
    console.error("[Global Error]", err);
    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    });
  },
);

// 本地開發時啟動伺服器
if (config.env !== "production" || process.env.npm_lifecycle_event === "dev") {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger UI at http://localhost:${PORT}/docs`);
  });
}

// 導出 app 供 Vercel serverless function 使用
export default app;
