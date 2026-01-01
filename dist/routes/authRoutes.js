/**
 * Auth Routes
 * 處理 AI 後端的 Session 同步與登出
 */
import { Router } from "express";
const router = Router();
/**
 * POST /auth/sync-session
 * 前端登入後將 Token 同步給 AI 後端，設定 HttpOnly Cookie
 */
router.post("/sync-session", (req, res) => {
    const { token, userId } = req.body;
    if (!token) {
        return res.status(400).json({ success: false, error: "Token is required" });
    }
    // 設定 HttpOnly Cookie
    // 有效期設為 7 天（或與主後端 Token 一致）
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in ms
    res.cookie("ai_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production", // 生產環境強制 HTTPS
        sameSite: "none", // 跨域需設定為 none
        path: "/",
        maxAge,
    });
    // 同時儲存 userId（可選，用於快速存取）
    if (userId) {
        res.cookie("ai_user_id", userId, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "none",
            path: "/",
            maxAge,
        });
    }
    console.log(`[Auth] Session synced for user: ${userId || "unknown"}`);
    res.json({ success: true, message: "Session synced successfully" });
});
/**
 * POST /auth/logout
 * 清除 AI 後端的 Cookie
 */
router.post("/logout", (_req, res) => {
    res.clearCookie("ai_token", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
    });
    res.clearCookie("ai_user_id", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
        path: "/",
    });
    console.log("[Auth] Session cleared");
    res.json({ success: true, message: "Logged out successfully" });
});
export default router;
