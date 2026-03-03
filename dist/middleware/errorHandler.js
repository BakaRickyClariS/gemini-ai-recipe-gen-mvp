/**
 * AI 食譜 API 錯誤處理
 * 對應 docs/ai_recipe_api_spec.md 規格
 */
// ===== 錯誤代碼定義 =====
export const AIErrorCodes = {
    AI_001: { status: 400, message: "Prompt 不可為空" },
    AI_002: { status: 400, message: "Prompt 過長（超過 1000 字）" },
    AI_003: { status: 429, message: "已達每日查詢上限" },
    AI_004: { status: 401, message: "未授權（需登入）" },
    AI_005: { status: 500, message: "AI 服務暫時無法使用" },
    AI_006: { status: 504, message: "AI 生成逾時" },
    AI_007: { status: 400, message: "輸入內容包含不允許的指令或關鍵字" },
};
// ===== 自訂錯誤類別 =====
export class AIRecipeError extends Error {
    code;
    httpStatus;
    details;
    constructor(code, details, customMessage) {
        const errorDef = AIErrorCodes[code];
        super(customMessage || errorDef.message);
        this.code = code;
        this.httpStatus = errorDef.status;
        this.details = details;
        this.name = "AIRecipeError";
    }
    toResponse() {
        return {
            code: this.code,
            message: this.message,
            details: this.details,
            timestamp: new Date().toISOString(),
        };
    }
}
// ===== 錯誤處理中介層 =====
export function aiRecipeErrorHandler(err, _req, res, next) {
    if (err instanceof AIRecipeError) {
        res.status(err.httpStatus).json(err.toResponse());
        return;
    }
    // 若不是 AI 專屬錯誤，交給下一個 global error handler 處理 (e.g. ApiError)
    next(err);
}
// ===== 驗證中介層 =====
const PROMPT_MAX_LENGTH = 4000;
/**
 * Express 中介層：驗證 AI 食譜請求
 */
export function validateAIRecipeRequest(req, _res, next) {
    const prompt = req.body?.prompt;
    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
        return next(new AIRecipeError("AI_001"));
    }
    if (prompt.length > PROMPT_MAX_LENGTH) {
        return next(new AIRecipeError("AI_002", {
            maxLength: PROMPT_MAX_LENGTH,
            actualLength: prompt.length,
        }));
    }
    next();
}
