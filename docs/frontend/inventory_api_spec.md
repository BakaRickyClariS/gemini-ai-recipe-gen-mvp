**版本**: v2.3（參考 `src/modules/API_REFERENCE_V2.md`）  
**最後更新**: 2025-12-13  
**涵蓋範圍**: Inventory（庫存管理）＋Foods（食材主檔）模組

---

## 1. 基本規則

### 1.1 認證（Authentication）

- **Access Token**: Header `Authorization: Bearer <access_token>`（或 httpOnly Cookie）
- **Refresh Token**: **必須** 存在 httpOnly Cookie 以確保安全
- **Cookie 建議**: `Secure`（HTTPS）+ `SameSite=Strict`

### 1.2 Base URL

### 1.2 Base URL

```
/api/v1
```

> **注意**: Inventory 相關路由主要基於 `/refrigerators/{refrigeratorId}/inventory`。


### 1.3 標準成功／錯誤狀態碼

**成功（Success）**:

| 狀態碼          | 描述     | 常見使用場景                   |
| :-------------- | :------- | :----------------------------- |
| **200 OK**      | 請求成功 | 一般查詢、更新、刪除，含在本頁 |
| **201 Created** | 建立成功 | 新增資料                       |

**成功回應封裝格式**（統一封套，`message` 可選，核心放在 `data`）:

```json
{
  "status": true,
  "message": "可選提示",
  "data": {
    /* payload，依照 API 定義 */
  }
}
```

**錯誤（Error）**: 統一錯誤回應

```json
{
  "code": "ERROR_CODE",
  "message": "錯誤描述訊息",
  "details": {
    "field": "錯誤欄位",
    "issue": "原因描述"
  },
  "timestamp": "2024-12-07T10:00:00Z"
}
```

| 狀態碼                        | 描述         | 常見使用場景     |
| :---------------------------- | :----------- | :--------------- |
| **400 Bad Request**           | 請求參數錯誤 | 缺欄位或格式錯誤 |
| **401 Unauthorized**          | 未授權       | Token 無效或缺失 |
| **403 Forbidden**             | 禁止存取     | 已登入但無權限   |
| **404 Not Found**             | 找不到資源   | 路由或 ID 不存在 |
| **422 Unprocessable Entity**  | 驗證失敗     | 例如庫存量不足   |
| **429 Too Many Requests**     | 請求過多     | 節流/流量限制    |
| **500 Internal Server Error** | 伺服器錯誤   | 系統或內部異常   |

---

## 2. 資料模型

### 2.1 FoodItem（庫存食材）

```typescript
type FoodItem = {
  id: string; // UUID
  name: string; // 食材名稱
  category: FoodCategory; // 類別（見 2.7）
  quantity: number; // 數量
  unit: FoodUnit; // 單位
  imageUrl?: string; // 圖片 URL
  purchaseDate: string; // 購買日 (YYYY-MM-DD)
  expiryDate: string; // 保存期限 (YYYY-MM-DD)
  lowStockAlert: boolean; // 是否啟用低庫存提醒
  lowStockThreshold: number; // 低庫存門檻
  notes?: string; // 備註
  groupId?: string; // 所屬群組ID（個人則為 undefined）
  createdAt: string; // ISO 8601
  updatedAt?: string; // ISO 8601
  attributes?: string[]; // 產品屬性，如 ['葉菜根莖類', '有機']
};
```

### 2.2 CategoryInfo

```typescript
type CategoryInfo = {
  id: string;
  title: string;
  count: number;
  imageUrl: string;
  bgColor: string;
  slogan: string;
  description: string[];
};
```

### 2.3 InventoryStats（庫存統計）

```typescript
type InventoryStats = {
  totalItems: number; // 總項目數
  expiredCount: number; // 已過期數
  expiringSoonCount: number; // 近期過期數（預設3天內）
  lowStockCount: number; // 低庫存數
  byCategory: Record<FoodCategory, number>; // 各分類數量
};
```

### 2.4 InventorySummary（庫存摘要）

```typescript
type InventorySummary = {
  total: number;
  expiring: number;
  expired: number;
  lowStock: number;
};
```

### 2.5 InventorySettings（庫存設定）

```typescript
type InventorySettings = {
  lowStockThreshold: number;
  expiringSoonDays: number;
  notifyOnExpiry: boolean;
  notifyOnLowStock: boolean;
  layoutType?: 'layout-a' | 'layout-b' | 'layout-c'; // 庫存版型
  categoryOrder?: string[]; // 類別顯示順序
};
```

### 2.6 EditableCategoryInfo（可編輯類別）

```typescript
type EditableCategoryInfo = {
  id: string;
  title: string;
};
```

### 2.7 Food（食材主檔）

```typescript
type Food = {
  id: string;
  name: string;
  category: string;
  defaultUnit: string;
  imageUrl?: string;
  nutritionInfo?: any;
};
```

### 2.7 FoodCategory（食材分類）

- 蔬菜類
- 調味料類
- 主食類
- 乳製品飲料
- 水果
- 肉類海鮮
- 其他

> `InventoryStatus` 支援：`normal` / `low-stock` / `expired` / `expiring-soon` / `frequent`。

---

## 3. Inventory API（庫存管理）

### 3.1 取得庫存列表

- **Method**: `GET`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory`

- **Query Params**: `groupId?`, `category?`, `status? (expired | expiring-soon | low-stock | frequent | normal)`, `include? (summary,stats)`, `page?`, `limit?`
- **Success Response**:
  ```json
  {
    "status": true,
    "data": {
      "items": [
        /* FoodItem */
      ],
      "total": 100,
      "stats": {
        /* InventoryStats，若 include=stats */
      },
      "summary": {
        /* InventorySummary，若 include=summary */
      }
    }
  }
  ```

### 3.2 取得單筆食材

- **Method**: `GET`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory/{id}`

- **Success Response**:
  ```json
  {
    "status": true,
    "data": {
      "item": {
        /* FoodItem */
      }
    }
  }
  ```

### 3.3 新增食材

- **Method**: `POST`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory`

- **Request Body**: `AddFoodItemRequest` (`Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>`)
- **Success Response**:
  ```json
  {
    "status": true,
    "message": "Created successfully",
    "data": { "id": "new-uuid" }
  }
  ```

### 3.4 更新食材

- **Method**: `PUT`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory/{id}`

- **Request Body**: `UpdateFoodItemRequest` (`Partial<Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>>`)
- **Success Response**:
  ```json
  {
    "status": true,
    "message": "Updated successfully",
    "data": { "id": "<id>" }
  }
  ```

### 3.5 刪除食材

- **Method**: `DELETE`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory/{id}`

- **Success Response**:
  ```json
  { "status": true, "message": "Deleted successfully" }
  ```

### 3.6 批次操作

- **Batch Add**（暫緩）
  - **Method**: `POST`
  - **Path**: `/api/v1/inventory/batch`
  - **Request Body**: `BatchAddInventoryRequest` (`{ "items": [Omit<FoodItem, 'id' | 'createdAt' | 'updatedAt'>] }`)
  - **Success Response**: `{ "status": true, "message": "Created successfully" }`

- **Batch Update**（暫緩）
  - **Method**: `PUT`
  - **Path**: `/api/v1/inventory/batch`
  - **Request Body**: `BatchUpdateInventoryRequest` (`{ "items": [Partial<FoodItem> (需包含 id)] }`)
  - **Success Response**: `{ "status": true, "message": "Updated successfully" }`

- **Batch Delete**（可選）
  - **Method**: `DELETE`
  - **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory/batch`

  - **Request Body**: `BatchDeleteInventoryRequest` (`{ "ids": ["id1", "id2"] }`)
  - **Success Response**: `{ "status": true, "message": "Deleted successfully" }`

### 3.7 取得庫存統計（含 include=stats）

- **Method**: `GET`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory`

- **Query Params**: `groupId?`, `include=stats`, `limit?`（可設小值避免大量資料）
- **Success Response**:
  ```json
  {
    "status": true,
    "data": {
      "items": [
        /* 可選，若 limit=1 可最小化 */
      ],
      "total": 100,
      "stats": {
        /* InventoryStats */
      }
    }
  }
  ```

### 3.8 取得分類列表

- **Method**: `GET`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory/categories`

- **Success Response**:
  ```json
  {
    "status": true,
    "data": {
      "categories": [
        /* CategoryInfo */
      ]
    }
  }
  ```

### 3.9 取得庫存摘要

- **Method**: `GET`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory/summary`（或 `include=summary` 隨列表取得）

- **Success Response**:
  ```json
  {
    "status": true,
    "data": {
      "summary": {
        /* InventorySummary */
      }
    }
  }
  ```

### 3.10 過期/常用清單（以 status 篩選）

- **Method**: `GET`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory`

- **Query Params**:
  - 過期：`status=expired`，`page?`, `limit?`
  - 常用：`status=frequent`，`limit?`
- **Success Response**（同 3.1）:

  ```json
  {
    "status": true,
    "data": {
      "items": [
        /* FoodItem */
      ],
      "total": 42
    }
  }
  ```

- ### 3.11 庫存設定

- **GET** `/api/v1/refrigerators/{refrigeratorId}/inventory/settings`: 取得設定
  - **Success Response**:
    ```json
    {
      "status": true,
      "data": {
        "settings": {
          /* InventorySettings */
        }
      }
    }
    ```
- **PUT** `/api/v1/refrigerators/{refrigeratorId}/inventory/settings`: 更新設定

  - **Request Body**: `UpdateInventorySettingsRequest`
    ```typescript
    type UpdateInventorySettingsRequest = Partial<InventorySettings> & {
      categories?: EditableCategoryInfo[]; // 可更新類別名稱與順序
    };
    ```
  - **Success Response**:
    ```json
    {
      "status": true,
      "message": "Updated successfully",
      "data": {
        "settings": {
          /* InventorySettings */
        }
      }
    }
    ```

---

### 3.12 消耗食材

消耗指定庫存食材，扣減數量並記錄消耗原因。

- **Method**: `POST`
- **Path**: `/api/v1/refrigerators/{refrigeratorId}/inventory/{id}/consume`

- **Request Body**:
  ```json
  {
    "quantity": 1,
    "reasons": ["recipe_consumption", "short_shelf"],
    "customReason": "保存期限快到了"
  }
  ```

**請求欄位說明**:

| 欄位           | 類型                | 必填 | 說明                                     |
| :------------- | :------------------ | :--: | :--------------------------------------- |
| `quantity`     | number              |  ✅  | 消耗數量                                 |
| `reasons`      | ConsumptionReason[] |  ✅  | 消耗原因陣列（可多選）                   |
| `customReason` | string              |  ❌  | 自訂原因文字（當 reasons 包含 'custom'） |

**ConsumptionReason 值**:

| 值                   | 說明         |
| :------------------- | :----------- |
| `recipe_consumption` | 食譜消耗     |
| `duplicate`          | 重複購買     |
| `short_shelf`        | 保存時間太短 |
| `bought_too_much`    | 買太多       |
| `custom`             | 自訂         |

- **Success Response (200)**:

  ```json
  {
    "status": true,
    "message": "Consumed successfully",
    "data": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "remainingQuantity": 2,
      "consumedAt": "2025-12-27T10:00:00Z"
    }
  }
  ```

- **回應欄位說明**:

| 欄位                | 類型   | 說明                                           |
| :------------------ | :----- | :--------------------------------------------- |
| `id`                | string | 食材 ID                                        |
| `remainingQuantity` | number | 剩餘數量（若為 0，後端可選擇保留或刪除該食材） |
| `consumedAt`        | string | 消耗時間 (ISO 8601)                            |

- **錯誤回應**:

| 狀態碼 | 代碼      | 說明               |
| :----- | :-------- | :----------------- |
| 400    | `INV_001` | 缺少 quantity 欄位 |
| 400    | `INV_002` | quantity 超過庫存  |
| 401    | `INV_003` | 未授權             |
| 404    | `INV_004` | 找不到該食材       |

---

## 4. Foods API（食材主檔）

### 4.1 取得食材清單（以 category 查詢）

- **Method**: `GET`
- **Path**: `/api/v1/foods`
- **Query**: `category?`
- **Success Response**:
  ```json
  {
    "status": true,
    "data": {
      "items": [
        /* Food */
      ]
    }
  }
  ```

### 4.2 取得單一食材

- **Method**: `GET`
- **Path**: `/api/v1/foods/{id}`
- **Success Response**:
  ```json
  {
    "status": true,
    "data": {
      "food": {
        /* Food */
      }
    }
  }
  ```

### 4.3 新增食材主檔

- **Method**: `POST`
- **Path**: `/api/v1/foods`
- **Request Body**: `Omit<Food, 'id'>`
- **Success Response**:
  ```json
  {
    "status": true,
    "message": "Created successfully",
    "data": {
      "food": {
        /* Food */
      }
    }
  }
  ```

### 4.4 更新食材主檔

- **Method**: `PUT`
- **Path**: `/api/v1/foods/{id}`
- **Request Body**: `Partial<Food>`
- **Success Response**:
  ```json
  {
    "status": true,
    "message": "Updated successfully",
    "data": {
      "food": {
        /* Food */
      }
    }
  }
  ```

### 4.5 刪除食材主檔

- **Method**: `DELETE`
- **Path**: `/api/v1/foods/{id}`
- **Success Response**:
  ```json
  { "status": true, "message": "Deleted successfully" }
  ```
