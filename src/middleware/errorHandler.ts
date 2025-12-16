/**
 * AI 食譜 API 錯誤處理
 * 對應 docs/ai_recipe_api_spec.md 規格
 */

import type { Request, Response, NextFunction } from "express";
import type { AIRecipeErrorResponse } from "../types/aiRecipe.js";

// ===== 錯誤代碼定義 =====

export const AIErrorCodes = {
  AI_001: { status: 400, message: "Prompt 不可為空" },
  AI_002: { status: 400, message: "Prompt 過長（超過 1000 字）" },
  AI_003: { status: 429, message: "已達每日查詢上限" },
  AI_004: { status: 401, message: "未授權（需登入）" },
  AI_005: { status: 500, message: "AI 服務暫時無法使用" },
  AI_006: { status: 504, message: "AI 生成逾時" },
} as const;

export type AIErrorCode = keyof typeof AIErrorCodes;

// ===== 自訂錯誤類別 =====

export class AIRecipeError extends Error {
  public code: AIErrorCode;
  public httpStatus: number;
  public details?: Record<string, unknown>;

  constructor(
    code: AIErrorCode,
    details?: Record<string, unknown>,
    customMessage?: string
  ) {
    const errorDef = AIErrorCodes[code];
    super(customMessage || errorDef.message);
    this.code = code;
    this.httpStatus = errorDef.status;
    this.details = details;
    this.name = "AIRecipeError";
  }

  toResponse(): AIRecipeErrorResponse {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString(),
    };
  }
}

// ===== 錯誤處理中介層 =====

export function aiRecipeErrorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AIRecipeError) {
    res.status(err.httpStatus).json(err.toResponse());
    return;
  }

  // 未預期的錯誤
  console.error("[AI Recipe Error]", err);
  res.status(500).json({
    code: "AI_005",
    message: "AI 服務暫時無法使用",
    details: { originalError: err.message },
    timestamp: new Date().toISOString(),
  } satisfies AIRecipeErrorResponse);
}

// ===== 驗證函式 =====

const PROMPT_MAX_LENGTH = 1000;

export function validateAIRecipeRequest(prompt: unknown): void {
  if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
    throw new AIRecipeError("AI_001");
  }

  if (prompt.length > PROMPT_MAX_LENGTH) {
    throw new AIRecipeError("AI_002", {
      maxLength: PROMPT_MAX_LENGTH,
      actualLength: prompt.length,
    });
  }
}
