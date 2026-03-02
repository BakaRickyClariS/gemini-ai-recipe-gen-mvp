# Backend QR Code 掃描登入/註冊機制規劃書

## 1. 系統目標

在 QR Code 掃描場景中，提供新舊用戶「LINE登入」與「現有電子郵件登入」兩種驗證方式。完成身分驗證後，確保前端能恢復原始掃描意圖（如加入共享清單），並符合 `security-review` 規範。

## 2. API 端點異動與新增

- **[新增] `GET /api/auth/line/login`**
  - **功能**: 生成帶有 `state` 參數的 LINE OAuth 授權 URL，並重導向（或回傳 URL 供前端跳轉）。
  - **防護 (CSRF)**: 產生隨機 `state` 並暫存於 Redis 或 Cookie，用於驗證 Callback 請求。
- **[新增] `GET /api/auth/line/callback`**
  - **功能**: 接收 LINE 回傳的 `code` 與 `state`。
  - **邏輯**:
    1. 驗證 `state` 防範 CSRF 攻擊。
    2. 以 `code` 換取 LINE Access Token，並取得使用者 Profile (含 `lineId`, `email`, `name`)。
    3. 執行新舊帳號判斷與合併邏輯（詳見第3點）。
    4. 登入成功後核發 JWT Token，並透過 `Set-Cookie` 將其設為 HttpOnly Cookie。
    5. HTTP 302 重導向至前端的成功過渡頁面（如 `https://[FRONTEND_DOMAIN]/auth/success`）。
- **[既有] `POST /api/auth/login` (Email登入)**
  - **檢查/修改**: 確定登入成功後，JWT Token 不是只放在 Response Body 讓前端存 `localStorage`，而是必須由 Server 寫入 `HttpOnly` Cookie。

## 3. 帳號綁定與註冊邏輯 (Account Linking)

在 `GET /api/auth/line/callback` 內：

1. **舊用戶 (已綁定 LINE)**: 若資料庫已存在相同的 `lineId`，直接視為登入成功。
2. **舊用戶 (未綁定 LINE，但 Email 相同)**:
   - 若 `lineId` 不存在，但取得的 `email` 在資料庫中已存在帳號。
   - **自動綁定**: 將該帳號的 `lineId` 更新為此次取得的 ID。
   - _(Optional 安全建議)_: 若 Email 未曾驗證過，自動綁定可能有信箱劫持風險，建議未來可追加密碼確認機制，但考量流暢度目前可先採自動綁定。
3. **全新用戶**: 若 `lineId` 與 `email` 均不存在，則直接建立新帳號，將 `provider` 設為 `line`。

## 4. 資料庫 Schema 支援

- `User` Schema (或對應的使用者資料表) 需確保有以下欄位庫存：
  - `lineId` (String, Unique, Nullable): 儲存 LINE 使用者唯一識別碼。
  - `provider` (String): 記錄註冊來源（如 `local`, `line`）。

## 5. 資安落實 (遵循 security-review 規範)

1. **Secrets Management**: LINE `CHANNEL_ID` 與 `CHANNEL_SECRET` 必須置於 `.env` 中，程式碼透過 `process.env` 讀取，不可硬編碼 (Hardcode)。
2. **XSS / Token 存儲**: 核發的 JWT 必須存放於 HttpOnly, Secure(正式環境), SameSite=Lax 的 Cookie 中。
3. **SQL Injection**: 查詢操作（尋找/建立 User）必須透過系統內的 ORM / Parameterized Query 進行，不可字串相加。
