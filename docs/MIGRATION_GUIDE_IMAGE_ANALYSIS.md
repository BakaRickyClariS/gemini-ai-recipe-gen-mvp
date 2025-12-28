# 單食材辨識轉換為多食材辨識 - 技術遷移指南

本文件說明為何將原有的「單一食材分析」轉換為「多食材分析」，以及詳細的前端遷移步驟。

---

## 📅 背景與變更動機

為了提供更細緻的食材管理體驗並優化 AI 資源使用，我們進行了以下架構升級：

| 比較項目 | 舊版 (Single Ingredient Analysis) | **新版 (Multiple Ingredients Analysis)** |
| :--- | :--- | :--- |
| **API 端點** | `/api/v1/recipe/analyze-image` | **`/api/v1/ai/analyze-image/multiple`** |
| **辨識能力** | 僅辨識畫面中最顯著的 1 個食材 | **一次辨識多個食材 (預設 Max 10)** |
| **圖片處理** | 僅回傳分析數據，無處理 | **AI 偵測座標 → Server 自動裁切特寫圖** |
| **資料結構** | 回傳單一 Object | **回傳 Array，每個項目包含獨立數據與圖片** |
| **適用情境** | 單拍一顆蘋果 | 拍攝整個冰箱、一桌菜、或單拍一顆蘋果 |

### ⭐ 為什麼要換？

1.  **自動裁切 (Auto-Cropping)**：新 API 不只給數據，還會自動把每個食材從大圖中切出來，前端可以直接顯示乾淨的產品縮圖。
2.  **相容性 (Backward Compatibility)**：即使照片只有一個食材，新 API 也只是回傳長度為 1 的陣列。
3.  **成本與效能**：一次上傳分析多個食材，比分多次上傳更省 Token 與等待時間。

---

## 🚀 遷移步驟 (Migration Steps)

### 1. 更新 API 端點

請將原本呼叫 `/api/v1/recipe/analyze-image` 的程式碼，更改為：

```http
POST /api/v1/ai/analyze-image/multiple
```

### 2. 資料結構適配 (Data Structure)

原本的回傳資料是直接的一層物件，現在變為 `{ data: { ingredients: [...] } }` 的巢狀結構。

**舊版 (使用中)**
```ts
// response.data (直接是單一食材物件)
{
  productName: "番茄",
  category: "蔬果類",
  // ...
}
```

**新版 (請更新)**

```typescript
// API Response Interface
interface MultipleIngredientsResponse {
  success: boolean;
  data: MultipleIngredientsResult;
  timestamp: string;
}

// 核心資料結構
interface MultipleIngredientsResult {
  /**
   * 原始圖片的完整 URL (未裁切)
   */
  originalImageUrl: string;
  
  /**
   * 辨識到的食材總數
   */
  totalCount: number;
  
  /**
   * 食材列表
   */
  ingredients: MultipleIngredientItem[];
  
  /**
   * 分析時間 (ISO 8601)
   */
  analyzedAt: string;
}

// 單一食材項目細節
interface MultipleIngredientItem {
  /**
   * 產品名稱 (如: "番茄")
   */
  productName: string;
  
  /**
   * 分類 (如: "蔬果類")
   */
  category: string;
  
  /**
   * 屬性 (如: "新鮮類")
   */
  attributes: string;
  
  /**
   * 建議購買數量
   */
  purchaseQuantity: number;
  
  /**
   * 單位 (如: "顆")
   */
  unit: string;
  
  /**
   * 建議購買日期 (YYYY-MM-DD)
   */
  purchaseDate: string;
  
  /**
   * 預估過期日期 (YYYY-MM-DD)
   */
  expiryDate: string;
  
  /**
   * 是否開啟低庫存提醒
   */
  lowStockAlert: boolean;
  
  /**
   * 低庫存門檻
   */
  lowStockThreshold: number;
  
  /**
   * 備註 (如: "冷藏保存")
   */
  notes: string;
  
  /**
   * [NEW] 自動裁切後的特寫圖片 URL
   * 建議優先顯示這張圖
   */
  imageUrl?: string | null;
  
  /**
   * [NEW] 邊界框座標 (相對比例 0-1)
   */
  boundingBox: {
    x: number;      // 左上角 X
    y: number;      // 左上角 Y
    width: number;  // 寬度
    height: number; // 高度
  };
  
  /**
   * [NEW] AI 辨識信心度 (0-1)
   */
  confidence: number;
}
```

### 3. 前端實作範例 (React/TypeScript)

以下是一個完整的 API 串接函式範例，包含錯誤處理與回應型別宣告：

```typescript
import type { MultipleIngredientsResponse, MultipleIngredientItem } from './types/api';

/**
 * 分析圖片並取得食材資訊 (含自動裁切)
 * @param file 上傳的圖片檔案
 * @param cropImages 是否需要自動裁切 (預設 true)
 */
export async function analyzeImage(
  file: File, 
  cropImages = true
): Promise<MultipleIngredientItem[]> {
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('cropImages', String(cropImages));
  formData.append('maxIngredients', '10');

  try {
    const response = await fetch('/api/v1/ai/analyze-image/multiple', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`分析失敗: ${response.statusText}`);
    }

    const result: MultipleIngredientsResponse = await response.json();
    return result.data.ingredients;

  } catch (error) {
    console.error('Image analysis error:', error);
    throw error;
  }
}

// === 使用範例 ===

const handleUpload = async (file: File) => {
  try {
    const ingredients = await analyzeImage(file);
    
    // 情境 A: 列表顯示所有食材
    ingredients.forEach(item => {
      console.log(`品項: ${item.productName}`);
      console.log(`特寫圖: ${item.imageUrl}`); // 優先顯示這張
    });

    // 情境 B: 只取第一個 (相容舊邏輯)
    if (ingredients.length > 0) {
      const mainItem = ingredients[0];
      // setSingleItem(mainItem);
    }
  } catch (e) {
    alert("圖片分析失敗，請稍後再試");
  }
};
```

---

## 📋 新增參數說明

新 API 支援額外參數 (Optional)，可透過 JSON Body 或 FormData 傳入：

*   `cropImages` (boolean): 預設 `true`。是否要自動裁切並上傳食材特寫圖。
*   `maxIngredients` (number): 預設 `10`。最多辨識幾個食材。

```json
{
  "imageUrl": "...",
  "cropImages": true,
  "maxIngredients": 5
}
```

---

## 🛠️ 常見問題

**Q: 如果照片真的只有一個食材，新 API 會怎樣？**
A: 回傳的 `ingredients` 陣列長度就會是 1。內容與舊版幾乎一樣，但多了 `boundingBox` 和 `imageUrl` (裁切圖)。

**Q: 舊的 API 還能用嗎？**
A: 舊 API (`/analyze-image`) 仍然保留在程式碼中，但建議全面遷移至新版以獲得裁切圖功能。
