# FuFood V2 API Payload 參考手冊 (Frontend Integration)

這份文件提供給前端作為**最即時的 V2 API Request/Response 結構與欄位參考**，解決 v1 升級到 v2 時欄位不一致的問題。

> Base URL: `/api/v2`
> 認證方式：所有需要 `🔒` 的端點都必須在 Header 中帶入 `Authorization: Bearer <access_token>`

---

## 🔑 1. 認證 (Auth)

### 登入/註冊/重新整理 Token

目前 V2 使用 HttpOnly Cookie 存放 Refresh Token，並回傳 Access Token。這部分邏輯沒有特別變化，請參考原本登入機制。

---

## 👨‍👩‍👦 2. 群組 / 冰箱 (Groups)

_註：v1 的 `refrigerator` 在 v2 全面改名為 `group`。_

### 2.1 建立群組 `POST /groups` 🔒

| Payload | 型別   | 必填 | 說明                    |
| ------- | ------ | ---- | ----------------------- |
| `name`  | string | ✅   | 群組/冰箱名稱 (max 100) |

### 2.2 更新群組名稱 `PUT /groups/:id` 🔒

| Payload | 型別   | 必填 | 說明   |
| ------- | ------ | ---- | ------ |
| `name`  | string | ✅   | 新名稱 |

---

## 🥩 3. 庫存管理 (Inventory)

_Base Route: `/groups/:groupId/inventory`_

### 3.1 新增食材 `POST /groups/:groupId/inventory` 🔒

| Payload       | 型別           | 必填 | 說明                                           |
| ------------- | -------------- | ---- | ---------------------------------------------- |
| `name`        | string         | ✅   | 食材名稱                                       |
| `quantity`    | number         | ❌   | 數量 (預設為 0 或不帶)                         |
| `unit`        | string         | ❌   | 單位 (ex: "個", "克")                          |
| `category`    | string         | ❌   | 分類 ID                                        |
| `imageUrl`    | string \| null | ❌   | 圖片網址 (v2 已修復此欄位不會存入的問題)       |
| `expiryDate`  | string \| null | ❌   | 過期日 (ISO 格式字串)                          |
| `storageType` | string         | ❌   | 存放位置 (`"fridge"`, `"freezer"`, `"pantry"`) |
| `notes`       | string         | ❌   | 備註                                           |

### 3.2 編輯食材 `PUT /groups/:groupId/inventory/:inventoryId` 🔒

| Payload       | 型別           | 必填 | 說明                                           |
| ------------- | -------------- | ---- | ---------------------------------------------- |
| `name`        | string         | ❌   | 食材名稱                                       |
| `quantity`    | number         | ❌   | 數量                                           |
| `unit`        | string         | ❌   | 單位                                           |
| `category`    | string         | ❌   | 分類 ID                                        |
| `imageUrl`    | string \| null | ❌   | 圖片網址                                       |
| `expiryDate`  | string \| null | ❌   | 過期日                                         |
| `storageType` | string         | ❌   | 存放位置 (`"fridge"`, `"freezer"`, `"pantry"`) |
| `notes`       | string         | ❌   | 備註                                           |
| `isOpened`    | boolean        | ❌   | 是否已開封                                     |

### 3.3 消耗食材 `POST /groups/:groupId/inventory/:inventoryId/consume` 🔒

| Payload    | 型別     | 必填 | 說明                    |
| ---------- | -------- | ---- | ----------------------- |
| `quantity` | number   | ✅   | 消耗數量 (必須 > 0)     |
| `reasons`  | string[] | ✅   | 消耗原因列表 (至少一項) |

### 3.4 庫存設定 `PUT` / `PATCH /groups/:groupId/inventory/settings` 🔒

| Payload             | 型別     | 必填 | 說明                                                                                     |
| ------------------- | -------- | ---- | ---------------------------------------------------------------------------------------- |
| `layoutType`        | string   | ❌   | 版型 (`"layout-a"`, `"layout-b"`, `"layout-c"`)                                          |
| `categoryOrder`     | string[] | ❌   | 分類排序陣列                                                                             |
| `categories`        | array    | ❌   | 分類詳細設定 `[{ "id": "...", "title": "...", "isVisible": true, "subCategories": [] }]` |
| `lowStockThreshold` | number   | ❌   | 低庫存警告閾值                                                                           |
| `expiringSoonDays`  | number   | ❌   | 即將過期天數                                                                             |
| `notifyOnExpiry`    | boolean  | ❌   | 是否開啟過期通知                                                                         |
| `notifyOnLowStock`  | boolean  | ❌   | 是否開啟低庫存通知                                                                       |

---

## 🛒 4. 購物清單 (Shopping Lists)

_Base Route: `/groups/:groupId/shopping-lists`_

### 4.1 建立清單 `POST /groups/:groupId/shopping-lists` 🔒

| Payload               | 型別           | 必填 | 說明                         |
| --------------------- | -------------- | ---- | ---------------------------- |
| `title`               | string \| null | ❌   | 清單標題                     |
| `coverPhotoPath`      | string \| null | ❌   | 封面圖片網址                 |
| `startsAt`            | string         | ✅   | 開始時間 (ISO Date String)   |
| `enableNotifications` | boolean        | ❌   | 是否啟用通知 (預設: `false`) |

### 4.2 更新清單 `PUT /shopping-lists/:listId` 🔒

| Payload               | 型別           | 必填 | 說明                       |
| --------------------- | -------------- | ---- | -------------------------- |
| `title`               | string \| null | ❌   | 清單標題                   |
| `coverPhotoPath`      | string \| null | ❌   | 封面圖片網址               |
| `startsAt`            | string         | ❌   | 開始時間 (ISO Date String) |
| `enableNotifications` | boolean        | ❌   | 是否啟用通知               |

### 4.3 新增清單項目 `POST /shopping-lists/:listId/items` 🔒

| Payload     | 型別            | 必填 | 說明                                                |
| ----------- | --------------- | ---- | --------------------------------------------------- |
| `name`      | string          | ✅   | 項目名稱                                            |
| `quantity`  | number / string | ❌   | 數量 (v2 自動轉型，允許字串化數字，最小為 0)        |
| `unit`      | string          | ❌   | 單位                                                |
| `photoPath` | string \| null  | ❌   | 圖片網址 (v2 接受 `photoPath` 或 `photo_path` 均可) |

### 4.4 更新/核取清單項目 `PUT /shopping-list-items/:itemId` 🔒

| Payload                       | 型別             | 必填 | 說明                   |
| ----------------------------- | ---------------- | ---- | ---------------------- |
| `name`                        | string           | ❌   | 項目名稱               |
| `quantity`                    | number / string  | ❌   | 數量                   |
| `unit`                        | string \| null   | ❌   | 單位                   |
| `photoPath`/(或) `photo_path` | string \| null   | ❌   | 圖片網址 (二選一均可)  |
| `isChecked`                   | boolean / string | ❌   | 是否買到 (v2 自動轉型) |

---

## 🔔 5. 通知 (Notifications)

_Base Route: `/notifications`_

### 5.1 更新目前 Token `POST /notifications/token` 🔒

| Payload    | 型別   | 必填 | 說明                           |
| ---------- | ------ | ---- | ------------------------------ |
| `fcmToken` | string | ✅   | Firebase Cloud Messaging Token |
| `platform` | string | ❌   | 裝置平台 (預設: `"web"`)       |

### 5.2 取得通知列表 `GET /notifications` 🔒

**Response Payload (v2)**: 之前 500 錯誤已修復。

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "category": "system",
        "type": "announcement",
        "title": "公告標題",
        "message": "內容",
        "isRead": false,
        "action": {
          "type": "link",
          "payload": "{...}" // 有時會是被 stringify 的 JSON
        },
        "createdAt": "2026-02-25T12:00:00Z",
        "groupName": "我的冰箱",
        "actorName": "傅太太"
      }
    ],
    "total": 10,
    "unreadCount": 2,
    "meta": {
      "page": 1,
      "limit": 20,
      "total": 10
    }
  }
}
```

---

## 🖼️ 6. 媒體資源 (Media Upload)

### 6.1 上傳圖片 `POST /api/v2/media/upload` 🔒

_請注意 `multipart/form-data`_
| Form Data Key | 型別 | 必填 | 說明 |
| --- | --- | --- | --- |
| `file` | FileBlob | ✅ | 圖片檔案 |
| `type` | string | ❌ | 類型 (例如 `"recipe"`, `"inventory"`) 方便後端分類 |

---

## 常見陷阱提醒 🚨

1. **`refrigeratorId` 已捨棄！** - V2 中所有路徑皆改為 `/groups/:groupId` 或是直接操作單一資源的 ID，請勿再發送 `refrigeratorId` 作為 body 參數！
2. **`imageUrl` vs `photoPath`** - 庫存 (Inventory) 中圖片是 `imageUrl`；購物清單 (Shopping Lists) 中圖片稱作 `photoPath` (也可以送 `photo_path`)。
3. **驗證格式更友善** - 原先傳入數字但送成字串（例如 `"0"`）會導致 422 報錯，現在後端均加上 `z.coerce.number()` 可自動幫前端轉型了。
