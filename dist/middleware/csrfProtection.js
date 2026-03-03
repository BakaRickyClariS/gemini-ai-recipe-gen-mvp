import cryptoRandomString from "crypto-random-string";
import { config } from "../config/unifiedConfig.js";
import { ApiError } from "../errors/ApiError.js";
const CSRF_COOKIE_NAME = "_csrf";
const CSRF_HEADER_NAME = "x-csrf-token";
/**
 * Generate CSRF token and set it in HttpOnly cookie
 */
export function generateCsrfToken(req, res, next) {
    try {
        // Generate a secure random string
        const token = cryptoRandomString({ length: 32, type: "base64" });
        // Store token in HttpOnly cookie
        res.cookie(CSRF_COOKIE_NAME, token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            path: "/",
            // Token lives shorter than JWT, maybe 1 hour is enough, but aligning with session is okay
        });
        // Pass token to controller to return to client
        req.csrfToken = token;
        next();
    }
    catch (error) {
        next(error);
    }
}
/**
 * Verify CSRF token from header matches cookie
 */
export function verifyCsrfToken(req, res, next) {
    // Only verify for state-changing methods
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
        return next();
    }
    const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
    const headerToken = req.headers[CSRF_HEADER_NAME];
    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
        return next(ApiError.forbidden("Invalid or missing CSRF token"));
    }
    next();
}
