/**
 * BaseController
 * 所有 v2 Controller 的基底類別
 * 遵循 backend-dev-guidelines：統一 handleSuccess / handleError
 */
import { z } from "zod";
import * as Sentry from "@sentry/node";
import { ApiError } from "../errors/ApiError.js";
export class BaseController {
    handleSuccess(res, data, status = 200) {
        const response = { success: true, data };
        res.status(status).json(response);
    }
    handleCreated(res, data) {
        this.handleSuccess(res, data, 201);
    }
    handleNoContent(res) {
        res.status(204).end();
    }
    handleError(error, res, context) {
        if (error instanceof ApiError) {
            res.status(error.statusCode).json({
                success: false,
                error: { code: error.code, message: error.message },
            });
            return;
        }
        if (error instanceof z.ZodError) {
            res.status(422).json({
                success: false,
                error: {
                    code: "VALIDATION_ERROR",
                    message: "Validation failed",
                    details: error.issues,
                },
            });
            return;
        }
        // 非預期錯誤 → Sentry + 泛型回應
        Sentry.captureException(error);
        console.error(`[${context}] Unexpected:`, error);
        res.status(500).json({
            success: false,
            error: { code: "INTERNAL_ERROR", message: "Internal server error" },
        });
    }
}
