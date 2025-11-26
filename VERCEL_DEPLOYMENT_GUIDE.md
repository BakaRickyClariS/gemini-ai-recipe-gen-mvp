# Vercel 部署指南

## 📋 問題診斷

原先的 Vercel 部署失敗，主要原因：

1. ❌ `vercel.json` 缺少 `builds` 配置
2. ❌ `dist/` 資料夾被 `.gitignore` 忽略，導致 Vercel 沒有編譯後的檔案
3. ❌ Express app 沒有正確導出給 Vercel serverless function 使用

## ✅ 已完成的修改

### 1. 修改 `vercel.json`

根據 [此參考文章](https://dev.to/tirthpatel/deploy-node-ts-express-typescript-on-vercel-284h)，添加了必要的 `builds` 配置：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "dist/index.js",
      "use": "@vercel/node",
      "config": {
        "includeFiles": ["dist/**"]
      }
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "dist/index.js"
    }
  ]
}
```

**說明：**
- `builds` 告訴 Vercel 使用 `@vercel/node` 處理 `dist/index.js`
- `includeFiles` 確保整個 `dist/**` 資料夾都被包含
- `routes` 將所有請求路由到編譯後的 `dist/index.js`

### 2. 修改 `src/index.ts`

在檔案末尾添加：

```typescript
// 本地開發時啟動伺服器
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📚 Swagger UI at http://localhost:${PORT}/docs`);
  });
}

// 導出 app 供 Vercel serverless function 使用
export default app;
```

**說明：**
- 本地開發時（`NODE_ENV !== 'production'`）仍會啟動 HTTP 伺服器
- 在 Vercel 上則使用 `export default app`，讓 Vercel 可以將 Express app 作為 serverless function 執行

### 3. 修改 `.gitignore`

註解掉 `dist/` 這一行：

```gitignore
# Build output (移除 dist/ 以便 Vercel 部署)
# dist/
```

**說明：**
- Vercel 需要編譯後的 JavaScript 檔案才能執行
- 因此 `dist/` 資料夾需要提交到 Git

### 4. 建置專案

執行：
```bash
npm run build
```

成功產生 `dist/` 資料夾，內含：
- `dist/index.js`
- `dist/debug-gemini.js`
- `dist/models/`
- `dist/services/`

## 🚀 部署步驟

### 步驟 1：提交變更到 Git

```bash
git add .
git commit -m "修正 Vercel 部署配置：添加 builds、導出 app、包含 dist 資料夾"
git push origin main
```

> **重要：** 確保 `dist/` 資料夾已被提交！

### 步驟 2：在 Vercel 重新部署

有兩種方式：

#### 方式 A：自動部署（推薦）
推送到 Git 後，Vercel 會自動偵測並重新部署

#### 方式 B：手動觸發
1. 登入 [Vercel Dashboard](https://vercel.com/dashboard)
2. 找到您的專案
3. 點擊 **Deployments** 標籤
4. 點擊最新部署右側的 **...** 選單
5. 選擇 **Redeploy**

### 步驟 3：設定環境變數

確保在 Vercel 專案設定中添加以下環境變數：

1. 到 Vercel Dashboard → 您的專案 → **Settings** → **Environment Variables**
2. 添加：
   - `GEMINI_API_KEY`：您的 Google Gemini API 金鑰
   - `NODE_ENV`：設為 `production`

### 步驟 4：確認部署成功

部署完成後，訪問以下端點測試：

1. **健康檢查：** `https://your-app.vercel.app/health`
   - 應回傳：`{"status": "✅ 食譜 API 運行正常", ...}`

2. **狀態檢查：** `https://your-app.vercel.app/status`
   - 應回傳：記憶體使用、運行時間等資訊

3. **API 文件：** `https://your-app.vercel.app/docs`
   - 應顯示 Swagger UI

## 🔍 常見問題排除

### 問題 1：部署後出現 404 錯誤

**可能原因：** `dist/` 資料夾沒有被提交到 Git

**解決方式：**
```bash
# 確認 dist/ 已在 Git 追蹤中
git status

# 如果沒有，手動添加
git add dist/
git commit -m "添加 dist 資料夾用於 Vercel 部署"
git push
```

### 問題 2：環境變數錯誤

**可能原因：** Vercel 上的環境變數未設定

**解決方式：**
- 到 Vercel Dashboard → Settings → Environment Variables
- 確保所有必要的環境變數（特別是 `GEMINI_API_KEY`）都已設定
- 設定後需要重新部署

### 問題 3：Module not found 錯誤

**可能原因：** `package.json` 的依賴未正確安裝

**解決方式：**
- 確保 `package.json` 包含所有運行時依賴（不要放在 `devDependencies`）
- 重新部署讓 Vercel 重新安裝依賴

## 📚 參考資料

- [Deploy Node.js + TypeScript + Express on Vercel](https://dev.to/tirthpatel/deploy-node-ts-express-typescript-on-vercel-284h)
- [Vercel Serverless Functions](https://vercel.com/docs/functions/serverless-functions)
- [Vercel Build Configuration](https://vercel.com/docs/build-step)

## 📝 檢查清單

部署前請確認：

- [ ] `npm run build` 成功執行
- [ ] `dist/` 資料夾存在且包含編譯後的 `.js` 檔案
- [ ] `dist/` 資料夾已提交到 Git（不在 `.gitignore` 中）
- [ ] `vercel.json` 包含 `builds` 和 `routes` 配置
- [ ] `src/index.ts` 導出 `export default app`
- [ ] Vercel 環境變數已設定
- [ ] 推送到 Git 遠端儲存庫

完成以上步驟後，您的 API 應該可以在 Vercel 上正常運行！🎉
