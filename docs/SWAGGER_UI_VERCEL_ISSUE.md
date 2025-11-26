# Swagger UI 在 Vercel 的已知問題和解決方案

## 問題描述

Swagger UI 的靜態資源（swagger-ui-bundle.js、swagger-ui-standalone-preset.js 等）在 Vercel serverless 環境無法正確載入。

**錯誤截圖：**
![Swagger UI 錯誤](C:/Users/User/.gemini/antigravity/brain/cb9c366a-1880-4333-aeb4-f6c65aea5a6a/uploaded_image_1_1764126660197.png)

## 根本原因

1. **路徑解析問題**：Vercel serverless functions 的 `process.cwd()` 與本地環境不同
2. **靜態檔案位置**：`swagger-ui-express` 依賴的靜態檔案可能在 serverless 環境中無法正確定位
3. **依賴打包**：Vercel 可能沒有將 `node_modules/swagger-ui-dist` 的靜態檔案包含在部署中

## 已實施的解決方案

### 1. 添加根路由

**檔案：** [`src/index.ts`](file:///d:/User/Ricky/HexSchool/finalProject/test/gemini-ai-recipe-gen-mvp/src/index.ts#L75-L93)

```typescript
app.get("/", (_req, res) => {
  res.json({
    name: "Recipe API",
    version: "1.0.0",
    description: "Generate recipes and analyze ingredients using Gemini AI",
    endpoints: {
      health: "/health",
      status: "/status",
      documentation: "/docs",
      openapi: "/openapi.json",
      generateRecipe: "POST /api/v1/recipe/generate",
      analyzeImage: "POST /api/v1/recipe/analyze-image"
    },
    recommendation: "Use imageUrl parameter (e.g., Cloudinary) for best performance"
  });
});
```

**效果：** 訪問根路徑 `/` 現在會顯示 API 資訊而不是 "Cannot GET /"

### 2. 提供 OpenAPI 規格下載端點

```typescript
app.get("/openapi.json", (_req, res) => {
  res.json(openapi);
});
```

**效果：** 可以直接訪問 `https://your-app.vercel.app/openapi.json` 獲取完整的 API 規格

## 使用替代方案

### 選項 A：使用外部 Swagger UI（推薦）

**Swagger Editor：**
1. 訪問 https://editor.swagger.io/
2. 選擇 **File** → **Import URL**
3. 輸入：`https://your-app.vercel.app/openapi.json`
4. 立即可視化和測試 API

**Swagger UI Online：**
```
https://petstore.swagger.io/?url=https://your-app.vercel.app/openapi.json
```

### 選項 B：使用 Postman

1. 開啟 Postman
2. **Import** → **Link**
3. 輸入：`https://your-app.vercel.app/openapi.json`
4. Postman 會自動生成所有 API 請求

### 選項 C：本地使用 Swagger UI（開發時）

Swagger UI 在本地開發環境 (`npm run dev`) 仍然可以正常使用：
```
http://localhost:3000/docs
```

### 選項 D：修正 Vercel 上的 Swagger UI（進階）

如果一定要在 Vercel 上使用 Swagger UI，需要：

1. **安裝額外依賴：**
   ```bash
   npm install swagger-ui-dist --save
   ```

2. **修改配置：**
   ```typescript
   import swaggerUi from 'swagger-ui-express';
   import path from 'path';
   import { fileURLToPath } from 'url';
   
   const __filename = fileURLToPath(import.meta.url);
   const __dirname = path.dirname(__filename);
   
   const swaggerUiAssetPath = path.join(__dirname, '../node_modules/swagger-ui-dist');
   
   app.use('/docs', 
     express.static(swaggerUiAssetPath),
     swaggerUi.serve, 
     swaggerUi.setup(openapi)
   );
   ```

3. **更新 vercel.json：**
   ```json
   {
     "builds": [
       {
         "src": "dist/index.js",
         "use": "@vercel/node",
         "config": {
           "includeFiles": [
             "dist/**",
             "node_modules/swagger-ui-dist/**"
           ]
         }
       }
     ]
   }
   ```

**注意：** 這會增加部署包大小和複雜度，不推薦。

## 推薦使用方式

### 開發階段
- ✅ 本地使用 `http://localhost:3000/docs`
- ✅ Swagger UI 功能完整

### 生產環境（Vercel）
- ✅ 使用 `https://your-app.vercel.app/` 查看 API 資訊
- ✅ 使用 `https://your-app.vercel.app/openapi.json` 獲取規格
- ✅ 使用外部工具（Swagger Editor / Postman）進行測試
- ✅ 前端直接呼叫 API 端點

## 測試 API 的方法

### 1. 使用 curl
```bash
# 查看 API 資訊
curl https://your-app.vercel.app/

# 健康檢查
curl https://your-app.vercel.app/health

# 分析圖片（使用 imageUrl）
curl -X POST https://your-app.vercel.app/api/v1/recipe/analyze-image \
  -H "Content-Type: application/json" \
  -d '{"imageUrl": "https://example.com/food.jpg"}'
```

### 2. 使用瀏覽器 DevTools
直接在瀏覽器 Console 測試：
```javascript
fetch('https://your-app.vercel.app/api/v1/recipe/analyze-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    imageUrl: 'https://res.cloudinary.com/demo/image/upload/sample.jpg'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### 3. 使用前端應用
從您的 `fufood.vercel.app` 前端直接呼叫 API。

## 結論

- ✅ **EROFS 錯誤已解決**（使用 /tmp 目錄）
- ✅ **根路由已添加**（不再顯示 "Cannot GET /"）
- ✅ **OpenAPI 規格可下載**（/openapi.json）
- ⚠️ **Swagger UI 在 Vercel 上有限制**（使用外部工具替代）

這是 serverless 環境的常見限制，推薦使用外部 Swagger Editor 或 Postman 進行 API 測試和文件查看。
