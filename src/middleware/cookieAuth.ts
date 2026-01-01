/**
 * Cookie Auth Middleware
 * 從 Cookie 讀取 Token 進行驗證，向下相容 X-User-Id header
 */

import { Request, Response, NextFunction } from "express";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  token?: string;
}

/**
 * 驗證 Middleware
 * 優先從 Cookie 讀取，回退到 X-User-Id header
 */
export const cookieAuth = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  // 1. 優先從 Cookie 讀取
  const cookieToken = req.cookies?.["ai_token"];
  const cookieUserId = req.cookies?.["ai_user_id"];

  // 2. 回退到 Header（向下相容）
  const headerUserId = req.headers["x-user-id"] as string;

  // 設定到 request 物件
  if (cookieToken) {
    req.token = cookieToken;
  }

  if (cookieUserId) {
    req.userId = cookieUserId;
  } else if (headerUserId) {
    req.userId = headerUserId;
  }

  // 如果都沒有，回傳 401
  if (!req.userId && !cookieToken) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized: Missing authentication",
    });
  }

  next();
};

/**
 * 可選驗證 Middleware
 * 不強制要求登入，但會嘗試解析身份
 */
export const optionalCookieAuth = (
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
) => {
  const cookieToken = req.cookies?.["ai_token"];
  const cookieUserId = req.cookies?.["ai_user_id"];
  const headerUserId = req.headers["x-user-id"] as string;

  if (cookieToken) {
    req.token = cookieToken;
  }

  if (cookieUserId) {
    req.userId = cookieUserId;
  } else if (headerUserId) {
    req.userId = headerUserId;
  }

  next();
};
