/**
 * Rate Limiting 中介軟體
 * 遵循 security-review：API 100/15min、Auth 10/min
 */

import rateLimit from "express-rate-limit";

/** 通用 API 限制：100 requests / 15 min */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later",
    },
  },
});

/** 認證端點限制：10 requests / min */
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "RATE_LIMITED",
      message: "Too many auth requests, please try again later",
    },
  },
});
