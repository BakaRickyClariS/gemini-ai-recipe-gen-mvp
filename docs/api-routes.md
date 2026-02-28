# API Routes 文件

**Base URL（本地）**：`http://localhost:3000`  
**Base URL（正式）**：`https://gemini-ai-recipe-gen-mvp.vercel.app`

---

## 認證說明

| 版本 | 認證方式                                            |
| ---- | --------------------------------------------------- |
| v1   | Cookie（`session_token`）                           |
| v2   | JWT Bearer Token（`Authorization: Bearer <token>`） |

> [!IMPORTANT]
> **認證方式異動備註**：
>
> 1. 已取消舊有的 `x-user`、`x-user-id` 與 `x-group` 等自定義 Header 認證方式。
> 2. 目前功能已逐步遷移至 v2，請統一使用 **JWT Bearer Token** 進行身分驗證。

---

## 🔐 Auth（v2）

| Method | 路徑                         | 認證   | 說明                                       |
| ------ | ---------------------------- | ------ | ------------------------------------------ |
| POST   | `/api/v2/auth/register`      | ❌     | 註冊                                       |
| POST   | `/api/v2/auth/login`         | ❌     | 登入 → 回傳 `accessToken` + `refreshToken` |
| POST   | `/api/v2/auth/line/init`     | ❌     | 取得 LINE 授權 URL → 前端 redirect         |
| GET    | `/api/v2/auth/line/callback` | ❌     | LINE OAuth callback（後端處理）            |
| POST   | `/api/v2/auth/refresh`       | ❌     | 更新 access token                          |
| GET    | `/api/v2/auth/me`            | ✅ JWT | 取得目前使用者資料                         |
| POST   | `/api/v2/auth/logout`        | ❌     | 登出                                       |

---

## 👤 Profile（v2）

| Method | 路徑              | 認證   | 說明         |
| ------ | ----------------- | ------ | ------------ |
| GET    | `/api/v2/profile` | ✅ JWT | 取得個人資料 |
| PUT    | `/api/v2/profile` | ✅ JWT | 更新個人資料 |

---

## 🧊 Inventory（v2）

> 路徑中的 `:groupId` 為冰箱（群組）ID

| Method     | 路徑                                            | 認證   | 說明         |
| ---------- | ----------------------------------------------- | ------ | ------------ |
| GET        | `/api/v2/groups/:groupId/inventory`             | ✅ JWT | 庫存列表     |
| POST       | `/api/v2/groups/:groupId/inventory`             | ✅ JWT | 新增庫存     |
| GET        | `/api/v2/groups/:groupId/inventory/:id`         | ✅ JWT | 單筆庫存     |
| PUT        | `/api/v2/groups/:groupId/inventory/:id`         | ✅ JWT | 更新庫存     |
| DELETE     | `/api/v2/groups/:groupId/inventory/:id`         | ✅ JWT | 刪除庫存     |
| POST       | `/api/v2/groups/:groupId/inventory/:id/consume` | ✅ JWT | 消耗食材     |
| GET        | `/api/v2/groups/:groupId/inventory/categories`  | ✅ JWT | 分類列表     |
| GET        | `/api/v2/groups/:groupId/inventory/summary`     | ✅ JWT | 庫存摘要     |
| GET        | `/api/v2/groups/:groupId/inventory/settings`    | ✅ JWT | 庫存設定     |
| PUT\|PATCH | `/api/v2/groups/:groupId/inventory/settings`    | ✅ JWT | 更新庫存設定 |

---

## 🔔 Notifications（v2）

| Method | 路徑                                 | 認證   | 說明                                       |
| ------ | ------------------------------------ | ------ | ------------------------------------------ |
| GET    | `/api/v2/notifications`              | ✅ JWT | 通知列表（支援 `?page=&limit=&category=`） |
| POST   | `/api/v2/notifications/token`        | ✅ JWT | 註冊 FCM Token                             |
| DELETE | `/api/v2/notifications/token`        | ✅ JWT | 移除 FCM Token                             |
| GET    | `/api/v2/notifications/settings`     | ✅ JWT | 取得通知設定                               |
| PATCH  | `/api/v2/notifications/settings`     | ✅ JWT | 更新通知設定                               |
| POST   | `/api/v2/notifications/batch-read`   | ✅ JWT | 批次標記已讀                               |
| POST   | `/api/v2/notifications/batch-delete` | ✅ JWT | 批次刪除                                   |
| POST   | `/api/v2/notifications/send`         | ✅ JWT | 發送通知（內部/管理員用）                  |

---

## 🍽️ Recipes（v1）

| Method | 路徑                  | 認證           | 說明     |
| ------ | --------------------- | -------------- | -------- |
| GET    | `/api/v1/recipes`     | ❌（optional） | 食譜列表 |
| GET    | `/api/v1/recipes/:id` | ❌             | 單筆食譜 |
| POST   | `/api/v1/recipes`     | ✅ Cookie      | 儲存食譜 |
| PUT    | `/api/v1/recipes/:id` | ✅ Cookie      | 更新食譜 |
| DELETE | `/api/v1/recipes/:id` | ✅ Cookie      | 刪除食譜 |

---

## 🤖 AI（v1）

| Method | 路徑                                | 認證           | 說明                   |
| ------ | ----------------------------------- | -------------- | ---------------------- |
| POST   | `/api/v1/ai/recipe`                 | ❌（optional） | AI 生成食譜            |
| POST   | `/api/v1/ai/recipe/stream`          | ❌（optional） | AI SSE 串流            |
| GET    | `/api/v1/ai/recipe/suggestions`     | ❌             | 建議 prompts           |
| POST   | `/api/v1/ai/analyze-image`          | ❌             | 單品影像辨識           |
| POST   | `/api/v1/ai/analyze-image/multiple` | ❌             | 多品影像辨識           |
| POST   | `/api/v1/media/upload`              | ❌             | 上傳圖片（Cloudinary） |

---

## 👥 Groups（v2）

| Method | 路徑                                   | 認證   | 說明                 |
| ------ | -------------------------------------- | ------ | -------------------- |
| GET    | `/api/v2/groups`                       | ✅ JWT | 群組列表             |
| POST   | `/api/v2/groups`                       | ✅ JWT | 建立群組             |
| GET    | `/api/v2/groups/:id`                   | ✅ JWT | 單一群組             |
| PUT    | `/api/v2/groups/:id`                   | ✅ JWT | 更新群組             |
| DELETE | `/api/v2/groups/:id`                   | ✅ JWT | 刪除群組             |
| POST   | `/api/v2/groups/:id/invitations`       | ✅ JWT | 建立邀請連結         |
| POST   | `/api/v2/groups/join`                  | ✅ JWT | 加入群組（憑 token） |
| DELETE | `/api/v2/groups/:id/members/:memberId` | ✅ JWT | 移除成員             |
| DELETE | `/api/v2/groups/:id/leave`             | ✅ JWT | 離開群組             |
| GET    | `/api/v2/invitations/:token`           | ❌     | 查詢邀請資訊         |

---

## 🛒 Shopping Lists（v2）

| Method | 路徑                                     | 認證   | 說明         |
| ------ | ---------------------------------------- | ------ | ------------ |
| GET    | `/api/v2/groups/:groupId/shopping-lists` | ✅ JWT | 群組購物清單 |
| POST   | `/api/v2/groups/:groupId/shopping-lists` | ✅ JWT | 建立清單     |
| GET    | `/api/v2/shopping-lists/:id`             | ✅ JWT | 清單詳情     |
| PUT    | `/api/v2/shopping-lists/:id`             | ✅ JWT | 更新清單     |
| DELETE | `/api/v2/shopping-lists/:id`             | ✅ JWT | 刪除清單     |
| GET    | `/api/v2/shopping-lists/:id/items`       | ✅ JWT | 清單項目     |
| POST   | `/api/v2/shopping-lists/:id/items`       | ✅ JWT | 新增項目     |
| PUT    | `/api/v2/shopping-list-items/:itemId`    | ✅ JWT | 更新項目     |
| DELETE | `/api/v2/shopping-list-items/:itemId`    | ✅ JWT | 刪除項目     |

---

## 🔔 Subscriptions（v2）

| Method | 路徑                    | 認證   | 說明     |
| ------ | ----------------------- | ------ | -------- |
| POST   | `/api/v2/subscriptions` | ✅ JWT | 訂閱通知 |
| DELETE | `/api/v2/subscriptions` | ✅ JWT | 取消訂閱 |
