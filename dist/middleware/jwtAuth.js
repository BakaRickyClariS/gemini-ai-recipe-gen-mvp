/**
 * JWT 認證中介軟體
 * 遵循 security-review：HttpOnly Cookie + Token 驗證
 */
import jwt from "jsonwebtoken";
import { config } from "../config/unifiedConfig.js";
import { ApiError } from "../errors/ApiError.js";
/**
 * 從 Cookie 或 Authorization header 提取並驗證 JWT
 */
export function jwtAuth(req, _res, next) {
    try {
        const token = req.cookies?.access_token ||
            req.headers.authorization?.replace("Bearer ", "");
        if (!token) {
            throw ApiError.unauthorized("Missing authentication token");
        }
        const payload = jwt.verify(token, config.jwt.secret);
        if (!payload.userId) {
            throw ApiError.unauthorized("Invalid token payload");
        }
        req.user = payload;
        next();
    }
    catch (error) {
        if (error instanceof ApiError) {
            next(error);
            return;
        }
        if (error instanceof jwt.TokenExpiredError) {
            next(ApiError.unauthorized("Token expired"));
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            next(ApiError.unauthorized("Invalid token"));
            return;
        }
        next(error);
    }
}
/**
 * 可選認證：有 token 就解析，沒有也放行
 */
export function optionalAuth(req, _res, next) {
    try {
        const token = req.cookies?.access_token ||
            req.headers.authorization?.replace("Bearer ", "");
        if (token) {
            const payload = jwt.verify(token, config.jwt.secret);
            req.user = payload;
        }
        next();
    }
    catch {
        // Token 無效也放行
        next();
    }
}
