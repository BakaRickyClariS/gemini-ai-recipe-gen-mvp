/**
 * BaseController
 * 所有 v2 Controller 的基底類別
 * 遵循 backend-dev-guidelines：統一 handleSuccess / handleError
 */

import type { Response } from "express";
import { z } from "zod";
import * as Sentry from "@sentry/node";
import { ApiError } from "../errors/ApiError.js";
import type { ApiResponse } from "../types/common.js";

export abstract class BaseController {
  protected handleSuccess<T>(res: Response, data: T, status = 200): void {
    const response: ApiResponse<T> = { success: true, data };
    res.status(status).json(response);
  }

  protected handleCreated<T>(res: Response, data: T): void {
    this.handleSuccess(res, data, 201);
  }

  protected handleNoContent(res: Response): void {
    res.status(204).end();
  }

  protected handleError(error: unknown, res: Response, context: string): void {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({
        success: false,
        error: { code: error.code, message: error.message },
      } satisfies ApiResponse);
      return;
    }

    if (error instanceof z.ZodError) {
      // v2: 提取第一個錯誤訊息到頂層
      const isV2 = res.req.originalUrl.startsWith("/api/v2");
      const message = isV2
        ? error.issues[0]?.message || "驗證失敗"
        : "Validation failed";

      res.status(422).json({
        success: false,
        message,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: error.issues,
        },
      } satisfies ApiResponse);
      return;
    }

    // 非預期錯誤 → Sentry + 泛型回應
    Sentry.captureException(error);
    console.error(`[${context}] Unexpected:`, error);

    res.status(500).json({
      success: false,
      error: { code: "INTERNAL_ERROR", message: "Internal server error" },
    } satisfies ApiResponse);
  }
}
