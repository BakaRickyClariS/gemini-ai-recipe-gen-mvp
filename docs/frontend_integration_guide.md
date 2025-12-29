# 前端串接整合指南 v2.0 (Frontend Integration Guide)

本文件詳列本次「資料庫正規化」與「AI 嚴格分類」更新後，所有受影響的 API 規格、Endpoint、Request/Response 格式。

---

## 1. 7 大嚴格分類 ID (Category ID Reference)

所有與「分類」相關的欄位，API **只接受以下 7 組英文 ID**。傳送中文 (如「蔬菜類」) 會導致 `500 Foreign Key Error`。

| Category ID | 預設中文標題 | 說明                   |
| :---------- | :----------- | :--------------------- |
| `fruit`     | 蔬果類       | 葉菜、根莖、水果、菇類 |
| `frozen`    | 冷凍調理類   | 水餃、雞塊、冰品       |
| `bake`      | 主食烘焙類   | 米、麵、麵包、堅果     |
| `milk`      | 乳品飲料類   | 蛋、奶、起司、飲品     |
| `seafood`   | 冷凍海鮮類   | 魚、蝦、貝類           |
| `meat`      | 肉品類       | 豬/牛/雞肉、加工肉品   |
| `others`    | 乾貨醬料類   | 醬料、油品、其他       |

---

## 2. AI 相關 API

### 2.1 多食材影像辨識 (Multiple Ingredients) ★ 本次主要更新

**Endpoint**: `POST /api/v1/ai/analyze-image/multiple`
**Method**: `multipart/form-data` 或 JSON

- **Request**:

  - `file` (FormData): 上傳的圖片檔
  - `imageUrl` (String, Optional): 圖片 URL (二擇一)
  - `cropImages` (Boolean, Default: true): 是否裁切各食材
  - `maxIngredients` (Number, Default: 10): 最多辨識項目數

- **Response**:
  ```typescript
  {
    success: true,
    data: {
      ingredients: {
        productName: string;       // "蘋果"
        category: string;          // ★ 回傳 ID: "fruit"
        attributes: string;        // "葉菜根莖類" (產品屬性/副分類，前端需包裝成 array)
        purchaseQuantity: number;  // 2 (注意：前端需 mapping 為 "quantity")
        unit: string;              // "顆"
        purchaseDate: string;      // "2025-12-29"
        expiryDate: string;        // "2026-01-15"
        lowStockAlert: boolean;
        lowStockThreshold: number;
        notes?: string;
        boundingBox: { x, y, width, height }; // 0-1 相對座標
        imageUrl?: string;         // 裁切後的圖片 URL
        confidence: number;        // 0.95
      }[];
      originalImageUrl?: string;
    },
    timestamp: string
  }
  ```
- **前端 Mapping 提醒**:
  - `purchaseQuantity` → 後端 Inventory API 欄位為 `quantity`
  - `productName` → 後端 Inventory API 欄位為 `name`
  - `attributes` → AI 回傳 `string`，Inventory API 需要 `string[]`

---

### 2.2 單一影像辨識 (Single Image)

**Endpoint**: `POST /api/v1/ai/analyze-image`
**Method**: `multipart/form-data` 或 JSON

(格式與 2.1 類似，但通常用於辨識單一物件，回傳結構略有不同，請參考舊版 Spec)

---

### 2.3 AI 食譜生成 (Generate Recipe)

**Endpoint**: `POST /api/v1/ai/recipe`

- **Request**:

  ```typescript
  {
    prompt: string;                 // "清冰箱料理"
    selectedIngredients?: string[]; // ["雞胸肉", "高麗菜"]
    excludeIngredients?: string[];
    recipeCount?: number;           // 2
    servings?: number;              // 2
    difficulty?: "簡單" | "中等" | "困難";
    category?: string;              // "日式"
  }
  ```

- **Response**:
  ```typescript
  {
    status: true,
    data: {
      greeting: string;
      recipes: {
        id: string;
        name: string;
        category: string;           // 料理類型 (日式, 台式...)
        servings: number;
        cookTime: number;
        difficulty: string;
        imageUrl: string;           // AI 生成圖
        ingredients: { name, amount, unit }[]; // 核心食材
        seasonings: { name, amount, unit }[];  // 調味料 (庫存管理可忽略)
        steps: { step, description }[];
      }[];
      remainingQueries: number;
    }
  }
  ```

---

### 2.4 AI 食譜生成 (SSE Streaming)

**Endpoint**: `POST /api/v1/ai/recipe/stream`
(Response 為 Server-Sent Events，詳見 aiRecipe 規格)

---

### 2.5 取得 AI Prompt 建議

**Endpoint**: `GET /api/v1/ai/recipe/suggestions`

- **Response**:
  ```typescript
  { status: true, data: { suggestions: string[] } }
  ```

---

## 3. 庫存管理 API (Inventory)

Base Path: `/api/v1/refrigerators/:refrigeratorId/inventory`
Headers: `X-User-Id: <userId>` (必填)

---

### 3.1 取得庫存列表

**Endpoint**: `GET /`

- **Query Params**: `page`, `limit`, `category` (ID), `status`, `include=stats,summary`
- **Response**:
  ```typescript
  {
    status: true,
    data: {
      items: InventoryItem[];
      total: number;
      stats?: InventoryStats;
      summary?: InventorySummary;
    }
  }
  ```

---

### 3.2 取得分類列表 (Categories)

**Endpoint**: `GET /categories`

- **用途**: 從資料庫讀取分類 metadata (title, bgColor, imageUrl, count)
- **Response**:
  ```typescript
  {
    status: true,
    data: {
      categories: {
        id: string;        // "fruit"
        title: string;     // "蔬果類"
        count: number;
        imageUrl: string;
        bgColor: string;
      }[]
    }
  }
  ```

---

### 3.3 新增食材

**Endpoint**: `POST /`

- **Request Body**:
  ```typescript
  {
    name: string;
    category: string;      // ★ 必須是 ID (e.g., "fruit")
    quantity: number;
    unit: string;
    purchaseDate?: string;
    expiryDate?: string;
    lowStockAlert?: boolean;
    lowStockThreshold?: number;
    notes?: string;
    attributes?: string[];
    imageUrl?: string;
  }
  ```

---

### 3.4 更新食材

**Endpoint**: `PUT /:id`

- **Request Body**: 同 3.3，只傳要更新的欄位。

---

### 3.5 刪除食材

**Endpoint**: `DELETE /:id`

---

### 3.6 消耗食材

**Endpoint**: `POST /:id/consume`

- **Request Body**:
  ```typescript
  {
    quantity: number;
  }
  ```
- **Response**:
  ```typescript
  {
    status: true,
    data: { id, remainingQuantity, consumedAt }
  }
  ```

---

### 3.7 取得庫存設定

**Endpoint**: `GET /settings`

- **說明**: 首次呼叫時若無資料，會自動建立預設設定。
- **Response**:
  ```typescript
  {
    status: true,
    data: {
      settings: {
        id: string;
        layoutType: "layout-a" | "layout-b" | "layout-c";
        categoryOrder: string[];         // ["fruit", "meat", ...]
        categories: CategorySettingItem[];
        lowStockThreshold: number;
        expiringSoonDays: number;
        notifyOnExpiry: boolean;
        notifyOnLowStock: boolean;
      }
    }
  }
  ```

---

### 3.8 更新庫存設定

**Endpoint**: `PUT /settings` 或 `PATCH /settings`

- **Request Body**: 同上 settings 結構，僅傳需要更新的欄位。

---

### 3.9 取得庫存摘要

**Endpoint**: `GET /summary`

- **Response**:
  ```typescript
  { status: true, data: { summary: { total, expiring, expired, lowStock } } }
  ```

---

## 4. 媒體上傳 API

### 4.1 上傳媒體檔案

**Endpoint**: `POST /api/v1/media/upload`

- **Method**: `multipart/form-data` (field: `file`)
- **Response**:
  ```typescript
  { success: true, data: { url: string, publicId: string } }
  ```

---

## 5. 食譜儲存 API (Saved Recipes)

Base Path: `/api/v1/recipes`

| Method   | Endpoint | 說明     |
| :------- | :------- | :------- |
| `GET`    | `/`      | 取得列表 |
| `POST`   | `/`      | 新增食譜 |
| `GET`    | `/:id`   | 取得單筆 |
| `PUT`    | `/:id`   | 更新食譜 |
| `DELETE` | `/:id`   | 刪除食譜 |

(此 API 不受本次分類正規化影響，食譜的 `category` 為料理類型如「日式」，非食材分類)

---

## 6. 前端 Checklist

- [ ] **分類 Mapping**: 確認從 `GET /categories` 取得資料並建立 `Map<ID, Title>`。
- [ ] **AI 辨識處理**: `POST /api/v1/ai/analyze-image/multiple` 回傳的 `category` 直接使用，無需轉換。
- [ ] **新增庫存**: 表單送出時 `category` 欄位填入 ID (`fruit`)，非中文。
- [ ] **欄位 Mapping**: AI 回傳 `purchaseQuantity` → 送到後端時改名為 `quantity`。
- [ ] **attributes 型別**: AI 回傳 `string`，需轉為 `string[]` 再傳給後端。
