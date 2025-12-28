# 食譜儲存 API 整合指南

**版本**: v1.0  
**最後更新**: 2025-12-29  
**Base URL**: `https://gemini-ai-recipe-gen-mvp.vercel.app` (Production) 或 `http://localhost:3000` (Development)

---

## 概述

此 API 用於儲存和管理 AI 生成的食譜，支援按使用者 ID 進行 CRUD 操作。

---

## 認證方式

所有需要寫入的操作都需要透過 `X-User-Id` Header 傳入使用者識別：

```typescript
headers: {
  'Content-Type': 'application/json',
  'X-User-Id': userId,  // 從主後端登入取得的使用者 ID
}
```

---

## API 端點

### 1. 儲存新食譜

**POST** `/api/v1/recipes`

將 AI 生成的食譜儲存到資料庫。

#### Request

```typescript
// Headers
{
  'Content-Type': 'application/json',
  'X-User-Id': 'user_abc123'  // 必填
}

// Body
{
  name: string;           // 必填：食譜名稱
  category?: string;      // 料理類型（如：中式料理、義式料理）
  description?: string;   // 食譜描述
  imageUrl?: string;      // 食譜圖片 URL
  servings?: number;      // 份數（預設 2）
  cookTime?: number;      // 烹飪時間（分鐘）
  difficulty?: '簡單' | '中等' | '困難';
  ingredients: IngredientItem[];  // 必填：準備材料
  seasonings?: IngredientItem[];  // 調味料
  steps: CookingStep[];           // 必填：烹煮步驟
  originalPrompt?: string;        // 原始 AI 查詢
}
```

#### Response (201)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_abc123",
    "name": "蒜香奶油蝦義大利麵",
    "category": "義式料理",
    "createdAt": "2025-12-29T00:00:00Z",
    ...
  }
}
```

---

### 2. 取得食譜列表

**GET** `/api/v1/recipes`

依使用者 ID 取得已儲存的食譜列表。

#### Query Parameters

| 參數 | 類型 | 必填 | 說明 |
|------|------|------|------|
| `userId` | string | 是* | 使用者 ID（或使用 X-User-Id Header） |
| `limit` | number | 否 | 每頁筆數（預設 20） |
| `offset` | number | 否 | 分頁偏移量（預設 0） |

#### Request

```typescript
const response = await fetch(
  `${API_BASE}/api/v1/recipes?userId=${userId}&limit=10&offset=0`
);
```

#### Response (200)

```json
{
  "success": true,
  "data": {
    "recipes": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "蒜香奶油蝦義大利麵",
        "category": "義式料理",
        "imageUrl": "https://...",
        "servings": 2,
        "cookTime": 25,
        "difficulty": "簡單",
        "isFavorite": false,
        "createdAt": "2025-12-29T00:00:00Z"
      }
    ],
    "pagination": {
      "total": 42,
      "limit": 10,
      "offset": 0
    }
  }
}
```

---

### 3. 取得單一食譜

**GET** `/api/v1/recipes/:id`

取得食譜完整詳情，包含所有材料和步驟。

#### Request

```typescript
const response = await fetch(`${API_BASE}/api/v1/recipes/${recipeId}`);
```

#### Response (200)

```json
{
  "success": true,
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "userId": "user_abc123",
    "name": "蒜香奶油蝦義大利麵",
    "category": "義式料理",
    "description": "簡單快速的經典義大利麵",
    "imageUrl": "https://...",
    "servings": 2,
    "cookTime": 25,
    "difficulty": "簡單",
    "ingredients": [
      { "name": "義大利麵", "amount": "200", "unit": "g" },
      { "name": "蝦仁", "amount": "10", "unit": "隻" }
    ],
    "seasonings": [
      { "name": "蒜頭", "amount": "3", "unit": "瓣" },
      { "name": "奶油", "amount": "30", "unit": "g" }
    ],
    "steps": [
      { "step": 1, "description": "煮義大利麵至8分熟，撈起備用" },
      { "step": 2, "description": "熱鍋融化奶油，加入蒜末爆香" }
    ],
    "source": "ai_generated",
    "originalPrompt": "我想吃義大利麵",
    "isFavorite": false,
    "createdAt": "2025-12-29T00:00:00Z",
    "updatedAt": "2025-12-29T00:00:00Z"
  }
}
```

---

### 4. 更新食譜

**PUT** `/api/v1/recipes/:id`

更新食譜資訊（只能更新自己的食譜）。

#### Request

```typescript
// Headers
{
  'Content-Type': 'application/json',
  'X-User-Id': 'user_abc123'  // 必填：用於權限驗證
}

// Body（全部選填）
{
  name?: string;
  category?: string;
  isFavorite?: boolean;  // 收藏狀態
  ...
}
```

#### 常見用法：切換收藏狀態

```typescript
await fetch(`${API_BASE}/api/v1/recipes/${recipeId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Id': userId,
  },
  body: JSON.stringify({ isFavorite: true }),
});
```

#### Response (200)

```json
{
  "success": true,
  "data": { /* 更新後的完整食譜 */ }
}
```

---

### 5. 刪除食譜

**DELETE** `/api/v1/recipes/:id`

刪除食譜（只能刪除自己的食譜）。

#### Request

```typescript
await fetch(`${API_BASE}/api/v1/recipes/${recipeId}`, {
  method: 'DELETE',
  headers: {
    'X-User-Id': userId,  // 必填
  },
});
```

#### Response (200)

```json
{
  "success": true,
  "message": "食譜已刪除"
}
```

---

## 型別定義

```typescript
type IngredientItem = {
  name: string;    // 食材名稱
  amount: string;  // 數量（如 "200" 或 "3-4"）
  unit: string;    // 單位（如 "g"、"條"、"茶匙"）
};

type CookingStep = {
  step: number;        // 步驟編號
  description: string; // 步驟說明
};

type SavedRecipe = {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  servings: number;
  cookTime: number | null;
  difficulty: '簡單' | '中等' | '困難' | null;
  ingredients: IngredientItem[];
  seasonings: IngredientItem[];
  steps: CookingStep[];
  source: 'ai_generated' | 'manual';
  originalPrompt: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};
```

---

## 錯誤處理

| HTTP Status | 說明 |
|-------------|------|
| 400 | 缺少必要欄位或 X-User-Id |
| 404 | 找不到該食譜或沒有權限 |
| 500 | 伺服器錯誤 |

```json
{
  "success": false,
  "error": "錯誤訊息"
}
```

---

## 前端整合範例

### React Hook 範例

```typescript
// hooks/useSavedRecipes.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_BASE = import.meta.env.VITE_AI_API_URL;

export const useSavedRecipes = (userId: string) => {
  return useQuery({
    queryKey: ['savedRecipes', userId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/api/v1/recipes?userId=${userId}`);
      const data = await res.json();
      return data.data;
    },
    enabled: !!userId,
  });
};

export const useSaveRecipe = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, recipe }: { userId: string; recipe: CreateRecipeInput }) => {
      const res = await fetch(`${API_BASE}/api/v1/recipes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': userId,
        },
        body: JSON.stringify(recipe),
      });
      return res.json();
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: ['savedRecipes', userId] });
    },
  });
};
```

### 儲存 AI 生成的食譜

```typescript
// 當使用者點擊「儲存食譜」按鈕時
const handleSaveRecipe = async (aiRecipe: RecipeListItem) => {
  await saveRecipe.mutateAsync({
    userId: currentUser.id,
    recipe: {
      name: aiRecipe.name,
      category: aiRecipe.category,
      imageUrl: aiRecipe.imageUrl,
      servings: aiRecipe.servings,
      cookTime: aiRecipe.cookTime,
      difficulty: aiRecipe.difficulty,
      ingredients: aiRecipe.ingredients || [],
      seasonings: aiRecipe.seasonings || [],
      steps: aiRecipe.steps || [],
      originalPrompt: currentPrompt,
    },
  });
};
```

---

## Swagger UI 文件

完整的 API 文件可透過 Swagger UI 查看：
- Production: https://gemini-ai-recipe-gen-mvp.vercel.app/docs-cdn
- Development: http://localhost:3000/docs
