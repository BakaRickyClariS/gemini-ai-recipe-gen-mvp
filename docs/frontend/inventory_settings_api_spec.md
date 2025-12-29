# 庫存設定 API 規格

**版本**: v1.0  
**最後更新**: 2025-12-29  
**前端分支**: `Feature-inventory-settings`

---

## 快速索引

- [API 概覽](#api-概覽)
- [資料模型](#資料模型)
- [API 端點](#api-端點)
- [前端整合](#前端整合)

---

## API 概覽

庫存設定 API 用於管理用戶的庫存顯示偏好，包含：

- **版型設定**: 庫存頁面的視覺呈現方式
- **類別順序**: 類別卡片的排列順序
- **類別設定**: 類別可見性與子分類

---

## 資料模型

### InventorySettings

```typescript
type InventorySettings = {
  /** 版型類型 */
  layoutType: 'layout-a' | 'layout-b' | 'layout-c';

  /** 類別排序 (ID 陣列) */
  categoryOrder: string[];

  /** 類別自訂設定 */
  categories?: CategorySettingItem[];

  /** 低庫存警示閾值 */
  lowStockThreshold: number;

  /** 即將過期天數 */
  expiringSoonDays: number;

  /** 過期通知開關 */
  notifyOnExpiry: boolean;

  /** 低庫存通知開關 */
  notifyOnLowStock: boolean;
};
```

### CategorySettingItem

```typescript
type CategorySettingItem = {
  /** 類別 ID */
  id: string;

  /** 類別名稱 */
  title: string;

  /** 是否顯示 */
  isVisible: boolean;

  /** 子分類列表 (產品屬性) */
  subCategories?: string[];
};
```

### 預設類別列表

| ID      | 名稱       | 子分類 (subCategories)                   |
| ------- | ---------- | ---------------------------------------- |
| fruit   | 蔬果類     | 葉菜類、根莖類、瓜果類、新鮮菇類、水果   |
| frozen  | 冷凍調理類 | 冷凍調理包、加熱即食餐、冷凍甜點         |
| bake    | 主食烘焙類 | 米飯、麵條、麵包、堅果、乾貨             |
| milk    | 乳品飲料類 | 蛋類、鮮奶、優格、奶油、起司、果汁、茶飲 |
| seafood | 冷凍海鮮類 | 魚肉、甲殼類、貝類、魚漿製品             |
| meat    | 肉品類     | 豬肉類、牛肉類、雞肉類、加工肉品         |
| others  | 乾貨醬料類 | 調味醬、果醬、乾燥食材、油品、醃製品     |

---

## API 端點

### 1. 取得庫存設定

```
GET /api/v1/inventory/settings
```

**Query Parameters**:

| 參數             | 類型   | 必填 | 說明         |
| ---------------- | ------ | :--: | ------------ |
| `refrigeratorId` | string |      | 冰箱/群組 ID |

**回應範例 (200)**:

```json
{
  "status": true,
  "data": {
    "settings": {
      "layoutType": "layout-a",
      "categoryOrder": [
        "fruit",
        "frozen",
        "bake",
        "milk",
        "seafood",
        "meat",
        "others"
      ],
      "categories": [
        {
          "id": "fruit",
          "title": "蔬果類",
          "isVisible": true,
          "subCategories": ["葉菜類", "根莖類", "瓜果類", "新鮮菇類", "水果"]
        },
        {
          "id": "frozen",
          "title": "冷凍調理類",
          "isVisible": true,
          "subCategories": ["冷凍調理包", "加熱即食餐", "冷凍甜點"]
        },
        {
          "id": "bake",
          "title": "主食烘焙類",
          "isVisible": true,
          "subCategories": ["米飯", "麵條", "麵包", "堅果", "乾貨"]
        },
        {
          "id": "milk",
          "title": "乳品飲料類",
          "isVisible": true,
          "subCategories": [
            "蛋類",
            "鮮奶",
            "優格",
            "奶油",
            "起司",
            "果汁",
            "茶飲"
          ]
        },
        {
          "id": "seafood",
          "title": "冷凍海鮮類",
          "isVisible": true,
          "subCategories": ["魚肉", "甲殼類", "貝類", "魚漿製品"]
        },
        {
          "id": "meat",
          "title": "肉品類",
          "isVisible": true,
          "subCategories": ["豬肉類", "牛肉類", "雞肉類", "加工肉品"]
        },
        {
          "id": "others",
          "title": "乾貨醬料類",
          "isVisible": true,
          "subCategories": ["調味醬", "果醬", "乾燥食材", "油品", "醃製品"]
        }
      ],
      "lowStockThreshold": 2,
      "expiringSoonDays": 3,
      "notifyOnExpiry": true,
      "notifyOnLowStock": true
    }
  }
}
```

---

### 2. 更新庫存設定

```
PUT /api/v1/inventory/settings
```

**Request Body**:

```json
{
  "layoutType": "layout-b",
  "categoryOrder": [
    "meat",
    "fruit",
    "frozen",
    "milk",
    "bake",
    "seafood",
    "others"
  ],
  "categories": [{ "id": "fruit", "title": "蔬果類", "isVisible": true }],
  "lowStockThreshold": 3,
  "expiringSoonDays": 5,
  "notifyOnExpiry": true,
  "notifyOnLowStock": false
}
```

**回應範例 (200)**:

```json
{
  "status": true,
  "message": "設定已更新",
  "data": {
    "settings": {
      "layoutType": "layout-b",
      "categoryOrder": [
        "meat",
        "fruit",
        "frozen",
        "milk",
        "bake",
        "seafood",
        "others"
      ],
      "lowStockThreshold": 3,
      "expiringSoonDays": 5,
      "notifyOnExpiry": true,
      "notifyOnLowStock": false
    }
  }
}
```

---

### 3. 部分更新庫存設定

```
PATCH /api/v1/inventory/settings
```

**Request Body** (僅需傳送要更新的欄位):

```json
{
  "layoutType": "layout-c"
}
```

或更新類別順序：

```json
{
  "categoryOrder": [
    "seafood",
    "meat",
    "fruit",
    "frozen",
    "bake",
    "milk",
    "others"
  ]
}
```

---

## 錯誤回應

| HTTP Status | 錯誤代碼       | 說明           |
| ----------- | -------------- | -------------- |
| 400         | `SETTINGS_001` | 無效的版型類型 |
| 400         | `SETTINGS_002` | 無效的類別 ID  |
| 401         | `AUTH_001`     | 未授權         |
| 404         | `SETTINGS_003` | 找不到設定     |
| 500         | `INTERNAL_001` | 伺服器錯誤     |

**錯誤回應格式**:

```json
{
  "status": false,
  "code": "SETTINGS_001",
  "message": "無效的版型類型，請使用 layout-a, layout-b 或 layout-c",
  "timestamp": "2025-12-29T01:55:00Z"
}
```

---

## 前端整合

### 現有實作

前端已在 `SettingsPanel.tsx` 實作以下功能：

- 版型選擇 (三種版型)
- 類別拖拉排序 (使用 `@dnd-kit`)
- Redux 狀態管理 (`inventorySlice`)

### API 呼叫範例

```typescript
// 取得設定
const response = await inventoryApi.getSettings(groupId);
const settings = response.data.settings;

// 更新設定
await inventoryApi.updateSettings(
  {
    layoutType: 'layout-b',
    categoryOrder: ['meat', 'fruit', 'frozen'],
  },
  groupId,
);
```

---

## 資料庫建議

### MongoDB Schema

```javascript
{
  userId: ObjectId,
  refrigeratorId: ObjectId,  // 可選，群組設定
  layoutType: String,        // enum: ['layout-a', 'layout-b', 'layout-c']
  categoryOrder: [String],   // 類別 ID 陣列
  categories: [{
    id: String,
    title: String,
    isVisible: Boolean,
    subCategories: [String]
  }],
  lowStockThreshold: Number,
  expiringSoonDays: Number,
  notifyOnExpiry: Boolean,
  notifyOnLowStock: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

---

## 附錄：API 路由總表

| #   | Method | Path                         | 功能         |
| --- | ------ | ---------------------------- | ------------ |
| 1   | GET    | `/api/v1/inventory/settings` | 取得庫存設定 |
| 2   | PUT    | `/api/v1/inventory/settings` | 完整更新設定 |
| 3   | PATCH  | `/api/v1/inventory/settings` | 部分更新設定 |

---

## 變更歷史

| 版本 | 日期       | 說明                               |
| ---- | ---------- | ---------------------------------- |
| v1.0 | 2025-12-29 | 初版，包含版型、類別順序、提醒設定 |
