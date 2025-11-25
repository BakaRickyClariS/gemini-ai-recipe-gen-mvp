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
  data: Recipe;
  timestamp: string;
}
```

### 前端範例 (Fetch)

```typescript
const response = await fetch('http://localhost:3000/api/v1/recipe/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ input: '番茄炒蛋' })
});
const result = await response.json();
console.log(result.data); // Recipe Object
```

---

## 2. 圖片分析 (Analyze Image)

分析食材圖片，回傳食材清單與建議料理。支援 **網址 (URL)** 或 **檔案上傳 (File)**。

- **Endpoint**: `POST /api/v1/recipe/analyze-image`

### 模式 A：傳送圖片網址 (Image URL)

- **Content-Type**: `application/json`

```json
{
  "imageUrl": "https://example.com/food.jpg"
}
```

### 模式 B：上傳圖片檔案 (File Upload)

- **Content-Type**: `multipart/form-data`
- **欄位名稱**: `file` (必須是這個名稱)

### 回應 (Response)

```ts
// Response Interface
interface AnalyzeImageResponse {
  success: true;
  data: AnalyzeImageResult;
  timestamp: string;
}
```

### 前端範例 (File Upload)

```typescript
const formData = new FormData();
formData.append('file', fileInput.files[0]); // ⚠️ 欄位名稱必須是 "file"

const response = await fetch('http://localhost:3000/api/v1/recipe/analyze-image', {
  method: 'POST',
  body: formData // ⚠️ 不要手動設定 Content-Type，瀏覽器會自動處理
});

const result = await response.json();
console.log(result.data); // AnalyzeImageResult Object
```

---

## TypeScript 型別定義 (Type Definitions)

請將以下型別複製到前端專案中 (例如 `src/types/api.ts`) 以獲得完整的型別檢查。

```typescript
// 食譜結構
export type Recipe = {
  recipeName: string;
  servings?: number;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  totalTimeMinutes?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  category?: string;
  ingredients: Ingredient[];
  instructions: Instruction[];
  tips?: string[];
  nutritionPerServing?: Nutrition;
};

export type Ingredient = {
  name: string;
  quantity?: number | string;
  unit?: string;
  optional?: boolean;
};

export type Instruction = {
  step: number;
  description: string;
  timeMinutes?: number;
};

export type Nutrition = {
  calories?: number;
  protein?: string;
  fat?: string;
  carbohydrates?: string;
};

// 圖片分析結果結構（食物庫存管理）
export type AnalyzeImageResult = {
  // 產品資訊
  productName: string;              // 產品名稱
  category: string;                 // 分類（例如：「乳製品飲料類」、「蔬果類」、「肉蛋類」）
  attributes: string;               // 屬性（例如：「鮮奶類」、「新鮮類」）
  purchaseQuantity: number;         // 購物數量
  unit: string;                     // 單位（例如：「瓶」、「顆」、「盒」、「包」、「公斤」）
  
  // 日期設定
  purchaseDate: string;             // 購物日期（格式：YYYY-MM-DD）
  expiryDate: string;               // 過期日期（格式：YYYY-MM-DD）
  
  // 低庫存提醒
  lowStockAlert: boolean;           // 開啟通知（預設 true）
  lowStockThreshold: number;        // 低庫存數量通知（預設 2）
  
  // 備註
  notes: string;                    // 備註
};
```
