/**
 * 食譜儲存 Service
 * 處理食譜的 CRUD 操作
 */

import { query } from "../db/index.js";
import type {
  SavedRecipe,
  CreateRecipeInput,
  UpdateRecipeInput,
  PaginationParams,
  RecipeListResponse,
} from "../types/savedRecipe.js";

/**
 * 建立新食譜
 */
export const createRecipe = async (
  userId: string,
  input: CreateRecipeInput
): Promise<SavedRecipe> => {
  const sql = `
    INSERT INTO saved_recipes (
      user_id, name, category, description, image_url,
      servings, cook_time, difficulty,
      ingredients, seasonings, steps,
      source, original_prompt
    ) VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8,
      $9, $10, $11,
      'ai_generated', $12
    )
    RETURNING *
  `;

  const values = [
    userId,
    input.name,
    input.category || null,
    input.description || null,
    input.imageUrl || null,
    input.servings || 2,
    input.cookTime || null,
    input.difficulty || null,
    JSON.stringify(input.ingredients),
    JSON.stringify(input.seasonings || []),
    JSON.stringify(input.steps),
    input.originalPrompt || null,
  ];

  const result = await query(sql, values);
  return mapRowToRecipe(result.rows[0]);
};

/**
 * 取得使用者的食譜列表
 */
export const getRecipesByUserId = async (
  userId: string,
  pagination: PaginationParams = {}
): Promise<RecipeListResponse> => {
  const limit = pagination.limit || 20;
  const offset = pagination.offset || 0;

  // 取得總數
  const countSql = `SELECT COUNT(*) as total FROM saved_recipes WHERE user_id = $1`;
  const countResult = await query(countSql, [userId]);
  const total = parseInt(countResult.rows[0].total, 10);

  // 取得資料
  const sql = `
    SELECT * FROM saved_recipes
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2 OFFSET $3
  `;
  const result = await query(sql, [userId, limit, offset]);

  return {
    recipes: result.rows.map(mapRowToRecipe),
    pagination: { total, limit, offset },
  };
};

/**
 * 取得單一食譜
 */
export const getRecipeById = async (
  id: string
): Promise<SavedRecipe | null> => {
  const sql = `SELECT * FROM saved_recipes WHERE id = $1`;
  const result = await query(sql, [id]);

  if (result.rows.length === 0) {
    return null;
  }

  return mapRowToRecipe(result.rows[0]);
};

/**
 * 更新食譜
 */
export const updateRecipe = async (
  id: string,
  userId: string,
  input: UpdateRecipeInput
): Promise<SavedRecipe | null> => {
  // 先檢查權限
  const existing = await getRecipeById(id);
  if (!existing || existing.userId !== userId) {
    return null;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  // 動態建構 UPDATE 語句
  if (input.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(input.name);
  }
  if (input.category !== undefined) {
    updates.push(`category = $${paramIndex++}`);
    values.push(input.category);
  }
  if (input.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(input.description);
  }
  if (input.imageUrl !== undefined) {
    updates.push(`image_url = $${paramIndex++}`);
    values.push(input.imageUrl);
  }
  if (input.servings !== undefined) {
    updates.push(`servings = $${paramIndex++}`);
    values.push(input.servings);
  }
  if (input.cookTime !== undefined) {
    updates.push(`cook_time = $${paramIndex++}`);
    values.push(input.cookTime);
  }
  if (input.difficulty !== undefined) {
    updates.push(`difficulty = $${paramIndex++}`);
    values.push(input.difficulty);
  }
  if (input.ingredients !== undefined) {
    updates.push(`ingredients = $${paramIndex++}`);
    values.push(JSON.stringify(input.ingredients));
  }
  if (input.seasonings !== undefined) {
    updates.push(`seasonings = $${paramIndex++}`);
    values.push(JSON.stringify(input.seasonings));
  }
  if (input.steps !== undefined) {
    updates.push(`steps = $${paramIndex++}`);
    values.push(JSON.stringify(input.steps));
  }
  if (input.isFavorite !== undefined) {
    updates.push(`is_favorite = $${paramIndex++}`);
    values.push(input.isFavorite);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const sql = `
    UPDATE saved_recipes
    SET ${updates.join(", ")}
    WHERE id = $${paramIndex}
    RETURNING *
  `;

  const result = await query(sql, values);
  return mapRowToRecipe(result.rows[0]);
};

/**
 * 刪除食譜
 */
export const deleteRecipe = async (
  id: string,
  userId: string
): Promise<boolean> => {
  const sql = `DELETE FROM saved_recipes WHERE id = $1 AND user_id = $2`;
  const result = await query(sql, [id, userId]);
  return (result.rowCount || 0) > 0;
};

/**
 * 將資料庫 row 轉換為 SavedRecipe 型別
 * （處理 snake_case -> camelCase 轉換）
 */
const mapRowToRecipe = (row: any): SavedRecipe => {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    category: row.category,
    description: row.description,
    imageUrl: row.image_url,
    servings: row.servings,
    cookTime: row.cook_time,
    difficulty: row.difficulty,
    ingredients: typeof row.ingredients === "string" 
      ? JSON.parse(row.ingredients) 
      : row.ingredients,
    seasonings: typeof row.seasonings === "string" 
      ? JSON.parse(row.seasonings) 
      : row.seasonings || [],
    steps: typeof row.steps === "string" 
      ? JSON.parse(row.steps) 
      : row.steps,
    source: row.source,
    originalPrompt: row.original_prompt,
    isFavorite: row.is_favorite,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};
