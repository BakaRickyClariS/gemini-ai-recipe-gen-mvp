# Recipes Module API Specification

**版本**: v1.0  
**涵蓋範圍**: 食譜列表/詳情、收藏、烹煮、Meal Plan

---

## 1. 基本規範
- Base URL: `/api/v1`
- 需帶 Access Token
- 成功/錯誤格式同 `auth_api_spec.md`

---

## 2. 資料模型

### 2.1 Recipe
```typescript
type Recipe = {
  id: string;
  name: string;
  category: '中式料理' | '美式料理' | '義式料理' | '日式料理' | ...; // 詳見前端 constants
  series?: string;
  imageUrl: string;
  servings: number;
  cookTime: number; // minutes
  difficulty: '簡單' | '中等' | '困難';
  ingredients: RecipeIngredient[];
  steps: CookingStep[];
  isFavorite?: boolean;
  createdAt: string;
  updatedAt?: string;
};
```

### 2.2 RecipeIngredient
```typescript
type RecipeIngredient = {
  name: string;
  quantity: string; // e.g. "3-4" or "100g"
  unit?: string;
  category: '準備材料' | '調味料';
};
```

### 2.3 CookingStep
```typescript
type CookingStep = {
  stepNumber: number;
  description: string;
  time?: string;
};
```

### 2.4 MealPlanInput
```typescript
type MealPlanInput = {
  recipeId: string;
  scheduledDate: string; // YYYY-MM-DD
  servings?: number;
};
```

### 2.5 ConsumptionConfirmation
```typescript
type ConsumptionConfirmation = {
  recipeId: string;
  items?: Array<{ foodId: string; quantity: number; unit?: string }>;
};
```

---

## 3. Recipes API

### 3.1 取得食譜列表
- **GET** `/api/v1/recipes`
- Query: `category?`, `favorite? (true/false)`
- 200 → `Recipe[]`（或精簡列表型別）

### 3.2 取得單一食譜
- **GET** `/api/v1/recipes/{id}`
- 200 → `Recipe`

### 3.3 收藏/取消收藏
- **POST** `/api/v1/recipes/{id}/favorite`（加入最愛）
- **DELETE** `/api/v1/recipes/{id}/favorite`（取消最愛）
- 200 → `{ isFavorite: boolean }`

### 3.4 食譜烹煮完成（扣庫存/更新狀態）
- **PATCH** `/api/v1/recipes/{id}`
- Body: `ConsumptionConfirmation` 或 `{ status: 'cooked' }`
- 200 → `{ success: boolean, message: string }`

### 3.5 新增 Meal Plan
- **POST** `/api/v1/recipes/plan`
- Body: `MealPlanInput`
- 201 → `MealPlan`

### 3.6 取得 Meal Plans
- **GET** `/api/v1/recipes/plan`
- 200 → `MealPlan[]`

### 3.7 刪除 Meal Plan
- **DELETE** `/api/v1/recipes/plan/{planId}`
- 204 或 `{ success: true }`

