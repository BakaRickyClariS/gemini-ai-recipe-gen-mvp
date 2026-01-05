# 🍳 Recipe API - AI 食譜生成與智慧冰箱管理服務

基於 **Google Gemini AI** 的智能食譜生成 API，支援多食譜推薦、SSE Streaming、AI 圖片生成、食材辨識、**庫存管理**與**推播通知**功能。

## ✨ 功能特色

| 功能                     | 說明                                            |
| ------------------------ | ----------------------------------------------- |
| 🤖 **AI 多食譜推薦**     | 一次產生多道食譜，包含完整材料、調味料與步驟    |
| 📡 **SSE 即時串流**      | Server-Sent Events 支援即時回應，提升使用者體驗 |
| 🖼️ **AI 圖片生成**       | 使用 Gemini 2.0 Flash 自動生成精美食譜圖片      |
| 📸 **食材辨識**          | 上傳或提供圖片 URL，AI 自動識別食材與建議       |
| 🥗 **多食材辨識**        | 單張圖片同時辨識多種食材並自動裁切              |
| 🔒 **AI 安全機制**       | 包含 Prompt 驗證、輸出過濾與安全日誌            |
| 📦 **庫存管理**          | 支援智慧冰箱食材 CRUD、消耗追蹤與即期警示       |
| 🔔 **推播通知**          | 整合 Firebase FCM 推播與通知中心系統            |
| ⏰ **Cron Job 定時任務** | 定時檢查過期食材並發送提醒通知                  |
| ☁️ **雲端整合**          | 整合 Cloudinary 媒體管理與 Supabase 資料庫      |
| 📄 **Swagger UI**        | 內建互動式 API 文檔（支援 CDN 版本適用 Vercel） |
| 🔄 **自動 Fallback**     | 模型與 API Key 自動輪換，最大化每日配額         |

---

## 📁 專案結構

```
recipe-api/
├── src/
│   ├── index.ts                          # Express 主程序入口
│   ├── db/
│   │   └── index.ts                      # PostgreSQL 資料庫連線
│   ├── lib/
│   │   └── ...                           # 共用函式庫
│   ├── models/
│   │   └── recipe.ts                     # 基礎食譜 TypeScript 型別
│   ├── types/
│   │   ├── aiRecipe.ts                   # AI 食譜請求/回應型別定義
│   │   ├── aiStreamEvents.ts             # SSE 事件型別定義
│   │   ├── imageAnalysis.ts              # 影像分析型別
│   │   ├── inventory.ts                  # 庫存管理型別
│   │   └── savedRecipe.ts                # 儲存食譜型別
│   ├── services/
│   │   ├── modelClient.ts                # 模型客戶端（自動 Fallback + 多 API Key）
│   │   ├── aiRecipeService.ts            # AI 多食譜生成與 SSE Streaming
│   │   ├── imageGenerationService.ts     # AI 圖片生成服務 (Gemini 2.0 Flash)
│   │   ├── imageAnalysisService.ts       # 影像分析與食材辨識
│   │   ├── multipleIngredientsService.ts # 多食材同時辨識服務
│   │   ├── mediaService.ts               # Cloudinary 媒體上傳服務
│   │   ├── inventoryService.ts           # 庫存管理服務
│   │   ├── recipeStorageService.ts       # 食譜儲存服務
│   │   ├── notificationService.ts        # 推播通知服務
│   │   ├── outputFilter.ts               # AI 輸出過濾（安全機制）
│   │   └── securityLogger.ts             # 安全日誌記錄
│   ├── routes/
│   │   ├── authRoutes.ts                 # 認證路由
│   │   ├── adminRoutes.ts                # 管理員路由
│   │   ├── cronRoutes.ts                 # Cron Job 路由
│   │   ├── inventoryRoutes.ts            # 庫存管理路由
│   │   ├── notificationRoutes.ts         # 推播通知路由
│   │   └── recipeRoutes.ts               # 食譜儲存路由
│   ├── middleware/
│   │   ├── errorHandler.ts               # 錯誤處理中介層
│   │   ├── aiSecurity.ts                 # AI 安全中介層
│   │   ├── promptValidator.ts            # Prompt 注入驗證
│   │   ├── rateLimit.ts                  # 速率限制（尚未啟用）
│   │   └── cookieAuth.ts                 # Cookie 認證中介層
│   ├── utils/
│   │   └── ...                           # 工具函式
│   └── scripts/
│       └── ...                           # 腳本工具
├── docs/                                 # API 規格與整合指南
│   ├── ai_recipe_api_spec.md             # AI 食譜 API 規格
│   ├── ai_media_api_spec.md              # AI 媒體 API 規格
│   ├── frontend_api_reference.md         # 前端 API 參考
│   ├── frontend/                         # 前端整合文檔
│   │   ├── inventory_api_spec.md         # 庫存 API 規格
│   │   ├── push-notification-backend-spec.md # 推播規格
│   │   ├── backend-ai-security-plan.md   # AI 安全計畫
│   │   └── ...
│   └── migrations/                       # 資料庫遷移腳本
├── nginx/
│   ├── Dockerfile                        # Nginx 容器配置
│   └── nginx.conf                        # 反向代理配置
├── Dockerfile                            # Node.js 構建配置
├── docker-compose.yml                    # 容器編排
├── vercel.json                           # Vercel 部署配置
├── openapi.json                          # OpenAPI 3.1 規範 (Swagger UI)
├── tsconfig.json                         # TypeScript 編譯配置
├── package.json                          # npm 依賴清單
├── env.example                           # 環境變數範本
└── README.md                             # 專案文檔
```

---

## ⚡ 快速開始

### 步驟 1️⃣：設定環境變數

```bash
# 複製範本
cp env.example .env.local

# 編輯 .env.local 文件
```

```ini
# 必要：Google Gemini API Key
# 前往 https://aistudio.google.com/app/apikeys 取得
GOOGLE_API_KEY=your_key_here
# 或
GEMINI_API_KEY=your_key_here

# 必要：Cloudinary 設定 (用於圖片上傳)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
# 或使用 Upload Preset (可選)
CLOUDINARY_UPLOAD_PRESET=your_preset

# 必要：PostgreSQL 資料庫 (Supabase)
DATABASE_URL=postgresql://postgres:your_password@db.xxxxx.supabase.co:5432/postgres

# 可選：Firebase 推播通知
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}

# 可選：AI 設定
AI_DAILY_LIMIT=3           # 每用戶每日查詢次數限制
AI_REQUEST_TIMEOUT=30000   # AI 請求逾時 (毫秒)

# 可選：多 API Key（最多 10 個）
GEMINI_API_KEY_1=your_second_api_key
GEMINI_API_KEY_2=your_third_api_key

# 可選：管理員
ADMIN_TOKEN=your_secure_admin_token
DEPLOY_SECRET=your_deploy_secret

# 可選：服務設定
PORT=3000                  # 服務埠號
NODE_ENV=development       # 執行環境
```

### 步驟 2️⃣：選擇運行方式

#### 開發模式

```bash
# 安裝依賴
npm install

# 啟動開發服務器
npm run dev

# 訪問
# 🌐 http://localhost:3000
# 📚 API 文檔: http://localhost:3000/docs
# 🏥 健康檢查: http://localhost:3000/health
```

#### Docker 模式

```bash
# 複製環境變數
cp env.example .env

# 啟動容器（自動構建）
npm run docker:up

# 查看日誌
npm run docker:logs

# 訪問
# 🌐 http://localhost:8080
# 📚 API 文檔: http://localhost:8080/docs
```

#### 生產環境構建

```bash
# TypeScript 編譯
npm run build

# 啟動生產服務
npm start
```

---

## 📚 API 端點

### 核心端點

| 方法  | 路徑            | 說明                              |
| ----- | --------------- | --------------------------------- |
| `GET` | `/`             | API 資訊總覽                      |
| `GET` | `/health`       | 健康檢查                          |
| `GET` | `/status`       | 服務狀態（uptime、memory）        |
| `GET` | `/docs`         | Swagger UI（本地開發）            |
| `GET` | `/docs-cdn`     | Swagger UI（CDN 版，適用 Vercel） |
| `GET` | `/openapi.json` | OpenAPI 規範 JSON                 |

### 認證 API

| 方法   | 路徑                | 說明             |
| ------ | ------------------- | ---------------- |
| `POST` | `/api/v1/auth/sync` | 同步前端 Session |

### AI 食譜生成 (v2.3)

| 方法   | 路徑                            | 說明                         |
| ------ | ------------------------------- | ---------------------------- |
| `POST` | `/api/v1/ai/recipe`             | AI 多食譜生成（標準回應）    |
| `POST` | `/api/v1/ai/recipe/stream`      | AI 食譜生成（SSE Streaming） |
| `GET`  | `/api/v1/ai/recipe/suggestions` | 取得預設 Prompt 建議         |

### 媒體與影像辨識

| 方法   | 路徑                                | 說明                      |
| ------ | ----------------------------------- | ------------------------- |
| `POST` | `/api/v1/media/upload`              | 上傳圖片至 Cloudinary     |
| `POST` | `/api/v1/ai/analyze-image`          | AI 食材辨識（檔案或 URL） |
| `POST` | `/api/v1/ai/analyze-image/multiple` | AI 多食材辨識             |

### 食譜儲存

| 方法     | 路徑                  | 說明             |
| -------- | --------------------- | ---------------- |
| `GET`    | `/api/v1/recipes`     | 取得儲存的食譜   |
| `POST`   | `/api/v1/recipes`     | 儲存 AI 生成食譜 |
| `DELETE` | `/api/v1/recipes/:id` | 刪除儲存的食譜   |

### 庫存管理

| 方法     | 路徑                                                  | 說明         |
| -------- | ----------------------------------------------------- | ------------ |
| `GET`    | `/api/v1/refrigerators/:id/inventory`                 | 取得庫存清單 |
| `POST`   | `/api/v1/refrigerators/:id/inventory`                 | 新增庫存食材 |
| `PUT`    | `/api/v1/refrigerators/:id/inventory/:itemId`         | 更新庫存食材 |
| `DELETE` | `/api/v1/refrigerators/:id/inventory/:itemId`         | 刪除庫存食材 |
| `POST`   | `/api/v1/refrigerators/:id/inventory/:itemId/consume` | 消耗庫存食材 |
| `GET`    | `/api/v1/refrigerators/:id/inventory/settings`        | 取得庫存設定 |
| `PUT`    | `/api/v1/refrigerators/:id/inventory/settings`        | 更新庫存設定 |

### 推播通知

| 方法     | 路徑                               | 說明                   |
| -------- | ---------------------------------- | ---------------------- |
| `POST`   | `/api/v1/notifications/token`      | 註冊 FCM Token         |
| `DELETE` | `/api/v1/notifications/token`      | 移除 FCM Token         |
| `GET`    | `/api/v1/notifications`            | 取得通知列表           |
| `POST`   | `/api/v1/notifications/send`       | 發送通知（含群組廣播） |
| `PATCH`  | `/api/v1/notifications/:id/read`   | 標記通知已讀           |
| `PATCH`  | `/api/v1/notifications/batch/read` | 批次標記已讀           |
| `DELETE` | `/api/v1/notifications/batch`      | 批次刪除通知           |

### 管理員 API

| 方法   | 路徑                          | 說明         |
| ------ | ----------------------------- | ------------ |
| `POST` | `/api/v1/admin/announcements` | 發佈官方公告 |

### Cron Job API

| 方法  | 路徑                     | 說明                   |
| ----- | ------------------------ | ---------------------- |
| `GET` | `/api/cron/check-expiry` | 檢查過期食材並發送通知 |

---

## 🧪 API 測試範例

### 1. AI 多食譜生成

```bash
curl -X POST http://localhost:3000/api/v1/ai/recipe \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user123" \
  -d '{
    "prompt": "想做簡單的日式家常菜",
    "servings": 2,
    "recipeCount": 2,
    "difficulty": "簡單"
  }'
```

**成功回應：**

```json
{
  "status": true,
  "message": "ok",
  "data": {
    "greeting": "您好！這裡為您推薦兩道簡單美味的日式家常菜...",
    "recipes": [
      {
        "id": "ai-001",
        "name": "照燒雞腿排",
        "category": "日式",
        "servings": 2,
        "cookTime": 25,
        "difficulty": "簡單",
        "imageUrl": "data:image/png;base64,...",
        "isFavorite": false,
        "ingredients": [{ "name": "雞腿肉", "amount": "2", "unit": "片" }],
        "seasonings": [{ "name": "醬油", "amount": "3", "unit": "大匙" }],
        "steps": [{ "step": 1, "description": "雞腿肉兩面劃刀，方便入味..." }]
      }
    ],
    "aiMetadata": {
      "generatedAt": "2025-12-20T05:30:00.000Z",
      "model": "gemini-2.5-flash",
      "apiKeyUsed": 1
    },
    "remainingQueries": 2
  }
}
```

### 2. SSE Streaming 食譜生成

```bash
curl -X POST http://localhost:3000/api/v1/ai/recipe/stream \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"prompt": "健康的早餐选择"}'
```

### 3. 上傳圖片

```bash
curl -X POST http://localhost:3000/api/v1/media/upload \
  -F "file=@path/to/image.jpg"
```

### 4. AI 食材辨識

**方式 A：上傳圖片檔案**

```bash
curl -X POST http://localhost:3000/api/v1/ai/analyze-image \
  -F "file=@path/to/food.jpg"
```

**方式 B：使用圖片 URL**

```bash
curl -X POST http://localhost:3000/api/v1/ai/analyze-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/food.jpg"}'
```

**成功回應：**

```json
{
  "success": true,
  "data": {
    "productName": "雞蛋",
    "category": "dairy",
    "attributes": ["新鮮", "有機"],
    "purchaseQuantity": 10,
    "unit": "顆",
    "purchaseDate": "2025-12-20",
    "expiryDate": "2026-01-03",
    "lowStockAlert": true,
    "lowStockThreshold": 2,
    "notes": "新鮮度佳，冷藏保存",
    "imageUrl": "https://res.cloudinary.com/..."
  },
  "timestamp": "2025-12-20T05:30:00.000Z"
}
```

### 5. 多食材辨識

```bash
curl -X POST http://localhost:3000/api/v1/ai/analyze-image/multiple \
  -F "file=@path/to/multiple-foods.jpg" \
  -F "cropImages=true" \
  -F "maxIngredients=10"
```

### 6. 庫存管理

```bash
# 取得庫存清單
curl http://localhost:3000/api/v1/refrigerators/my-fridge/inventory \
  -H "X-User-Id: user123"

# 新增庫存食材
curl -X POST http://localhost:3000/api/v1/refrigerators/my-fridge/inventory \
  -H "Content-Type: application/json" \
  -H "X-User-Id: user123" \
  -d '{"name": "牛奶", "category": "dairy", "quantity": 1, "unit": "瓶"}'
```

---

## 📊 系統架構

```
┌─────────────────────────────┐
│       用戶瀏覽器             │
│  http://localhost:8080/docs │
└────────────┬────────────────┘
             │
        Port 8080
             │
    ┌────────▼─────────┐
    │      Nginx       │
    │  反向代理 + 負載  │
    │      均衡        │
    └────────┬─────────┘
             │
        ┌────┴────┐
        │         │
   ┌────▼──┐  ┌──▼───┐
   │ Node1 │  │ Node2│
   │ API   │  │ API  │
   │:3000  │  │:3000 │
   └───┬───┘  └───┬──┘
       │          │
       └────┬─────┘
            │
   ┌────────┼────────┐
   │        │        │
┌──▼─────┐ ┌▼──────┐ ┌▼──────────┐
│Gemini  │ │Cloudi-│ │ Supabase  │
│  API   │ │ nary  │ │PostgreSQL │
│(Google)│ │(媒體) │ │ (資料庫)  │
└────────┘ └───────┘ └───────────┘
            │
      ┌─────▼─────┐
      │ Firebase  │
      │   FCM     │
      │ (推播)    │
      └───────────┘
```

---

## 🔧 技術棧

| 技術                      | 版本    | 說明                |
| ------------------------- | ------- | ------------------- |
| **Node.js**               | ≥20.0.0 | 執行環境            |
| **TypeScript**            | ^5.3.3  | 型別安全            |
| **Express**               | ^4.19.2 | Web 框架            |
| **@google/generative-ai** | ^0.21.0 | Gemini AI API       |
| **@google/genai**         | ^1.34.0 | Gemini 圖片生成 API |
| **Cloudinary**            | ^2.8.0  | 圖片雲端存儲        |
| **Swagger UI Express**    | ^5.0.1  | API 文檔            |
| **Multer**                | ^1.4.5  | 檔案上傳處理        |
| **pg**                    | ^8.16.3 | PostgreSQL 客戶端   |
| **firebase-admin**        | ^13.6.0 | Firebase 推播服務   |
| **sharp**                 | ^0.34.5 | 圖片處理            |

---

## 📋 環境變數說明

| 變數名                         | 必需 | 預設值      | 說明                                          |
| ------------------------------ | ---- | ----------- | --------------------------------------------- |
| `GOOGLE_API_KEY`               | ✅   | -           | Google Gemini API 密鑰                        |
| `GEMINI_API_KEY`               | ⚠️   | -           | Gemini API 密鑰（與上方二擇一）               |
| `DATABASE_URL`                 | ✅   | -           | PostgreSQL 連線字串（Supabase）               |
| `CLOUDINARY_CLOUD_NAME`        | ✅   | -           | Cloudinary Cloud Name                         |
| `CLOUDINARY_API_KEY`           | ⚠️   | -           | Cloudinary API Key                            |
| `CLOUDINARY_API_SECRET`        | ⚠️   | -           | Cloudinary API Secret                         |
| `CLOUDINARY_UPLOAD_PRESET`     | ⚠️   | -           | Cloudinary Upload Preset（無 API Key 時必要） |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ❌   | -           | Firebase 服務帳戶金鑰（JSON 格式）            |
| `AI_DAILY_LIMIT`               | ❌   | 3           | 每用戶每日查詢次數限制                        |
| `AI_REQUEST_TIMEOUT`           | ❌   | 30000       | AI 請求逾時（毫秒）                           |
| `GEMINI_API_KEY_1`             | ❌   | -           | 備用 API Key #1（多 Key 支援）                |
| `GEMINI_API_KEY_2`             | ❌   | -           | 備用 API Key #2                               |
| `GEMINI_API_KEY_3`             | ❌   | -           | 備用 API Key #3（最多支援 10 個）             |
| `ADMIN_TOKEN`                  | ❌   | -           | 管理員 API 認證 Token                         |
| `DEPLOY_SECRET`                | ❌   | -           | 部署驗證密鑰（Cron Job 用）                   |
| `PORT`                         | ❌   | 3000        | Node.js 監聽端口                              |
| `NODE_ENV`                     | ❌   | development | 執行環境                                      |

---

## 🔒 AI 安全機制

本專案實現了多層 AI 安全防護：

| 機制                   | 說明                           |
| ---------------------- | ------------------------------ |
| **Prompt 驗證**        | 偵測並攔截 Prompt 注入攻擊     |
| **輸出過濾**           | 過濾 AI 輸出中的敏感或不當內容 |
| **安全日誌**           | 記錄可疑請求用於安全審計       |
| **嚴格 System Prompt** | 強化 AI 回應的穩定性與一致性   |

詳細說明請參考 [AI 安全處理指南](./docs/frontend/ai-security-handling-guide.md)

---

## 🐳 Docker 常用命令

```bash
# 查看所有運行中的容器
docker ps

# 查看容器日誌
docker logs -f recipe-api-node-1
docker logs -f recipe-api-nginx

# 進入容器內部
docker exec -it recipe-api-node-1 /bin/sh

# 查看容器資源使用
docker stats

# 重啟容器
docker-compose restart

# 停止並刪除容器
docker-compose down

# 重新構建並啟動
docker-compose up -d --build
```

---

## 🚀 Vercel 部署

本專案支援 Vercel Serverless 部署：

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 部署
vercel
```

**注意事項：**

- Vercel 環境使用 `/docs-cdn` 路徑訪問 Swagger UI
- 請在 Vercel Dashboard 設定所有必要的環境變數

詳細部署指南請參考 [VERCEL_DEPLOYMENT_GUIDE.md](./VERCEL_DEPLOYMENT_GUIDE.md)

---

## 🔐 API 密鑰獲取

### Google Gemini API（免費方案）

- ✅ **永久免費層** - 每模型每日 20 次請求
- ✅ 支持商業使用
- ✅ 無需下載模型
- ✅ 包括文字和圖片輸入

> 💡 **小技巧**：本專案支援多模型 Fallback 與多 API Key 輪換，
> 配置 3 個 API Key 可達成 **180+ 次/日** 的免費配額！

**獲取步驟：**

1. 訪問 [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. 點擊 **「Create API Key」**
3. 選擇 **「Create in new project」**
4. 複製生成的 API Key

### Cloudinary（免費方案）

1. 訪問 [Cloudinary](https://cloudinary.com/) 註冊
2. 進入 Dashboard 取得 Cloud Name、API Key、API Secret

### Supabase（免費方案）

1. 訪問 [Supabase](https://supabase.com/) 註冊
2. 建立新專案後取得 PostgreSQL 連線字串

### Firebase（免費方案）

1. 訪問 [Firebase Console](https://console.firebase.google.com/)
2. 建立專案並啟用 Cloud Messaging
3. 生成服務帳戶金鑰（JSON 格式）

---

## 📖 文檔

### 核心整合指南

- [API 整合指南](./docs/API_INTEGRATION_GUIDE.md)
- [前端 API 參考](./docs/frontend_api_reference.md)

### AI 功能

- [AI 食譜 API 規格](./docs/ai_recipe_api_spec.md)
- [AI 媒體 API 規格](./docs/ai_media_api_spec.md)
- [AI Prompt 最佳化](./docs/ai_prompt_optimization.md)

### 後端服務

- [庫存 API 規格](./docs/frontend/inventory_api_spec.md)
- [推播通知規格](./docs/frontend/push-notification-backend-spec.md)
- [AI 安全計畫](./docs/frontend/backend-ai-security-plan.md)

### 遷移與部署

- [Cloudinary 遷移指南](./docs/cloudinary_migration_guide.md)
- [前端遷移指南](./docs/frontend_migration_guide.md)

---

## ✅ 開發確認清單

運行前請確認：

- [ ] 安裝 Node.js 20+ ([nodejs.org](https://nodejs.org))
- [ ] 安裝 Docker 和 Docker Compose ([docker.com](https://docker.com))（Docker 模式）
- [ ] 獲取 Google Gemini API 密鑰
- [ ] 取得 Supabase 資料庫連線
- [ ] 獲取 Cloudinary 帳號設定
- [ ] （可選）設定 Firebase 推播服務
- [ ] 設定環境變數（`.env` 或 `.env.local`）
- [ ] 執行 `npm install`

---

## 🗄️ 資料庫遷移

若需要建立資料庫結構，請在 Supabase SQL Editor 執行 `docs/migrations/` 目錄下的遷移腳本。

---

## 📄 License

MIT License © 2025-2026
