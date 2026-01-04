import express from "express";
import { notificationService } from "../services/notificationService.js";
const router = express.Router();
// Middleware: 提取 userId
// 假設 index.ts 裡的 cors 或其他 middleware 已經處理了 authentication
// 這裡直接從 headers 拿 x-user-id，確保安全性應由前置 Gateway 或 Auth Middleware 負責
const requireUser = (req, res, next) => {
    const userId = req.headers["x-user-id"];
    if (!userId || userId === "anonymous") {
        return res
            .status(401)
            .json({ error: "Unauthorized: Missing or invalid x-user-id" });
    }
    // Store in request for typing if needed, but simple var is fine
    req.userId = userId;
    next();
};
// 0. 批次標記已讀
router.post("/batch-read", requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { ids, isRead = true } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: "ids array is required" });
        }
        const result = await notificationService.batchMarkAsRead(userId, ids, isRead);
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// 0.5 批次刪除
router.post("/batch-delete", requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids)) {
            return res.status(400).json({ error: "ids array is required" });
        }
        const result = await notificationService.batchDelete(userId, ids);
        res.json({ success: true, data: result });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// 1. 註冊 FCM Token（支援多裝置）
router.post("/token", requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { fcmToken, platform = "web" } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ error: "fcmToken is required" });
        }
        await notificationService.registerToken(userId, fcmToken, platform);
        res.json({ success: true, message: "Token registered successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// 1.5 刪除 FCM Token（登出時呼叫）
router.delete("/token", requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ error: "fcmToken is required" });
        }
        await notificationService.removeToken(userId, fcmToken);
        res.json({ success: true, message: "Token removed successfully" });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// 2. 取得設定
router.get("/settings", requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const settings = await notificationService.getSettings(userId);
        res.json({ success: true, data: settings });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// 3. 更新設定
router.patch("/settings", requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        await notificationService.updateSettings(userId, req.body);
        // 回傳更新後的設定
        const newSettings = await notificationService.getSettings(userId);
        res.json({ success: true, data: newSettings });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// 4. 取得通知列表
router.get("/", requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const category = req.query.category;
        const result = await notificationService.getNotifications(userId, page, limit, category);
        res.json({
            success: true,
            data: {
                items: result.notifications,
                total: result.total,
                unreadCount: result.unreadCount,
            },
            pagination: {
                page,
                limit,
                total: result.total,
            },
            unreadCount: result.unreadCount,
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
// 5. 發送通知系統 (供前端或系統呼叫)
router.post("/send", requireUser, async (req, res) => {
    try {
        console.log("[Notification] Incoming request /send:", req.body);
        const { userIds, groupId, title, body, type, action, category, subType, groupName, actorName } = req.body;
        // 驗證必要欄位
        if (!title || !body || !type) {
            return res
                .status(400)
                .json({ error: "title, body, and type are required" });
        }
        // 判斷發送模式：優先使用 groupId
        if (groupId) {
            console.log(`[Notification] Using groupId broadcast mode: ${groupId}`);
            const operatorId = req.userId; // 從 header 拿到的當前使用者
            // 如果 groupName 前端沒有傳，service 內部會嘗試去查，但若前端有傳就直接用
            // actorName 也可以由前端傳入 (例如 "Ricky")，若沒傳則為 null
            await notificationService.sendToRefrigeratorMembers(groupId, title, body, type, action, category, // 這裡如果不傳，send 會走自動映射
            operatorId, subType, actorName, groupName);
            return res.json({
                success: true,
                message: `Broadcast to group ${groupId} initiated`,
            });
        }
        // 備選模式：userIds 陣列
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            return res
                .status(400)
                .json({ error: "Either groupId or userIds array is required" });
        }
        const results = await notificationService.sendToMultiple(userIds, title, body, type, action, subType, groupName, actorName);
        res.json({
            success: true,
            data: {
                sent: results.success.length,
                failed: results.failed.length,
                details: results,
            },
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
export default router;
