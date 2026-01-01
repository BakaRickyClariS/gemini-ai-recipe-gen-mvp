import express from 'express';
import { notificationService } from '../services/notificationService.js';
const router = express.Router();
// Middleware: 提取 userId
// 假設 index.ts 裡的 cors 或其他 middleware 已經處理了 authentication
// 這裡直接從 headers 拿 x-user-id，確保安全性應由前置 Gateway 或 Auth Middleware 負責
const requireUser = (req, res, next) => {
    const userId = req.headers['x-user-id'];
    if (!userId || userId === 'anonymous') {
        return res.status(401).json({ error: 'Unauthorized: Missing or invalid x-user-id' });
    }
    // Store in request for typing if needed, but simple var is fine
    req.userId = userId;
    next();
};
// 1. 註冊 FCM Token
router.post('/token', requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const { fcmToken } = req.body;
        if (!fcmToken) {
            return res.status(400).json({ error: 'fcmToken is required' });
        }
        await notificationService.registerToken(userId, fcmToken);
        res.json({ success: true, message: 'Token registered' });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// 2. 取得設定
router.get('/settings', requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const settings = await notificationService.getSettings(userId);
        res.json({ success: true, data: settings });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// 3. 更新設定
router.patch('/settings', requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        await notificationService.updateSettings(userId, req.body);
        // 回傳更新後的設定
        const newSettings = await notificationService.getSettings(userId);
        res.json({ success: true, data: newSettings });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// 4. 取得通知列表
router.get('/', requireUser, async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const result = await notificationService.getNotifications(userId, page, limit);
        res.json({
            success: true,
            data: result.notifications,
            pagination: {
                page,
                limit,
                total: result.total
            },
            unreadCount: result.unreadCount
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
// 5. 發送通知給多個使用者 (供前端呼叫)
router.post('/send', requireUser, async (req, res) => {
    try {
        const { userIds, title, body, type, action } = req.body;
        // 驗證必要欄位
        if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
            console.error('[Notification] Send Error: userIds invalid:', { userIds, body: req.body });
            return res.status(400).json({ error: 'userIds must be a non-empty array' });
        }
        if (!title || !body || !type) {
            console.error('[Notification] Send Error: missing fields:', { title, body, type, reqBody: req.body });
            return res.status(400).json({ error: 'title, body, and type are required' });
        }
        const results = await notificationService.sendToMultiple(userIds, title, body, type, action);
        res.json({
            success: true,
            data: {
                sent: results.success.length,
                failed: results.failed.length,
                details: results
            }
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
export default router;
