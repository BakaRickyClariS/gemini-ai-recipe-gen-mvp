# FuFood v2 API 前端對接文件

> Base URL: `/api/v2`
> 認證方式：`Authorization: Bearer <access_token>` (HttpOnly Cookie)

---

## 認證 Auth

### `POST /auth/line/init` — LINE OAuth 授權頁

回傳 `200 OK` 帶有 `{ authUrl: "..." }`，前端自行轉導。

### `GET /auth/line/callback?code=xxx` — LINE OAuth Callback

驗證 code → 簽發 JWT → 設定 HttpOnly Cookie

**Response:**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "displayName": "..." },
    "accessToken": "...",
    "refreshToken": "..."
  }
}
```

### `POST /auth/refresh` — 刷新 Token

**Body:** `{ "refreshToken": "..." }` (或 Cookie)

### `POST /auth/logout` — 登出

清除後端 Cookie。

### `POST /auth/register` — Email 註冊

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "displayName": "User Name"
}
```

### `POST /auth/login` — Email 登入

**Body:**

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### `GET /auth/me` — 取得當前使用者 🔒

---

## 個人檔案 Profile

### `GET /profile` — 取得個人檔案 🔒

### `PUT /profile` — 更新個人檔案 🔒

**Body:**

```json
{
  "displayName": "新名稱",
  "email": "user@example.com",
  "avatar": "https://...",
  "gender": "male",
  "preferences": ["素食", "低醣"]
}
```

---

## 群組 Groups

### `GET /groups` — 列出我的群組 🔒

### `GET /groups/:id` — 群組詳情 🔒

### `POST /groups` — 建立群組 🔒

**Body:** `{ "name": "家庭冰箱" }`

### `PUT /groups/:id` — 更新群組名稱 🔒 (owner only)

**Body:** `{ "name": "新名稱" }`

### `DELETE /groups/:id` — 刪除群組 🔒 (owner only)

### `GET /groups/:id` — 群組詳情 (含成員列表) 🔒

### `POST /groups/:id/invitations` — 建立邀請連結 🔒

**Body:** `{ "expiresAt": "2025-12-31T23:59:59Z" }` (optional)

**Response:**

```json
{
  "success": true,
  "data": {
    "token": "uuid-invitation-token",
    "groupId": "...",
    "expiresAt": "..."
  }
}
```

### `GET /invitations/:token` — 查看邀請資訊 (🔓 公開)

### `POST /groups/join` — 加入群組 🔒

**Body:** `{ "invitationToken": "uuid-token" }`

### `DELETE /groups/:id/members/:userId` — 移除成員 🔒 (owner)

### `DELETE /groups/:id/leave` — 離開群組 🔒

---

## 購物清單 Shopping Lists

### `GET /groups/:groupId/shopping-lists` — 列出群組購物清單 🔒

### `POST /groups/:groupId/shopping-lists` — 建立購物清單 🔒

**Body:**

```json
{
  "title": "週末採購",
  "startsAt": "2025-03-01T10:00:00Z",
  "enableNotifications": true,
  "coverPhotoPath": "https://..."
}
```

### `GET /shopping-lists/:id` — 購物清單詳情（含 items）🔒

### `PUT /shopping-lists/:id` — 更新購物清單 🔒

### `DELETE /shopping-lists/:id` — 刪除購物清單 🔒

### `GET /shopping-lists/:id/items` — 列出項目 🔒

### `POST /shopping-lists/:id/items` — 新增項目 🔒

**Body:**

```json
{
  "name": "雞蛋",
  "quantity": 2,
  "unit": "盒",
  "photoPath": "https://..."
}
```

### `PUT /shopping-list-items/:itemId` — 更新項目 🔒

**Body:** `{ "name": "有機雞蛋", "isChecked": true }`

### `DELETE /shopping-list-items/:itemId` — 刪除項目 🔒

---

## 訂閱推播 Subscriptions

### `POST /subscriptions` — 註冊推播 🔒

**Body:**

```json
{
  "endpoint": "https://fcm.googleapis.com/fcm/send/...",
  "keys": {
    "p256dh": "...",
    "auth": "..."
  }
}
```

### `DELETE /subscriptions` — 取消推播 🔒

**Body:** `{ "endpoint": "https://..." }`

---

## 共用回應格式

### 成功

```json
{ "success": true, "data": { ... } }
```

### 錯誤

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Group not found"
  }
}
```

### 驗證錯誤

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "path": ["name"], "message": "Required" }]
  }
}
```

### HTTP 狀態碼

| Code | 用途                |
| ---- | ------------------- |
| 200  | 成功                |
| 201  | 建立成功            |
| 204  | 刪除成功（無內容）  |
| 400  | 請求格式錯誤        |
| 401  | 未認證 / Token 過期 |
| 403  | 無權限              |
| 404  | 資源不存在          |
| 422  | 驗證失敗            |
| 429  | Rate limit          |
| 500  | 伺服器錯誤          |

---

## 名稱對照表（.NET → v2）

| .NET 原名                  | v2 名稱                    | 備註         |
| -------------------------- | -------------------------- | ------------ |
| Refrigerator               | Group                      | 更通用的概念 |
| RefrigeratorMember         | GroupMember                | —            |
| InviteLink                 | Invitation                 | —            |
| Subscription (POST/DELETE) | Subscription (POST/DELETE) | 結構不變     |
