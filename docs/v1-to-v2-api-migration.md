# FuFood API V1 到 V2 升級完整對照表 🚀

這份文件詳細列出了所有 V1 (.NET) 時期的 API 與目前最新的 V2 API 的核心差異，以及欄位名稱的 mapping，方便前端全面檢查對接狀態。

---

## 🔑 1. 核心結構與認證改變

| 項目             | V1 (.NET 舊版)                 | V2 (最新版 Node.js)             | 說明                                                                                   |
| ---------------- | ------------------------------ | ------------------------------- | -------------------------------------------------------------------------------------- |
| **Base URL**     | `/api` 或 `/api/v1`            | `/api/v2`                       | 除了 AI 路由仍有 v1 外，其餘盡量使用 v2。                                              |
| **認證方式**     | `x-user-id`, `x-group` Headers | `Authorization: Bearer <token>` | V2 **全面廢棄** `x-user-id` 頭部，統一由 JWT Token 解析身分。                          |
| **頂層資源名稱** | `Refrigerator` (冰箱)          | `Group` (群組)                  | V2 底層將冰箱概念抽象化為群組。                                                        |
| **資源 ID 鍵名** | `refrigeratorId`               | `groupId`                       | **[重要]** 這是最常出錯的地方，請將 URL 或 Body 中的 `refrigeratorId` 改為 `groupId`。 |

---

## 👨‍👩‍👦 2. 群組 (Groups / 舊 冰箱)

| V1 路由                               | V2 路由                                | 欄位/行為差異                                                   |
| ------------------------------------- | -------------------------------------- | --------------------------------------------------------------- |
| `GET /api/refrigerators`              | `GET /api/v2/groups`                   | Payload 結構簡化，直接回傳 `success`, `data` 包裝。             |
| `POST /api/refrigerators`             | `POST /api/v2/groups`                  | 建立時欄位皆為 `name`。                                         |
| `PUT /api/refrigerators/{id}`         | `PUT /api/v2/groups/{id}`              | -                                                               |
| `GET /api/refrigerators/{id}`         | `GET /api/v2/groups/{id}`              | 回傳物件中將包含 `members`。                                    |
| `POST /api/refrigerators/{id}/invite` | `POST /api/v2/groups/{id}/invitations` | V1 回傳 `inviteLink`；V2 回傳 `token` 與過期時間。              |
| `POST /api/refrigerators/join`        | `POST /api/v2/groups/join`             | V1 body: `{ inviteCode }`；**V2 body: `{ invitationToken }`**。 |

---

## 🥩 3. 庫存管理 (Inventory)

| V1 路由 (`refrigeratorId`)               | V2 路由 (`groupId`)                                        | 欄位/行為差異                                                   |
| ---------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------- |
| `GET /api/refrigerators/{id}/inventory`  | `GET /api/v2/groups/{groupId}/inventory`                   | URL 路徑變更。                                                  |
| `POST /api/refrigerators/{id}/inventory` | `POST /api/v2/groups/{groupId}/inventory`                  | **[新增]** V2 接受 `imageUrl`, `storageType`, `expiryDate` 等。 |
| `PUT /api/inventory/{itemId}`            | `PUT /api/v2/groups/{groupId}/inventory/{itemId}`          | URL 須包含 `groupId` 來做到權限隔離。                           |
| `DELETE /api/inventory/{itemId}`         | `DELETE /api/v2/groups/{groupId}/inventory/{itemId}`       | URL 須包含 `groupId`。                                          |
| `POST /api/inventory/{itemId}/consume`   | `POST /api/v2/groups/{groupId}/inventory/{itemId}/consume` | V1 body 可能為數字；**V2 body: `{ quantity, reasons: [] }`**。  |

### 🛑 庫存欄位對照 (Payload/Response)

| V1 欄位名                 | V2 欄位名     | 狀態                                                   |
| ------------------------- | ------------- | ------------------------------------------------------ |
| `refrigeratorId`          | `groupId`     | 🟢 變更                                                |
| `photoUrl` / `photo_path` | `imageUrl`    | 🟢 變更 (請傳 `imageUrl`)                              |
| `location`                | `storageType` | 🟢 變更 (值限 `"fridge"`, `"freezer"`, `"pantry"`)     |
| `is_opened`               | `isOpened`    | 🟢 強制為 camelCase (在 Response 中統一回傳 camelCase) |
| (自定義單位)              | `unit`        | 🟡 相同                                                |

---

## 🛒 4. 購物清單 (Shopping Lists)

| V1 路由                                       | V2 路由                                        | 欄位/行為差異                                                |
| --------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| `GET /api/refrigerators/{id}/shopping-lists`  | `GET /api/v2/groups/{groupId}/shopping-lists`  | URL 變更。                                                   |
| `POST /api/refrigerators/{id}/shopping-lists` | `POST /api/v2/groups/{groupId}/shopping-lists` | V1: `refrigeratorId` 放在 Body；**V2: `groupId` 放在 URL**。 |
| `POST /api/shopping-lists/{listId}/items`     | `POST /api/v2/shopping-lists/{listId}/items`   | -                                                            |
| `PUT /api/shopping-list-items/{itemId}`       | `PUT /api/v2/shopping-list-items/{itemId}`     | V2 新增 `z.coerce` 可容忍字串數字 (`"0"` 可過)。             |

### 🛑 購物清單欄位對照 (Payload/Response)

| V1 欄位名        | V2 欄位名                              | 狀態                                                     |
| ---------------- | -------------------------------------- | -------------------------------------------------------- |
| `refrigeratorId` | `groupId` (若 Response 有)             | 🟢 變更                                                  |
| `photoUrl`       | `coverPhotoPath` (清單層級)            | 🟢 變更                                                  |
| `photo_path`     | `photoPath` 或 `photo_path` (項目層級) | 🟡 V2 皆接受放行，Response 回傳 `photoPath`              |
| `is_checked`     | `isChecked`                            | 🟢 變更 (必須以此命名，且可容忍 `'true'`/`'false'` 字串) |

---

## 🔔 5. 通知 (Notifications)

| V1 路由                             | V2 路由                            | 欄位/行為差異                                                                                 |
| ----------------------------------- | ---------------------------------- | --------------------------------------------------------------------------------------------- |
| `POST /api/notifications/fcm-token` | `POST /api/v2/notifications/token` | 路由改變！身分認證改由 JWT 判斷。                                                             |
| `GET /api/notifications`            | `GET /api/v2/notifications`        | V2 回傳結構新增 `action` 夾帶原始 payload，提供 `actorName`, `groupName` 於外層方便前端顯示。 |

### 🛑 通知列表 Response 對照

V2 前端讀取通知時，回傳的 JSON 結構已經重新統整為更容易顯示的格式。
| V1 / 資料庫欄位 | V2 Response 呈現 | 說明 |
| --- | --- | --- |
| `action_payload` (JSON String) | `action.payload` | V2 回傳時自動幫你嘗試 Parse 或是以外層額外提供名字。 |
| (需查詢關聯) | `actorName` | 觸發此通知的使用者名稱（例如：「老婆」）。 |
| `refrigerator_name` | `groupName` | 發生事件的群組名稱（例如：「我們家冰箱」）。 |
| `is_read` | `isRead` | 將轉為 camelCase。 |

---

## 🖼️ 6. 媒體資源 (Media)

| V1 路由                     | V2 路由                     | 欄位/行為差異                                   |
| --------------------------- | --------------------------- | ----------------------------------------------- |
| `POST /api/v1/media/upload` | `POST /api/v2/media/upload` | **強烈建議改用 v2**，v1 先前有 route 衝突 BUG。 |

### 🛑 上傳欄位對照

| V1 欄位名        | V2 欄位名 | 狀態                                            |
| ---------------- | --------- | ----------------------------------------------- |
| `image` / `file` | `file`    | 🟢 確定使用 `file` 鍵名 (multipart/form-data)。 |

---

## 總結最容易踩坑的點 🧨

1. **`refrigeratorId` 變成 `groupId`**: 這個改動涵蓋了幾乎所有的 path parameters（像是 `/groups/:groupId/inventory`）以及任何 Request Body 裡原本出現過的的地方。
2. **圖片欄位命名分歧**: 庫存 (Inventory) 叫 `imageUrl`；購物清單 (Shopping Lists) 的封面叫 `coverPhotoPath`、項目圖片叫 `photoPath`。前端介接時請特別留意。
3. **蛇形命名 (snake_case) 轉駝峰 (camelCase)**: V2 在 Response 時統一轉為駝峰式 (例：`isOpened`, `isChecked`, `createdAt`, `updatedAt`)。送出 Request 時也請盡量使用駝峰。
