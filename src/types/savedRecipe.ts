/**
 * 已儲存食譜的型別定義
 */

import type { IngredientItem, CookingStep } from "./aiRecipe.js";

/**
 * 已儲存的食譜（資料庫記錄）
 */
export type SavedRecipe = {
  id: string;
  userId: string;
  name: string;
  category: string | null;
  description: string | null;
  imageUrl: string | null;
  servings: number;
  cookTime: number | null;
  difficulty: "簡單" | "中等" | "困難" | null;
  ingredients: IngredientItem[];
  seasonings: IngredientItem[];
  steps: CookingStep[];
  source: "ai_generated" | "manual";
  originalPrompt: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

/**
 * 新增食譜的輸入型別
 */
export type CreateRecipeInput = {
  name: string;
  category?: string;
  description?: string;
  imageUrl?: string;
  servings?: number;
  cookTime?: number;
  difficulty?: "簡單" | "中等" | "困難";
  ingredients: IngredientItem[];
  seasonings?: IngredientItem[];
  steps: CookingStep[];
  originalPrompt?: string;
};

/**
 * 更新食譜的輸入型別（全部選填）
 */
export type UpdateRecipeInput = Partial<CreateRecipeInput> & {
  isFavorite?: boolean;
};

/**
 * 分頁參數
 */
export type PaginationParams = {
  limit?: number;
  offset?: number;
};

/**
 * 食譜列表回應
 */
export type RecipeListResponse = {
  recipes: SavedRecipe[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
};
