# 系統設計文件 (SDD) - V2 後端身分驗證與群組權限架構重構

## 1. 背景與重構目標

因應前端架構調整，我們已經將前端的狀態管理從依賴瀏覽器的 `localStorage` 全面轉移到記憶體 (In-Memory) 與路由參數 (URL Parameters)。此舉是為了避免舊有資料殘留導致的狀態異常。

為了配合前端的進步，後端系統必須同步提升安全層級與驗證機制的嚴謹度。本次重構的主要目標包含：

- **消除前端對 LocalStorage 的依賴漏洞**：防止 XSS 跨站腳本攻擊竊取使用者的 JWT Token。
- **嚴格的資源權限隔離 (Tenant Isolation)**：確保使用者無法透過篡改前端參數越權存取不屬於自己的群組資料 (Insecure Direct Object References, IDOR)。
- **建立現代化的 RESTful API 規範**：將群組概念整合至資源路徑中，提升 API 的直覺性與發展性。

## 2. 架構變更摘要

### 2.1 廢除 Header 驗證 (Deprecate Custom Headers)

**現狀**：後端依賴 `X-User-Id` 或 `X-Group-Id` 等自定義 Header 來判斷使用者目前操作的冰箱/群組。
**變更**：全面廢除這些自定義 Header。因為由前端手動攜帶群組 ID 容易被偽造與竄改。

### 2.2 導入路徑參數驗證 (Route-based Authorization)

**變更**：所有的冰箱 / 群組相關 API 操作，都必須將 `groupId` 變成 API URL 的一部份 (例如：`/api/v2/groups/{groupId}/inventory`)。後端從路徑取得資源目標，並結合 JWT 中解析出的 `userId` 進行交叉授權比對。

### 2.3 JWT 儲存機制轉換 (Cookie-based Authentication)

**變更**：後端在登入成功時，不再將 JWT Token 放在 JSON Response Body 中讓前端自己存，而是透過 `Set-Cookie` Header 設定一個帶有 `HttpOnly` 屬性的 Cookie。瀏覽器會自動在後續的請求中夾帶此 Cookie。

## 3. 詳細實作規範

### 3.1 API 路徑設計規範

**所有與群組相關的端點 (Endpoints) 皆需加上 `groupId` 作為前綴**：

- ❌ (舊) `GET /api/v2/inventory` (透過 Header `X-Group-Id` 決定冰箱)
- ✅ (新) `GET /api/v2/groups/{groupId}/inventory`
- ❌ (舊) `POST /api/v2/shopping-lists`
- ✅ (新) `POST /api/v2/groups/{groupId}/shopping-lists`

### 3.2 登入與登出流程修改 (Cookie Management)

當使用者成功驗證身分後，後端必須進行以下 Cookie 設定：

```javascript
// 登入成功時的 Controller 實作範例
const token = generateJWT(user.id);

res.cookie('token', token, {
  httpOnly: true, // 禁止 JavaScript (如 document.cookie) 存取
  secure: process.env.NODE_ENV === 'production', // 生產環境需使用 HTTPS
  sameSite: 'strict', // 防止跨站請求偽造 (CSRF)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 例如：設定 7 天過期
});

res.status(200).json({ status: true, message: '登入成功' });
```

```javascript
// 新增登出 Endpoint: POST /api/v2/auth/logout
res.clearCookie('token', {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
});

res.status(200).json({ status: true, message: '登出成功' });
```

### 3.3 驗證 Middleware 修改 (`authMiddleware`)

驗證 Middleware 需修改解析 Token 的來源：

```javascript
// authMiddleware 範例
const token = req.cookies.token; // 由 Cookie 取得，捨棄 req.headers.authorization

if (!token) {
  return res.status(401).json({ error: '未授權的存取' });
}

// 驗證 JWT 並掛載 userId 至 req.user
const decoded = jwt.verify(token, process.env.JWT_SECRET);
req.user = decoded;
next();
```

### 3.4 群組權限驗證 Middleware (`verifyGroupMembership`)

對所有 `/groups/{groupId}/*` 的路由，必須套用專屬的權限驗證 Middleware。

**實作邏輯 (虛擬碼)：**

1. 確保 `req.user.id` 已由上一層 `authMiddleware` 解析出來。
2. 從路徑參數取得 `req.params.groupId`。
3. 查詢資料庫：`SELECT role FROM group_members WHERE user_id = ? AND group_id = ?`。
4. **驗證失敗**：如果查無紀錄，回傳 `403 Forbidden` (代表使用者企圖越權存取別人的冰箱)。
5. **進階驗證** (選用)：如果該操作需要管理員權限 (例如刪除整個群組)，則進一步判斷 `role === 'ADMIN'`。
6. 將群組角色掛載到 `req.groupRole` 供後續 Controller 使用，然後呼叫 `next()`。

### 3.5 CSRF 防護機制導入

既然使用了自動夾帶的 Cookie，就必須預防 CSRF (Cross-Site Request Forgery)。

1. **CSRF Token 發放**：前端啟動時，打一支 Endpoint `GET /api/v2/auth/csrf-token`，後端回傳一組隨機產生且綁定目前 Session/JWT 的 Token。
2. **Double-Submit Cookie 或 Header 驗證**：前端在執行 `POST`, `PUT`, `DELETE`, `PATCH` 操作時，必須在 Header 夾帶 `X-CSRF-Token`。
3. **驗證 Middleware**：後端比對 Header 中的 CSRF Token 是否有效。不匹配則回傳 `403 Forbidden`。

## 4. 前端配合事項與修改盤點

後端上線此變更時，前端需要同時部署以下修改：

1. **設定 axios / fetch 的 credentials**：所有的 API 請求必須將 `withCredentials` 設為 `true`，瀏覽器才會允許自動發送 Cookie。
2. **移除舊 Token 邏輯**：登入時不再從 Response Body 儲存 Token 到 `localStorage`；呼叫 API 時也不再手動設置 `Authorization: Bearer <token>`。
3. **API URL 動態組合**：全面使用 `identity.getGroupId()` 獲取的 ID 來組成對後端的路徑（已在本次重構中完成 `activeGroupSlice` 的處理）。
4. **實作 CSRF Token 攔截器 (Interceptor)**：為非 GET 的請求自動加上 `X-CSRF-Token` Header。

## 5. 驗證與安全性測試計畫

後端實作完成後，請依循以下情境進行測試：

- **越權測試 (IDOR)**：建立兩個群組 A 與 B，使用群組 A 成員的帳號，發送 API 請求到 `.../groups/B/inventory`，確保系統回傳 `403 Forbidden` 且未洩漏 B 群組資料。
- **XSS 防護測試**：在瀏覽器 console 輸入 `document.cookie`，驗證 JWT token 沒有被印出來 (HttpOnly 發揮作用)。
- **CSRF 防護測試**：拔除或竄改 Request 中的 `X-CSRF-Token` Header，對 `POST .../shopping-lists` 放行請求，確保系統回傳 `403 Forbidden` 阻斷。
- **憑證無效測試**：攜帶過期或錯誤的 Cookie，確保系統正確回傳 `401 Unauthorized` 並阻止繼續執行。
