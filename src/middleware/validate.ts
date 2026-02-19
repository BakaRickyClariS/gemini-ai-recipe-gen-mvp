/**
 * Zod Schema 驗證中介軟體
 * 遵循 coding-standards：所有輸入用 Zod 驗證
 */

import type { Request, Response, NextFunction } from "express";
import { z } from "zod";

export function validate(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
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
      next(error);
    }
  };
}

/**
 * 驗證 query params
 */
export function validateQuery(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.query);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(422).json({
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid query parameters",
            details: error.issues,
          },
        });
        return;
      }
      next(error);
    }
  };
}
