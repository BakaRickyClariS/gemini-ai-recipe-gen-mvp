import { messaging } from "../lib/firebase.js";
import { query } from "../db/index.js";
export const notificationService = {
    /**
     * 註冊或更新 FCM Token
     */
    registerToken: async (userId, token) => {
        // Upsert user to ensure they exist and have the token
        const sql = `
      INSERT INTO users (id, fcm_token, created_at)
      VALUES ($1, $2, NOW())
      ON CONFLICT (id) 
      DO UPDATE SET fcm_token = $2;
    `;
        await query(sql, [userId, token]);
    },
    /**
     * 取得通知設定
     */
    getSettings: async (userId) => {
        // 確保使用者存在，若不存在回傳預設值
        const sql = `SELECT notify_push, notify_expiry, notify_low_stock, days_before_expiry, notify_marketing FROM users WHERE id = $1`;
        const result = await query(sql, [userId]);
        if (result.rowCount === 0) {
            // 預設值
            return {
                notifyPush: true,
                notifyExpiry: true,
                notifyLowStock: true,
                daysBeforeExpiry: 3,
                notifyMarketing: false,
            };
        }
        const row = result.rows[0];
        return {
            notifyPush: row.notify_push,
            notifyExpiry: row.notify_expiry,
            notifyLowStock: row.notify_low_stock ?? true,
            daysBeforeExpiry: row.days_before_expiry ?? 3,
            notifyMarketing: row.notify_marketing,
        };
    },
    /**
     * 更新通知設定
     */
    updateSettings: async (userId, settings) => {
        // 構建動態更新 SQL
        // 先確保使用者存在 (如果是第一次只想改設定但沒 Token，也應該要有 User 紀錄)
        // 這裡簡單做：如果 User 不存在先建立一個沒 Token 的
        const ensureUserSql = `
      INSERT INTO users (id, created_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING;
    `;
        await query(ensureUserSql, [userId]);
        const updates = [];
        const values = [userId];
        let paramIndex = 2; // $1 is userId
        if (settings.notifyPush !== undefined) {
            updates.push(`notify_push = $${paramIndex++}`);
            values.push(settings.notifyPush);
        }
        if (settings.notifyExpiry !== undefined) {
            updates.push(`notify_expiry = $${paramIndex++}`);
            values.push(settings.notifyExpiry);
        }
        if (settings.notifyLowStock !== undefined) {
            updates.push(`notify_low_stock = $${paramIndex++}`);
            values.push(settings.notifyLowStock);
        }
        if (settings.daysBeforeExpiry !== undefined) {
            updates.push(`days_before_expiry = $${paramIndex++}`);
            values.push(settings.daysBeforeExpiry);
        }
        if (settings.notifyMarketing !== undefined) {
            updates.push(`notify_marketing = $${paramIndex++}`);
            values.push(settings.notifyMarketing);
        }
        if (updates.length > 0) {
            const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = $1`;
            await query(sql, values);
        }
    },
    /**
     * 取得通知列表
     */
    getNotifications: async (userId, page = 1, limit = 20, category) => {
        const offset = (page - 1) * limit;
        // 查詢總數
        let countSql = `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`;
        let countParams = [userId];
        if (category) {
            countSql += ` AND category = $2`;
            countParams.push(category);
        }
        const countResult = await query(countSql, countParams);
        const total = parseInt(countResult.rows[0]?.total || "0", 10);
        // 查詢未讀數（不篩選 category）
        const unreadSql = `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = false`;
        const unreadResult = await query(unreadSql, [userId]);
        const unreadCount = parseInt(unreadResult.rows[0]?.unread || "0", 10);
        // 查詢分頁資料
        let sql = `
      SELECT id, category, type, title, message, is_read, action_type, action_payload, created_at
      FROM notifications
      WHERE user_id = $1
    `;
        let params = [userId];
        let paramIndex = 2;
        if (category) {
            sql += ` AND category = $${paramIndex++}`;
            params.push(category);
        }
        sql += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);
        const result = await query(sql, params);
        // 轉換成前端易讀格式
        const notifications = result.rows.map((row) => ({
            id: row.id,
            category: row.category || "system",
            type: row.type,
            title: row.title,
            message: row.message,
            isRead: row.is_read,
            action: {
                type: row.action_type,
                payload: row.action_payload,
            },
            createdAt: row.created_at,
        }));
        return { notifications, total, unreadCount };
    },
    /**
     * 發送通知核心邏輯
     */
    /**
     * 發送通知核心邏輯
     */
    send: async (userId, title, body, type, action, category) => {
        // 1. 自動映射分類 (Mapping logic based on extension spec)
        let finalCategory = category;
        if (!finalCategory) {
            if (type === "shopping" || type === "inventory") {
                finalCategory = "stock";
            }
            else if (type === "recipe") {
                finalCategory = "inspiration";
            }
            else if (type === "group" || type === "system") {
                finalCategory = "official";
            }
            else {
                finalCategory = "stock"; // 庫存管理為預設主要業務
            }
        }
        // 1. 取得使用者設定
        const userResult = await query(`SELECT * FROM users WHERE id = $1`, [
            userId,
        ]);
        let user = userResult.rows[0];
        // 如果使用者不存在，自動建立 (為了 Notification Center 能顯示)
        if (!user) {
            await query(`INSERT INTO users (id, created_at) VALUES ($1, NOW())`, [
                userId,
            ]);
            const newUserResult = await query(`SELECT * FROM users WHERE id = $1`, [
                userId,
            ]);
            user = newUserResult.rows[0];
        }
        // 2. 判斷是否需要發送推播
        let shouldSendPush = user.notify_push && user.fcm_token;
        // 細部過濾
        if (type === "inventory" && !user.notify_expiry)
            shouldSendPush = false;
        if (type === "marketing" && !user.notify_marketing)
            shouldSendPush = false;
        // 3. 寫入資料庫 (Notification Center)
        const insertSql = `
      INSERT INTO notifications (user_id, category, type, title, message, action_type, action_payload)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;
        const actionType = action?.type || null;
        const actionPayload = action?.payload
            ? JSON.stringify(action.payload)
            : null;
        await query(insertSql, [
            userId,
            finalCategory,
            type,
            title,
            body,
            actionType,
            actionPayload,
        ]);
        // 4. 發送 FCM
        if (shouldSendPush && user.fcm_token) {
            try {
                await messaging.send({
                    token: user.fcm_token,
                    notification: { title, body },
                    data: {
                        type,
                        actionType: actionType || "",
                        // actionPayload 通常很大或結構複雜，FCM data 只能扁平 key-value string
                        // 建議只傳 ID 讓前端去 fetch，這裡依照 plan 傳 actionId
                        actionId: action?.payload?.id || "",
                    },
                });
                console.log(`[Notification] Push sent to user ${userId}`);
            }
            catch (error) {
                console.error("[Notification] FCM Send Error:", error);
                // 如果 token 失效，可以考慮 UPDATE users SET fcm_token = NULL WHERE id = ...
                if (error.code === "messaging/registration-token-not-registered") {
                    await query(`UPDATE users SET fcm_token = NULL WHERE id = $1`, [
                        userId,
                    ]);
                }
            }
        }
    },
    /**
     * 發送通知給多個使用者（供前端呼叫）
     */
    sendToMultiple: async (userIds, title, body, type, action) => {
        const results = {
            success: [],
            failed: [],
        };
        for (const userId of userIds) {
            try {
                await notificationService.send(userId, title, body, type, action);
                results.success.push(userId);
            }
            catch (error) {
                console.error(`[Notification] Failed to send to ${userId}:`, error);
                results.failed.push(userId);
            }
        }
        return results;
    },
    /**
     * 發送通知給冰箱（群組）的所有成員
     */
    sendToRefrigeratorMembers: async (refrigeratorId, title, body, type, action, category = "stock", operatorId) => {
        // 1. 找出該冰箱的所有成員
        // 我們假設 inventory_settings 有所有成員的設定資料
        const membersResult = await query(`SELECT DISTINCT user_id FROM inventory_settings WHERE refrigerator_id = $1`, [refrigeratorId]);
        let memberIds = membersResult.rows.map((row) => row.user_id);
        // 確保操作者自己一定會收到（如果他不在設定名單中）
        if (operatorId && !memberIds.includes(operatorId)) {
            memberIds.push(operatorId);
        }
        // 如果還是沒有成員
        if (memberIds.length === 0) {
            console.warn(`[Notification] No members found for refrigerator ${refrigeratorId}. Broadcast skipped.`);
            return;
        }
        console.log(`[Notification] Broadcasting to refrigerator ${refrigeratorId} members:`, memberIds);
        // 2. 逐一發送
        for (const memberId of memberIds) {
            try {
                await notificationService.send(memberId, title, body, type, action, category);
            }
            catch (error) {
                console.error(`[Notification] Failed to send group notification to ${memberId}:`, error);
            }
        }
    },
};
