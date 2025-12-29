# 庫存管理 API 整合指南

**版本**: v1.0  
**最後更新**: 2025-12-29  
**Base URL**: `https://gemini-ai-recipe-gen-mvp.vercel.app` (Production) 或 `http://localhost:3000` (Development)

---

## 概述

此 API 用於管理冰箱/群組的庫存食材，支援 CRUD、消耗記錄、統計摘要、設定管理。

---

## 認證方式

所有端點都需要透過 Header 傳入使用者識別：

```typescript
headers: {
  'Content-Type': 'application/json',
  'X-User-Id': userId,  // 從主後端登入取得的使用者 ID
}
```

---

## API 端點

### 基礎路徑

```
/api/v1/refrigerators/{refrigeratorId}/inventory
```

> `refrigeratorId` 對應主後端的群組 ID（冰箱/家庭群組）

---

## 1. 庫存列表

### GET `/api/v1/refrigerators/:refrigeratorId/inventory`

取得庫存食材列表。

#### Query Parameters

| 參數 | 類型 | 說明 |
|------|------|------|
| `category` | string | 依類別篩選 |
| `status` | string | 依狀態篩選：`expired`、`expiring-soon`、`low-stock` |
| `include` | string | 包含額外資料：`summary`、`stats`、`summary,stats` |
| `page` | number | 頁碼（預設 1） |
| `limit` | number | 每頁筆數（預設 50） |

#### Response

```json
{
  "status": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "name": "雞蛋",
        "category": "乳品飲料類",
        "quantity": 10,
        "unit": "顆",
        "expiryDate": "2025-01-05",
        "lowStockAlert": true,
        "lowStockThreshold": 3
      }
    ],
    "total": 42,
    "summary": { "total": 42, "expiring": 5, "expired": 2, "lowStock": 3 },
    "stats": { "totalItems": 42, "expiredCount": 2, "expiringSoonCount": 5, "lowStockCount": 3 }
  }
}
```

---

## 2. 新增食材

### POST `/api/v1/refrigerators/:refrigeratorId/inventory`

#### Request Body

```typescript
{
  name: string;           // 必填
  quantity: number;       // 必填
  category?: string;      // 類別
  unit?: string;          // 單位
  imageUrl?: string;      // 圖片
  purchaseDate?: string;  // 購買日 YYYY-MM-DD
  expiryDate?: string;    // 保存期限 YYYY-MM-DD
  lowStockAlert?: boolean;
  lowStockThreshold?: number;
  notes?: string;
  attributes?: string[];  // 如 ['有機', '本土']
}
```

#### Response (201)

```json
{
  "status": true,
  "message": "Created successfully",
  "data": { "id": "new-uuid" }
}
```

---

## 3. 取得單筆食材

### GET `/api/v1/refrigerators/:refrigeratorId/inventory/:id`

#### Response

```json
{
  "status": true,
  "data": {
    "item": { /* InventoryItem */ }
  }
}
```

---

## 4. 更新食材

### PUT `/api/v1/refrigerators/:refrigeratorId/inventory/:id`

#### Request Body

```typescript
{
  name?: string;
  quantity?: number;
  category?: string;
  // ... 同新增欄位，全部選填
}
```

---

## 5. 刪除食材

### DELETE `/api/v1/refrigerators/:refrigeratorId/inventory/:id`

#### Response

```json
{ "status": true, "message": "Deleted successfully" }
```

---

## 6. 消耗食材

### POST `/api/v1/refrigerators/:refrigeratorId/inventory/:id/consume`

#### Request Body

```typescript
{
  quantity: number;       // 必填：消耗數量
  reasons: string[];      // 必填：消耗原因
  customReason?: string;  // 自訂原因
}
```

**reasons 可用值**：
- `recipe_consumption` - 食譜消耗
- `duplicate` - 重複購買
- `short_shelf` - 保存時間太短
- `bought_too_much` - 買太多
- `custom` - 自訂

#### Response

```json
{
  "status": true,
  "message": "Consumed successfully",
  "data": {
    "id": "uuid",
    "remainingQuantity": 8,
    "consumedAt": "2025-12-29T03:00:00Z"
  }
}
```

---

## 7. 庫存摘要

### GET `/api/v1/refrigerators/:refrigeratorId/inventory/summary`

#### Response

```json
{
  "status": true,
  "data": {
    "summary": {
      "total": 42,
      "expiring": 5,
      "expired": 2,
      "lowStock": 3
    }
  }
}
```

---

## 8. 分類列表

### GET `/api/v1/refrigerators/:refrigeratorId/inventory/categories`

#### Response

```json
{
  "status": true,
  "data": {
    "categories": [
      { "id": "乳品飲料類", "title": "乳品飲料類", "count": 10 },
      { "id": "肉品類", "title": "肉品類", "count": 5 }
    ]
  }
}
```

---

## 9. 庫存設定

### GET `/api/v1/refrigerators/:refrigeratorId/inventory/settings`

> 💡 首次呼叫會回傳預設設定，不需要先建立

#### Response

```json
{
  "status": true,
  "data": {
    "settings": {
      "layoutType": "layout-a",
      "categoryOrder": ["fruit", "frozen", "bake", "milk", "seafood", "meat", "others"],
      "categories": [
        { "id": "fruit", "title": "蔬果類", "isVisible": true, "subCategories": ["葉菜類", "根莖類"] }
      ],
      "lowStockThreshold": 2,
      "expiringSoonDays": 3,
      "notifyOnExpiry": true,
      "notifyOnLowStock": true
    }
  }
}
```

### PUT `/api/v1/refrigerators/:refrigeratorId/inventory/settings`

完整更新設定。

### PATCH `/api/v1/refrigerators/:refrigeratorId/inventory/settings`

部分更新設定（只傳送要改的欄位）。

```json
{ "layoutType": "layout-b" }
```

---

## 型別定義

```typescript
type InventoryItem = {
  id: string;
  userId: string;
  refrigeratorId: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  imageUrl?: string;
  purchaseDate: string;
  expiryDate: string;
  lowStockAlert: boolean;
  lowStockThreshold: number;
  notes?: string;
  attributes?: string[];
  createdAt: string;
  updatedAt?: string;
};

type InventorySummary = {
  total: number;
  expiring: number;
  expired: number;
  lowStock: number;
};

type InventorySettings = {
  layoutType: 'layout-a' | 'layout-b' | 'layout-c';
  categoryOrder: string[];
  categories?: CategorySettingItem[];
  lowStockThreshold: number;
  expiringSoonDays: number;
  notifyOnExpiry: boolean;
  notifyOnLowStock: boolean;
};

type CategorySettingItem = {
  id: string;
  title: string;
  isVisible: boolean;
  subCategories?: string[];
};
```

---

## 前端整合範例

```typescript
// 取得庫存列表
const res = await fetch(
  `${API_BASE}/api/v1/refrigerators/${groupId}/inventory?include=summary`,
  { headers: { 'X-User-Id': userId } }
);

// 新增食材
await fetch(`${API_BASE}/api/v1/refrigerators/${groupId}/inventory`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
  body: JSON.stringify({ name: '雞蛋', quantity: 10, unit: '顆' }),
});

// 消耗食材
await fetch(`${API_BASE}/api/v1/refrigerators/${groupId}/inventory/${id}/consume`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
  body: JSON.stringify({ quantity: 2, reasons: ['recipe_consumption'] }),
});
```

---

## Swagger UI

完整 API 文件：
- Production: https://gemini-ai-recipe-gen-mvp.vercel.app/docs-cdn
- Development: http://localhost:3000/docs
