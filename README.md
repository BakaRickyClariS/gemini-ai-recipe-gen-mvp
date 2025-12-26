# 🍳 Recipe API - AI 食譜生成服務

基於 **Google Gemini AI** 的智能食譜生成 API，支援多食譜推薦、SSE Streaming、AI 圖片生成與食材辨識功能。

## ✨ 功能特色

| 功能                 | 說明                                            |
| -------------------- | ----------------------------------------------- |
| 🤖 **AI 多食譜推薦** | 一次產生多道食譜，包含完整材料、調味料與步驟    |
| 📡 **SSE 即時串流**  | Server-Sent Events 支援即時回應，提升使用者體驗 |
| 🖼️ **AI 圖片生成**   | 使用 Gemini 2.0 Flash 自動生成精美食譜圖片      |
| 📸 **食材辨識**      | 上傳或提供圖片 URL，AI 自動識別食材與建議       |
| ☁️ **雲端媒體**      | 整合 Cloudinary 進行圖片上傳與管理              |
| 📄 **Swagger UI**    | 內建互動式 API 文檔（支援 CDN 版本適用 Vercel） |
| 🔄 **自動 Fallback** | 模型與 API Key 自動輪換，最大化每日配額       |

---

## 📁 專案結構

```
recipe-api/
├── src/
│   ├── index.ts                      # Express 主程序入口
│   ├── models/
│   │   └── recipe.ts                 # 基礎食譜 TypeScript 型別
│   ├── types/
│   │   ├── aiRecipe.ts               # AI 食譜請求/回應型別定義
│   │   └── aiStreamEvents.ts         # SSE 事件型別定義
│   ├── services/
│   │   ├── modelClient.ts          # 模型客戶端（自動 Fallback + 多 API Key 支援）
│   │   ├── aiRecipeService.ts        # AI 多食譜生成與 SSE Streaming
│   │   ├── imageGenerationService.ts # AI 圖片生成服務 (Gemini 2.0 Flash)
│   │   ├── imageAnalysisService.ts   # 影像分析與食材辨識
│   │   └── mediaService.ts           # Cloudinary 媒體上傳服務
│   └── middleware/
│       └── errorHandler.ts           # 錯誤處理中介層
├── docs/                             # API 規格與整合指南
│   ├── ai_recipe_api_spec.md
│   ├── ai_media_api_spec.md
│   └── ...
├── nginx/
│   ├── Dockerfile                    # Nginx 容器配置
│   └── nginx.conf                    # 反向代理配置
├── Dockerfile                        # Node.js 構建配置
├── docker-compose.yml                # 容器編排
├── vercel.json                       # Vercel 部署配置
├── openapi.json                      # OpenAPI 3.1 規範 (Swagger UI)
├── tsconfig.json                     # TypeScript 編譯配置
├── package.json                      # npm 依賴清單
├── .env.example                      # 環境變數範本
└── README.md                         # 專案文檔
```

---

## ⚡ 快速開始

### 步驟 1️⃣：設定環境變數

```bash
# 複製範本
cp .env.example .env.local

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

# 可選：其他設定
AI_DAILY_LIMIT=3           # 每日查詢次數限制
AI_REQUEST_TIMEOUT=30000   # AI 請求逾時 (毫秒)
PORT=3000                  # 服務埠號
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
cp .env.example .env

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

| 方法  | 路徑            | 說明                       |
| ----- | --------------- | -------------------------- |
| `GET` | `/`             | API 資訊總覽               |
| `GET` | `/health`       | 健康檢查                   |
| `GET` | `/status`       | 服務狀態（uptime、memory） |
| `GET` | `/docs`         | Swagger UI（本地開發）     |
| `GET` | `/docs-cdn`     | Swagger UI（CDN 版，適用 Vercel）|
| `GET` | `/openapi.json` | OpenAPI 規範 JSON          |

### AI 食譜生成 (v2.0)

| 方法   | 路徑                            | 說明                         |
| ------ | ------------------------------- | ---------------------------- |
| `POST` | `/api/v1/ai/recipe`             | AI 多食譜生成（標準回應）    |
| `POST` | `/api/v1/ai/recipe/stream`      | AI 食譜生成（SSE Streaming） |
| `GET`  | `/api/v1/ai/recipe/suggestions` | 取得預設 Prompt 建議         |

### 媒體與影像

| 方法   | 路徑                       | 說明                      |
| ------ | -------------------------- | ------------------------- |
| `POST` | `/api/v1/media/upload`     | 上傳圖片至 Cloudinary     |
| `POST` | `/api/v1/ai/analyze-image` | AI 食材辨識（檔案或 URL） |

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
    "category": "肉蛋類",
    "attributes": "新鮮類",
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
   ┌────────┴────────┐
   │                 │
┌──▼──────────┐  ┌───▼──────────┐
│ Gemini API  │  │  Cloudinary  │
│  (Google)   │  │  (媒體存儲)  │
└─────────────┘  └──────────────┘
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

---

## 📋 環境變數說明

| 變數名                     | 必需 | 預設值      | 說明                                          |
| -------------------------- | ---- | ----------- | --------------------------------------------- |
| `GOOGLE_API_KEY`           | ✅   | -           | Google Gemini API 密鑰                        |
| `GEMINI_API_KEY`           | ⚠️   | -           | Gemini API 密鑰（與上方二擇一）               |
| `CLOUDINARY_CLOUD_NAME`    | ✅   | -           | Cloudinary Cloud Name                         |
| `CLOUDINARY_API_KEY`       | ⚠️   | -           | Cloudinary API Key                            |
| `CLOUDINARY_API_SECRET`    | ⚠️   | -           | Cloudinary API Secret                         |
| `CLOUDINARY_UPLOAD_PRESET` | ⚠️   | -           | Cloudinary Upload Preset（無 API Key 時必要） |
| `AI_DAILY_LIMIT`           | ❌   | 3           | 每用戶每日查詢次數限制                        |
| `AI_REQUEST_TIMEOUT`       | ❌   | 30000       | AI 請求逾時（毫秒）                           |
| `GEMINI_API_KEY_1`         | ❌   | -           | 備用 API Key #1（多 Key 支援）             |
| `GEMINI_API_KEY_2`         | ❌   | -           | 備用 API Key #2                          |
| `GEMINI_API_KEY_3`         | ❌   | -           | 備用 API Key #3（最多支援 10 個）          |
| `PORT`                     | ❌   | 3000        | Node.js 監聽端口                              |
| `NODE_ENV`                 | ❌   | development | 執行環境                                      |

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

---

## 📖 文檔

- [API 整合指南](./docs/API_INTEGRATION_GUIDE.md)
- [AI 食譜 API 規格](./docs/ai_recipe_api_spec.md)
- [AI 媒體 API 規格](./docs/ai_media_api_spec.md)
- [Cloudinary 遷移指南](./docs/cloudinary_migration_guide.md)
- [前端遷移指南](./docs/frontend_migration_guide.md)

---

## ✅ 開發確認清單

運行前請確認：

- [ ] 安裝 Node.js 20+ ([nodejs.org](https://nodejs.org))
- [ ] 安裝 Docker 和 Docker Compose ([docker.com](https://docker.com))（Docker 模式）
- [ ] 獲取 Google Gemini API 密鑰
- [ ] 獲取 Cloudinary 帳號設定
- [ ] 設定環境變數（`.env` 或 `.env.local`）
- [ ] 執行 `npm install`

---


## 📄 License

MIT License © 2025
