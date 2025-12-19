# 🚀 Recipe API - 使用指南

```
recipe-api/
├── src/
│   ├── models/
│   │   └── recipe.ts              # ✅ TypeScript type 定義
│   ├── services/
│   │   └── recipeService.ts       # ✅ Gemini API 調用邏輯
│   └── index.ts                   # ✅ Express 主程序
├── nginx/
│   ├── Dockerfile                 # ✅ Nginx 容器配置
│   └── nginx.conf                 # ✅ 反向代理配置
├── Dockerfile                     # ✅ Node.js 構建配置
├── docker-compose.yml             # ✅ 容器編排
├── openapi.json                   # ✅ OpenAPI 3.1 規範 (Swagger UI)
├── tsconfig.json                  # ✅ TypeScript 編譯配置
├── package.json                   # ✅ npm 依賴清單
├── .env.example                   # ✅ 環境變數範本
├── .env.local                     # ✅ 開發環境變數
├── .gitignore                     # ✅ Git 忽略規則
├── .dockerignore                  # ✅ Docker 忽略規則
└── README.md                      # ✅ 項目文檔
```

---

## ⚡ 3 步快速開始

```bash
# 編輯 .env.local 文件，添加你的 Google API Key
# 前往 https://aistudio.google.com/app/apikeys 獲取免費密鑰

GOOGL_API_KEY=your_key_here

# 添加 Cloudinary 設定 (用於圖片上傳)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
# 或使用 Upload Preset (可選)
CLOUDINARY_UPLOAD_PRESET=your_preset
```

### 步驟 1️⃣: 置環境變數

### 步驟 2️⃣: 運行

選擇以下方式之一：

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

# 編輯 .env 添加 GOOGLE_API_KEY

# 啟動容器（自動構建）
npm run docker:up

# 查看日誌
npm run docker:logs

# 訪問
# 🌐 http://localhost:8080
# 📚 API 文檔: http://localhost:8080/docs
# 📊 狀態: http://localhost:8080/status
```

---

## 🧪 測試 API

### 1. 生成食譜

```bash
curl -X POST http://localhost:8080/api/v1/recipe/generate \
  -H "Content-Type: application/json" \
  -d '{"input": "我想用雞肉和番茄做一道簡單的義大利菜"}'
```

**成功回應:**

```json
{
  "success": true,
  "data": {
    "recipeName": "番茄雞肉義大利麵",
    "servings": 2,
    "prepTimeMinutes": 15,
    "cookTimeMinutes": 30,
    "totalTimeMinutes": 45,
    "difficulty": "medium",
    "cuisine": "義大利",
    "category": "主菜",
    "ingredients": [
      {
        "name": "雞胸肉",
        "quantity": 300,
        "unit": "克",
        "optional": false
      },
      {
        "name": "番茄",
        "quantity": 400,
        "unit": "克",
        "optional": false
      }
    ],
    "instructions": [
      {
        "step": 1,
        "description": "將雞胸肉切成小塊",
        "timeMinutes": 5
      }
    ],
    "tips": ["使用新鮮番茄味道更好", "火不要太猛以免焦掉"],
    "nutritionPerServing": {
      "calories": 350,
      "protein": "42g",
      "fat": "8g",
      "carbohydrates": "15g"
    }
  },
  "timestamp": "2025-11-09T01:35:00.000Z"
}
```

### 2. 上傳圖片 (新增)

```bash
curl -X POST http://localhost:8080/api/v1/media/upload \
  -F "file=@path/to/image.jpg"
```

**成功回應:**

```json
{
  "success": true,
  "data": {
    "url": "https://res.cloudinary.com/...",
    "publicId": "fufood/..."
  }
}
```

### 3. 分析圖片食材

**方式 A: 上傳圖片檔案**

```bash
curl -X POST http://localhost:8080/api/v1/recipe/analyze-image \
  -F "file=@path/to/food.jpg"
```

**方式 B: 使用圖片 URL**

```bash
curl -X POST http://localhost:8080/api/v1/recipe/analyze-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/food.jpg"}'
```

**成功回應:**

```json
{
  "success": true,
  "data": {
    "imageDescription": "一張展示新鮮蔬菜和雞肉的砧板照片",
    "detectedIngredients": [
      {
        "name": "雞肉",
        "confidence": 95,
        "quantity": "500克",
        "freshness": "非常新鮮",
        "notes": "看起來是雞胸肉"
      },
      {
        "name": "番茄",
        "confidence": 90,
        "quantity": "3個中等大小",
        "freshness": "新鮮",
        "notes": "紅色成熟番茄"
      }
    ],
    "suggestedCuisines": ["義大利", "西餐", "地中海"],
    "suggestedDishes": [
      {
        "dishName": "番茄雞肉義大利麵",
        "requiredAdditionalIngredients": ["橄欖油", "大蒜", "帕瑪森起司"]
      }
    ],
    "healthScore": 85,
    "preparationDifficulty": "medium",
    "estimatedCookTime": 40
  },
  "timestamp": "2025-11-09T01:35:00.000Z"
}
```

### 4. 健康檢查

```bash
curl http://localhost:8080/health

# 回應
{
  "status": "✅ 食譜 API 運行正常",
  "timestamp": "2025-11-09T01:35:00.000Z",
  "version": "1.0.0"
}
```

---

## 📚 Swagger UI 文檔

開發和生產模式都包含互動式 API 文檔（就像你上傳的圖片一樣）：

- **開發模式**: http://localhost:3000/docs
- **Docker 模式**: http://localhost:8080/docs

可以直接在瀏覽器中測試所有 API 端點

---

## 📊 架構說明

```
┌─────────────────────────────┐
│    用戶瀏覽器               │
│  http://localhost:8080/docs │
└────────────┬────────────────┘
             │
        Port 8080
             │
    ┌────────▼─────────┐
    │   Nginx          │
    │ 反向代理 + 負載  │
    │     均衡         │
    └────────┬─────────┘
             │
        ┌────┴────┐
        │          │
   ┌────▼──┐  ┌──▼───┐
   │ Node1 │  │ Node2│
   │ API   │  │ API  │
   │:3000  │  │:3000 │
   └───┬───┘  └───┬──┘
       │          │
       └────┬─────┘
            │
      ┌─────▼──────┐
      │ Gemini API │
      │  (Google)  │
      └────────────┘
```

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
docker exec -it recipe-api-nginx /bin/sh

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

## 🔐 獲取 Google API 密鑰

### 免費方案

- ✅ **永久免費層** - 每分鐘 15 次請求
- ✅ 支持商業使用
- ✅ 無需下載模型
- ✅ 包括文字和圖片輸入

### 獲取步驟

1. 訪問 [Google AI Studio](https://aistudio.google.com/app/apikeys)
2. 點擊 **「Create API Key」**
3. 選擇 **「Create in new project」**
4. 複製生成的 API Key
5. 粘貼到 `.env` 或 `.env.local` 的 `GOOGLE_API_KEY`

---

## 📋 環境變數說明

| 變數名 | 必需 | 預設值 | 說明 |
| --- | --- | --- | --- |
| `GOOGLE_API_KEY` | ✅ | - | Google Gemini API 密鑰 |
| `CLOUDINARY_CLOUD_NAME` | ✅ | - | Cloudinary Cloud Name |
| `CLOUDINARY_API_KEY` | ⚠️ | - | Cloudinary API Key |
| `CLOUDINARY_API_SECRET` | ⚠️ | - | Cloudinary API Secret |
| `PORT`           | ❌   | 3000        | Node.js 監聽端口                  |
| `NODE_ENV`       | ❌   | development | 執行環境 (development/production) |

---

## ✅ 確認清單

在運行前，確保你已經完成：

- [ ] 安裝 Node.js 20+ (https://nodejs.org)
- [ ] 安裝 Docker 和 Docker Compose (https://docker.com)
- [ ] 獲取 Google Gemini API 密鑰
- [ ] 解壓 recipe-api.zip
- [ ] 編輯 .env 或 .env.local 文件
- [ ] 運行 npm install（開發模式）或 npm run docker:up（Docker 模式）

---
