# 前端 API 串接指南 (Frontend Integration Guide)

本文件說明如何串接後端食譜生成與圖片分析 API。

## 基本資訊

- **Base URL (Local)**: `http://localhost:3000`
- **Base URL (Production)**: `(請填入您的 Vercel 網址)`
- **CORS**: 已開放給 localhost 與 Vercel 前端網域。

---

## 1. 生成食譜 (Generate Recipe)

根據使用者輸入的文字（如食材清單或想吃的菜）生成完整食譜。

- **Endpoint**: `POST /api/v1/recipe/generate`
- **Content-Type**: `application/json`

### 請求 (Request)

```json
{
  "input": "我有雞肉、洋蔥和馬鈴薯，想做一道下飯的菜"
}
```

### 回應 (Response)

成功時回傳 `success: true` 與 `data` (Recipe 物件)。

```ts
// Response Interface
interface GenerateRecipeResponse {
  success: true;
  data: GenerateRecipeResult;
  timestamp: string;
}

interface GenerateRecipeResult {
  greeting: string;
  recipes: Recipe[];
  aiMetadata: {
    generatedAt: string;
    model: string;
  };
  remainingQueries: number;
}
```

### 3. 前端範例 (Fetch)

```typescript
const response = await fetch('http://localhost:3000/api/v1/ai/recipe', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ prompt: '有雞肉、洋蔥，想做下飯的菜' })
});
const result = await response.json();
console.log(result.data.recipes); // Recipe[]
```

---

## 2. 圖片分析 (Analyze Image)

(舊版 API，建議使用下方多食材分析 API)

- **Endpoint**: `/api/v1/ai/analyze-image`

... (保留舊版說明供參考) ...

---

## 3. 多食材影像分析 (Analyze Multiple Ingredients) - **[NEW] 推薦使用**

分析單張圖片中的**多個食材**，回傳食材清單、各食材座標以及裁切後的圖片。

- **Endpoint**: `POST /api/v1/ai/analyze-image/multiple`

### 模式 A：傳送圖片網址 (Image URL)

- **Content-Type**: `application/json`

```json
{
  "imageUrl": "https://example.com/fridge_full.jpg",
  "cropImages": true,      // (選填) 是否裁切子圖片，預設 true
  "maxIngredients": 10     // (選填) 最大辨識數量，預設 10
}
```

### 模式 B：上傳圖片檔案 (File Upload)

- **Content-Type**: `multipart/form-data`
- **欄位名稱**: `file`

### 回應 (Response)

```ts
interface MultipleIngredientsResponse {
  success: boolean;
  data: MultipleIngredientsResult;
  timestamp: string;
}
```

### 🚀 遷移指南：從單一分析切換至多食材分析

為了獲得自動裁切與多食材支援，請參照以下範例修改前端程式碼：

**範例代碼 (Migration Example)**

```typescript
// 呼叫新 API
const response = await fetch('/api/v1/ai/analyze-image/multiple', {
  method: 'POST',
  body: formData // 或 JSON body
});
const result = await response.json();

// 1. 取得所有食材 (Inventory 列表用)
const allIngredients = result.data.ingredients;

// 2. 取得主要食材 (相容舊版單一顯示用)
// 直接取陣列第一個即為信心度最高的主體
const mainIngredient = allIngredients[0];

if (mainIngredient) {
  console.log("產品名稱:", mainIngredient.productName);
  console.log("裁切圖 URL:", mainIngredient.imageUrl); // 自動裁切後的特寫
  console.log("原始大圖:", result.data.originalImageUrl);
}
```

---

## TypeScript 型別定義 (Type Definitions)

請將以下型別複製到前端專案中 (例如 `src/types/api.ts`)：

```typescript
// 食譜結構
export type Recipe = {
  id: string;
  name: string;
  description: string;
  process: string[]; // 步驟
  ingredients: string[]; // 食材
  seasonings: string[]; // 調味料
  tags: string[];
  cookingTime: number; // 分鐘
  servings: number; // 人份
  difficulty: "簡單" | "中等" | "困難";
  calories: number;
};

// 基礎食材辨識結果
export type IngredientRecognitionResult = {
  productName: string;              // 產品名稱
  category: string;                 // 分類
  attributes: string;               // 屬性
  purchaseQuantity: number;         // 購物數量
  unit: string;                     // 單位
  purchaseDate: string;             // 購物日期 (YYYY-MM-DD)
  expiryDate: string;               // 過期日期 (YYYY-MM-DD)
  lowStockAlert: boolean;           // 開啟通知
  lowStockThreshold: number;        // 低庫存門檻
  notes: string;                    // 備註
  imageUrl?: string | null;         // 圖片 URL (裁切圖或原圖)
};

// 邊界框 (0-1 相對座標)
export type BoundingBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

// 多食材分析單項
export type MultipleIngredientItem = IngredientRecognitionResult & {
  boundingBox: BoundingBox;
  confidence: number;
};

// 多食材分析結果概覽
export type MultipleIngredientsResult = {
  originalImageUrl: string;
  totalCount: number;
  ingredients: MultipleIngredientItem[];
  analyzedAt: string;
};
```
