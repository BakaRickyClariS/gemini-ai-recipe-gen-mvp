/**
 * Rate Limiting Middleware
 * 實作多層次的速率限制：每分鐘、每小時、每日
 *
 * NOTE: 目前此模組尚未在 index.ts 中啟用，待前端與其他服務準備就緒後再行掛載。
 */
import { logSecurityEvent } from "../services/securityLogger.js";
// 環境變數設定
const LIMIT_PER_MINUTE = parseInt(process.env.AI_RATE_LIMIT_PER_MINUTE || "5");
const LIMIT_PER_HOUR = parseInt(process.env.AI_RATE_LIMIT_PER_HOUR || "20");
const LIMIT_PER_DAY = parseInt(process.env.AI_DAILY_LIMIT || "3");
// 簡單的記憶體儲存 (在 Serverless 環境下可能會有狀態不一致問題，建議未來遷移至 Redis)
const requestStore = new Map();
function getClientIdentifier(req) {
    // 優先使用 User ID，若無則使用 IP
    const userId = req.headers["x-user-id"];
    if (userId && userId !== "anonymous") {
        return `user:${userId}`;
    }
    return `ip:${req.ip || "unknown"}`;
}
export function aiRateLimiter(req, res, next) {
    const now = Date.now();
    const clientId = getClientIdentifier(req);
    let entry = requestStore.get(clientId);
    // 初始化或重置過期視窗
    if (!entry) {
        entry = {
            minuteCount: 0,
            minuteReset: now + 60 * 1000,
            hourCount: 0,
            hourReset: now + 60 * 60 * 1000,
            dayCount: 0,
            dayReset: now + 24 * 60 * 60 * 1000,
        };
    }
    else {
        // 檢查視窗是否過期並重置計數
        if (now > entry.minuteReset) {
            entry.minuteCount = 0;
            entry.minuteReset = now + 60 * 1000;
        }
        if (now > entry.hourReset) {
            entry.hourCount = 0;
            entry.hourReset = now + 60 * 60 * 1000;
        }
        // 每日限制的重置邏輯通常建議以「天」為單位（例如每天 00:00），這裡簡化為 24 小時滑動視窗
        if (now > entry.dayReset) {
            entry.dayCount = 0;
            entry.dayReset = now + 24 * 60 * 60 * 1000;
        }
    }
    // 檢查限制
    if (entry.minuteCount >= LIMIT_PER_MINUTE) {
        logWithBlock(clientId, "minute");
        return res.status(429).json({
            success: false,
            code: "AI_008",
            message: "每分鐘請求次數過多，請稍後再試。",
            retryAfter: Math.ceil((entry.minuteReset - now) / 1000),
        });
    }
    if (entry.hourCount >= LIMIT_PER_HOUR) {
        logWithBlock(clientId, "hour");
        return res.status(429).json({
            success: false,
            code: "AI_009",
            message: "每小時請求次數過多，請休息一下。",
            retryAfter: Math.ceil((entry.hourReset - now) / 1000),
        });
    }
    if (entry.dayCount >= LIMIT_PER_DAY) {
        logWithBlock(clientId, "day");
        return res.status(429).json({
            success: false,
            code: "AI_003",
            message: "今天的 AI 使用額度已用完，請明天再來。",
            retryAfter: Math.ceil((entry.dayReset - now) / 1000),
        });
    }
    // 增加計數
    entry.minuteCount++;
    entry.hourCount++;
    entry.dayCount++;
    requestStore.set(clientId, entry);
    next();
}
function logWithBlock(clientId, type) {
    const userId = clientId.startsWith("user:")
        ? clientId.split(":")[1]
        : undefined;
    logSecurityEvent({
        type: "RATE_LIMIT_HIT",
        userId,
        timestamp: new Date().toISOString(),
        details: { limitType: type, clientId },
    });
}
