/**
 * V1RecipeController
 * 儲存的食譜 CRUD
 */

import type { Response } from "express";
import { BaseController } from "./BaseController.js";
import type { AuthenticatedRequest } from "../middleware/cookieAuth.js";
import {
  createRecipe,
  getRecipesByUserId,
  getRecipeById,
  updateRecipe,
  deleteRecipe,
} from "../services/recipeStorageService.js";
import type {
  CreateRecipeInput,
  UpdateRecipeInput,
} from "../types/savedRecipe.js";

export class V1RecipeController extends BaseController {
  /** POST / — 新增食譜 */
  async create(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(400).json({ success: false, error: "缺少使用者身份" });
        return;
      }

      const input: CreateRecipeInput = req.body;
      if (!input.name || !input.ingredients || !input.steps) {
        res.status(400).json({
          success: false,
          error: "缺少必要欄位：name, ingredients, steps",
        });
        return;
      }

      const recipe = await createRecipe(userId, input);
      this.handleCreated(res, recipe);
    } catch (error) {
      this.handleError(error, res, "V1RecipeController.create");
    }
  }

  /** GET / — 取得食譜列表 */
  async list(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = (req.query.userId as string) || req.userId;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: "請提供 userId 查詢參數或登入",
        });
        return;
      }

      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await getRecipesByUserId(userId, { limit, offset });
      this.handleSuccess(res, result);
    } catch (error) {
      this.handleError(error, res, "V1RecipeController.list");
    }
  }

  /** GET /:id — 取得單一食譜 */
  async getById(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const recipe = await getRecipeById(id);

      if (!recipe) {
        res.status(404).json({ success: false, error: "找不到該食譜" });
        return;
      }

      this.handleSuccess(res, recipe);
    } catch (error) {
      this.handleError(error, res, "V1RecipeController.getById");
    }
  }

  /** PUT /:id — 更新食譜 */
  async update(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(400).json({ success: false, error: "缺少使用者身份" });
        return;
      }

      const { id } = req.params;
      const input: UpdateRecipeInput = req.body;
      const recipe = await updateRecipe(id, userId, input);

      if (!recipe) {
        res.status(404).json({
          success: false,
          error: "找不到該食譜或您沒有權限修改",
        });
        return;
      }

      this.handleSuccess(res, recipe);
    } catch (error) {
      this.handleError(error, res, "V1RecipeController.update");
    }
  }

  /** DELETE /:id — 刪除食譜 */
  async remove(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.userId;
      if (!userId) {
        res.status(400).json({ success: false, error: "缺少使用者身份" });
        return;
      }

      const { id } = req.params;
      const deleted = await deleteRecipe(id, userId);

      if (!deleted) {
        res.status(404).json({
          success: false,
          error: "找不到該食譜或您沒有權限刪除",
        });
        return;
      }

      res.json({ success: true, message: "食譜已刪除" });
    } catch (error) {
      this.handleError(error, res, "V1RecipeController.remove");
    }
  }
}
