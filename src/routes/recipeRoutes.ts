/**
 * 食譜儲存 API 路由
 */

import { Router } from "express";
import {
  createRecipe,
  getRecipesByUserId,
  getRecipeById,
  updateRecipe,
  deleteRecipe,
} from "../services/recipeStorageService.js";
import type { CreateRecipeInput, UpdateRecipeInput } from "../types/savedRecipe.js";

const router = Router();

/**
 * POST /api/v1/recipes - 新增食譜
 */
router.post("/", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "缺少 X-User-Id header",
      });
    }

    const input: CreateRecipeInput = req.body;

    // 基本驗證
    if (!input.name || !input.ingredients || !input.steps) {
      return res.status(400).json({
        success: false,
        error: "缺少必要欄位：name, ingredients, steps",
      });
    }

    const recipe = await createRecipe(userId, input);

    return res.status(201).json({
      success: true,
      data: recipe,
    });
  } catch (error: any) {
    console.error("[Recipe API] Create error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "建立食譜失敗",
    });
  }
});

/**
 * GET /api/v1/recipes - 取得食譜列表
 */
router.get("/", async (req, res) => {
  try {
    const userId = (req.query.userId as string) || (req.headers["x-user-id"] as string);

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "請提供 userId 查詢參數或 X-User-Id header",
      });
    }

    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await getRecipesByUserId(userId, { limit, offset });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("[Recipe API] List error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "取得食譜列表失敗",
    });
  }
});

/**
 * GET /api/v1/recipes/:id - 取得單一食譜
 */
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const recipe = await getRecipeById(id);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: "找不到該食譜",
      });
    }

    return res.json({
      success: true,
      data: recipe,
    });
  } catch (error: any) {
    console.error("[Recipe API] Get error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "取得食譜失敗",
    });
  }
});

/**
 * PUT /api/v1/recipes/:id - 更新食譜
 */
router.put("/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "缺少 X-User-Id header",
      });
    }

    const { id } = req.params;
    const input: UpdateRecipeInput = req.body;

    const recipe = await updateRecipe(id, userId, input);

    if (!recipe) {
      return res.status(404).json({
        success: false,
        error: "找不到該食譜或您沒有權限修改",
      });
    }

    return res.json({
      success: true,
      data: recipe,
    });
  } catch (error: any) {
    console.error("[Recipe API] Update error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "更新食譜失敗",
    });
  }
});

/**
 * DELETE /api/v1/recipes/:id - 刪除食譜
 */
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.headers["x-user-id"] as string;

    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "缺少 X-User-Id header",
      });
    }

    const { id } = req.params;
    const deleted = await deleteRecipe(id, userId);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: "找不到該食譜或您沒有權限刪除",
      });
    }

    return res.json({
      success: true,
      message: "食譜已刪除",
    });
  } catch (error: any) {
    console.error("[Recipe API] Delete error:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "刪除食譜失敗",
    });
  }
});

export default router;
