# AI API 認證遷移計畫：AI Session 同步策略 (Frontend & AI Backend Only)

## 🎯 目標 (Objective)

在**不修改主後端 (Main Backend)** 且**跨網域**的前提下，實現 AI API 的 **HttpOnly Cookie** 認證，徹底移除前端 LocalStorage Token 儲存。

## 💡 核心策略：雙重 Session (Dual Session)

由於無法與主後端共享 Cookie，我們將在 AI 後端建立獨立的 Session 機制。
前端在登入時，將取得的 Token "同步" 給 AI 後端，由 AI 後端自行簽發屬於 AI 網域的 HttpOnly Cookie。

### 架構流程圖

1. **登入階段 (Login)**:
   - 前端 -> 主後端: `POST /login`
   - 主後端 -> 前端: 回傳 `User` + `Token` (以及主後端 Cookie)
   - 前端 -> AI 後端: `POST /auth/sync-session` (Payload: `{ token }`) **[新增]**
   - AI 後端: 驗證/接收 Token
   - AI 後端 -> 前端: 回傳 `200 OK` + `Set-Cookie: ai_token=...; HttpOnly`
   - 前端: **不儲存** Token 到 LocalStorage，僅保留於 Cookie 中。

2. **API 呼叫階段 (API Call)**:
   - 前端 -> AI 後端: `GET /inventory` (自動攜帶 AI 網域 Cookie)
   - AI 後端: Middleware 從 Cookie 讀取 Token 進行驗證。

3. **登出/過期階段**:
   - 前端登出時，同時呼叫主後端與 AI 後端的登出 API (清除雙邊 Cookie)。

## ⚠️ 影響範圍與端點清單 (Scope of Impact)

以下所有使用 `aiApi` 的路由端點都需要在 AI 後端套用新的 Cookie 驗證 Middleware：

### 1. 通知服務 (Notifications)

- `GET /notifications` (列表)
- `GET /notifications/:id` (詳情)
- `PATCH /notifications/:id/read` (已讀)
- `DELETE /notifications/:id` (刪除)
- `POST /notifications/read-all` (全已讀)
- `POST /notifications/batch-delete` (批次刪除)
- `POST /notifications/batch-read` (批次已讀)
- `GET /notifications/settings` (設定)
- `PATCH /notifications/settings` (更新設定)
- `POST /notifications/send` (測試發送)
- `POST /notifications/token` (FCM Token)

### 2. 庫存服務 (Inventory)

- `GET /inventory` (列表)
- `GET /inventory/summary` (摘要)
- `GET /inventory/categories` (分類)
- `GET /inventory/settings` (設定)
- `PUT /inventory/settings` (更新設定)
- `GET /inventory/:id` (單項)
- `POST /inventory` (新增)
- `PUT /inventory/:id` (更新)
- `DELETE /inventory/:id` (刪除)
- `DELETE /inventory/clear` (清空)
- `POST /inventory/consume` (消耗/減少)

### 3. AI 識別與食譜 (AI & Recipes)

- `POST /ai/analyze-image` (影像分析/OCR)
- `GET /recipes/suggestions` (食譜建議)
- `POST /recipes/generate` (生成食譜)
- `POST /recipes/:id/save` (儲存食譜)
- `GET /recipes` (已存食譜列表)
- `GET /recipes/:id` (食譜詳情)
- `PUT /recipes/:id` (更新食譜)
- `POST /files/upload` (檔案上傳)

## 🛠️ 實作細節 (Implementation Details)

### 1. AI 後端修改 (AI Backend)

需新增一個 Session 同步端點與 Cookie 設定。

- **新增 API**: `POST /auth/sync-session`
  - 接收 Body: `{ token: string }`
  - 動作: 將接收到的 Token 設定為 HttpOnly Cookie。

  ```javascript
  // Express 範例
  app.post('/auth/sync-session', (req, res) => {
    const { token } = req.body;
    // 設定 Cookie (有效期應與 Token 一致或更短)
    res.cookie('ai_token', token, {
      httpOnly: true,
      secure: true, // HTTPS
      sameSite: 'none', // 跨域需設定
      path: '/',
    });
    res.json({ success: true });
  });
  ```

- **更新 Auth Middleware**:
  - 修改驗證邏輯，優先從 `req.cookies['ai_token']` 讀取 Token。
  - **重要**：請確保上述「影響範圍」中的所有路由都經過此 Middleware。

- **更新 CORS**:
  - 必須設定 `credentials: true` 並指定前端 Origin。

### 2. 前端修改 (Frontend)

修改 `authService.ts` 的登入/註冊流程。

- **AuthService**:
  - 在 `authApi.login` 成功後，立即呼叫 `aiApi.post('/auth/sync-session', { token })`。
  - 移除所有 `identity.setAuthToken` (LocalStorage) 操作。

- **Client.ts**:
  - 設定 AI API Client `withCredentials: true`。

## 📋 執行步驟

1. **AI 後端**: 實作 `POST /auth/sync-session` 與更新 Middleware。
2. **前端**: 更新 `client.ts` 啟用 Credentials。
3. **前端**: 修改 `authService.ts` 串接同步 API。
4. **前端**: 移除 LocalStorage Token 程式碼。
