/**
 * V2RecipeController
 * 儲存的食譜 CRUD (相容於 v2 API 的 JWT 認證)
 */
import { BaseController } from "./BaseController.js";
import { createRecipe, getRecipesByUserId, getRecipeById, updateRecipe, deleteRecipe, } from "../services/recipeStorageService.js";
import { ApiError } from "../errors/ApiError.js";
export class V2RecipeController extends BaseController {
    /** POST / — 新增食譜 */
    async create(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw ApiError.unauthorized("缺少使用者身份");
            }
            const input = req.body;
            if (!input.name || !input.ingredients || !input.steps) {
                throw ApiError.badRequest("缺少必要欄位：name, ingredients, steps");
            }
            const recipe = await createRecipe(userId, input);
            this.handleCreated(res, recipe);
        }
        catch (error) {
            this.handleError(error, res, "V2RecipeController.create");
        }
    }
    /** GET / — 取得食譜列表 */
    async list(req, res) {
        try {
            const userId = req.query.userId || req.user?.userId;
            if (!userId) {
                throw ApiError.badRequest("請提供 userId 查詢參數或登入");
            }
            const limit = parseInt(req.query.limit) || 20;
            const offset = parseInt(req.query.offset) || 0;
            const result = await getRecipesByUserId(userId, { limit, offset });
            this.handleSuccess(res, result);
        }
        catch (error) {
            this.handleError(error, res, "V2RecipeController.list");
        }
    }
    /** GET /:id — 取得單一食譜 */
    async getById(req, res) {
        try {
            const { id } = req.params;
            const recipe = await getRecipeById(id);
            if (!recipe) {
                throw ApiError.notFound("找不到該食譜");
            }
            this.handleSuccess(res, recipe);
        }
        catch (error) {
            this.handleError(error, res, "V2RecipeController.getById");
        }
    }
    /** PUT /:id — 更新食譜 */
    async update(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw ApiError.unauthorized("缺少使用者身份");
            }
            const { id } = req.params;
            const input = req.body;
            const recipe = await updateRecipe(id, userId, input);
            if (!recipe) {
                throw ApiError.notFound("找不到該食譜或您沒有權限修改");
            }
            this.handleSuccess(res, recipe);
        }
        catch (error) {
            this.handleError(error, res, "V2RecipeController.update");
        }
    }
    /** DELETE /:id — 刪除食譜 */
    async remove(req, res) {
        try {
            const userId = req.user?.userId;
            if (!userId) {
                throw ApiError.unauthorized("缺少使用者身份");
            }
            const { id } = req.params;
            const deleted = await deleteRecipe(id, userId);
            if (!deleted) {
                throw ApiError.notFound("找不到該食譜或您沒有權限刪除");
            }
            this.handleSuccess(res, { message: "食譜已刪除" });
        }
        catch (error) {
            this.handleError(error, res, "V2RecipeController.remove");
        }
    }
}
