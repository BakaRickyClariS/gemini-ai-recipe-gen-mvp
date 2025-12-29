# Inventory API 前後端整合問題總結報告

**版本**: v1.1  
**日期**: 2025-12-29  
**目的**: 總結前端測試結果，提供後端 API 狀態報告

---

## 問題總結

| # | 問題 | 狀態 | 解決方式 |
|---|------|------|----------|
| 1 | 缺少 X-User-Id header | ✅ 已修復 | 前端 `client.ts` 已加入 |
| 2 | CORS 不允許 X-User-Id | ✅ 已修復 | 後端已更新 CORS 設定 |
| 3 | `/inventory/categories` 回傳空陣列 | ✅ 已規避 | 前端改用 settings 內的 categories |
| 4 | 主後端 `/refrigerators` 回傳 500 | ⚠️ 間歇性 | 前端已加入 fallback 機制 |

---

## 目前狀態

> [!TIP]
> **前端已完成所有修復**  
> Settings 頁面的「庫存排序設定」區塊已能正常顯示類別資料。

---

## 建議後端處理項目

### 1. `/inventory/categories` API 回傳空陣列

雖然前端已規避此問題（改用 settings 內的 categories），但建議後端仍應讓此 API 回傳正確資料：
      {
        "id": "frozen",
        "title": "冷凍調理類", 
        "count": 3,
        "imageUrl": "/images/categories/frozen.png",
        "bgColor": "#E3F2FD",
        "slogan": "冷凍食品",
        "description": ["冷凍蔬菜", "冷凍肉品", "冷凍海鮮"]
      },
      {
        "id": "bake",
        "title": "主食烘焙類",
        "count": 2,
        "imageUrl": "/images/categories/bake.png",
        "bgColor": "#FFF3E0",
        "slogan": "麵包主食",
        "description": ["麵包", "米飯", "麵條"]
      },
      {
        "id": "milk",
        "title": "乳品蛋類",
        "count": 4,
        "imageUrl": "/images/categories/milk.png",
        "bgColor": "#FFFDE7",
        "slogan": "乳製品",
        "description": ["牛奶", "優格", "雞蛋"]
      },
      {
        "id": "seafood",
        "title": "海鮮類",
        "count": 1,
        "imageUrl": "/images/categories/seafood.png",
        "bgColor": "#E0F7FA",
        "slogan": "新鮮海產",
        "description": ["魚類", "蝦蟹", "貝類"]
      },
      {
        "id": "meat",
        "title": "肉類",
        "count": 6,
        "imageUrl": "/images/categories/meat.png",
        "bgColor": "#FFEBEE",
        "slogan": "優質肉品",
        "description": ["豬肉", "雞肉", "牛肉"]
      },
      {
        "id": "others",
        "title": "其他",
        "count": 2,
        "imageUrl": "/images/categories/others.png",
        "bgColor": "#F5F5F5",
        "slogan": "其他食材",
        "description": ["調味料", "醬料", "其他"]
      }
    ]
  }
}
```

### 建議修復方案

參考 `/inventory/settings` 已實作的自動初始化邏輯，為 `/inventory/categories` 也加入預設資料：

```typescript
// 當 categories 為空時，回傳預設類別
const DEFAULT_CATEGORIES: CategoryInfo[] = [
  { id: 'fruit', title: '蔬果類', count: 0, imageUrl: '/images/categories/fruit.png', bgColor: '#E8F5E9', slogan: '新鮮蔬果', description: ['葉菜類', '根莖類', '瓜果類'] },
  { id: 'frozen', title: '冷凍調理類', count: 0, imageUrl: '/images/categories/frozen.png', bgColor: '#E3F2FD', slogan: '冷凍食品', description: ['冷凍蔬菜', '冷凍肉品', '冷凍海鮮'] },
  { id: 'bake', title: '主食烘焙類', count: 0, imageUrl: '/images/categories/bake.png', bgColor: '#FFF3E0', slogan: '麵包主食', description: ['麵包', '米飯', '麵條'] },
  { id: 'milk', title: '乳品蛋類', count: 0, imageUrl: '/images/categories/milk.png', bgColor: '#FFFDE7', slogan: '乳製品', description: ['牛奶', '優格', '雞蛋'] },
  { id: 'seafood', title: '海鮮類', count: 0, imageUrl: '/images/categories/seafood.png', bgColor: '#E0F7FA', slogan: '新鮮海產', description: ['魚類', '蝦蟹', '貝類'] },
  { id: 'meat', title: '肉類', count: 0, imageUrl: '/images/categories/meat.png', bgColor: '#FFEBEE', slogan: '優質肉品', description: ['豬肉', '雞肉', '牛肉'] },
  { id: 'others', title: '其他', count: 0, imageUrl: '/images/categories/others.png', bgColor: '#F5F5F5', slogan: '其他食材', description: ['調味料', '醬料', '其他'] },
];
```

---

## 設定 API 資料結構確認

### `/inventory/settings` 預期格式

```typescript
type InventorySettings = {
  lowStockThreshold: number;     // 低庫存警示門檻 (預設: 2)
  expiringSoonDays: number;      // 即將過期天數 (預設: 3)
  notifyOnExpiry: boolean;       // 是否通知過期 (預設: true)
  notifyOnLowStock: boolean;     // 是否通知低庫存 (預設: true)
  layoutType?: 'layout-a' | 'layout-b' | 'layout-c';  // 版型選擇
  categoryOrder?: string[];      // 類別排序順序 (e.g., ["fruit", "frozen", "bake"])
  categories?: CategorySettingItem[];  // 類別詳細設定
};

type CategorySettingItem = {
  id: string;
  title: string;
  isVisible: boolean;
  subCategories?: string[];
};
```

---

## API 端點清單

| 方法 | 端點 | 說明 | 狀態 |
|------|------|------|------|
| GET | `/api/v1/refrigerators/{id}/inventory/settings` | 取得設定 | ✅ 正常 |
| PUT | `/api/v1/refrigerators/{id}/inventory/settings` | 更新設定 | 待確認 |
| GET | `/api/v1/refrigerators/{id}/inventory/categories` | 取得類別 | ❌ 回傳空陣列 |
| GET | `/api/v1/refrigerators/{id}/inventory` | 取得庫存列表 | 待確認 |
| GET | `/api/v1/refrigerators/{id}/inventory/summary` | 取得摘要 | 待確認 |

---

## 前端已完成的修復

| 修改 | 檔案 |
|------|------|
| X-User-Id header 注入 | `src/api/client.ts` |
| RefrigeratorId fallback 機制 | `src/modules/inventory/utils/getRefrigeratorId.ts` |
| Settings 頁面邏輯更新 | `src/modules/inventory/components/layout/SettingsPanel.tsx` |

---

## 總結

> [!IMPORTANT]
> **優先修復項目**  
> `/api/v1/refrigerators/{id}/inventory/categories` 需要回傳預設類別資料，而非空陣列。  
> 這會導致前端「庫存排序設定」區塊無法顯示任何內容。
