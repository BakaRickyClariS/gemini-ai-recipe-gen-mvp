import { messaging } from "../lib/firebase.js";
import { query } from "../db/index.js";
export const notificationService = {
    /**
     * 註冊或更新 FCM Token（多裝置支援）
     * @param userId 使用者 ID
     * @param token FCM Token
     * @param platform 平台類型 (web | ios | android)
     */
    registerToken: async (userId, token, platform = "web") => {
        // 確保使用者存在
        const ensureUserSql = `
      INSERT INTO users (id, created_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING;
    `;
        await query(ensureUserSql, [userId]);
        // Upsert Token 到 fcm_tokens 表
        // 如果 Token 已存在（可能屬於其他使用者），更新為新使用者
        const sql = `
      INSERT INTO fcm_tokens (user_id, token, platform, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      ON CONFLICT (token) 
      DO UPDATE SET 
        user_id = $1,
        platform = $3,
        updated_at = NOW();
    `;
        await query(sql, [userId, token, platform]);
    },
    /**
     * 刪除 FCM Token（登出時呼叫）
     */
    removeToken: async (userId, token) => {
        const sql = `DELETE FROM fcm_tokens WHERE user_id = $1 AND token = $2`;
        await query(sql, [userId, token]);
    },
    /**
     * 取得使用者所有裝置的 FCM Tokens
     */
    getUserTokens: async (userId) => {
        const sql = `SELECT token FROM fcm_tokens WHERE user_id = $1`;
        const result = await query(sql, [userId]);
        return result.rows.map((row) => row.token);
    },
    /**
     * 刪除無效的 FCM Token
     */
    removeInvalidToken: async (token) => {
        const sql = `DELETE FROM fcm_tokens WHERE token = $1`;
        await query(sql, [token]);
        console.log(`[FCM] Removed invalid token: ${token.substring(0, 20)}...`);
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
      SELECT 
        n.id, n.category, n.type, n.sub_type, n.title, n.message, n.is_read, n.action_type, n.action_payload, n.created_at,
        COALESCE(n.group_name, r.name) as group_name,
        COALESCE(n.actor_name, u.display_name) as actor_name
      FROM notifications n
      LEFT JOIN refrigerators r ON (n.action_payload::json->>'refrigeratorId') = r.id::text
      LEFT JOIN users u ON (n.action_payload::json->>'actorId') = u.id OR (n.action_payload::json->>'operatorId') = u.id
      WHERE n.user_id = $1
    `;
        let params = [userId];
        let paramIndex = 2;
        if (category) {
            sql += ` AND n.category = $${paramIndex++}`;
            params.push(category);
        }
        sql += ` ORDER BY n.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);
        const result = await query(sql, params);
        // 轉換成前端易讀格式
        const notifications = result.rows.map((row) => ({
            id: row.id,
            category: row.category || "system",
            type: row.type,
            subType: row.sub_type,
            title: row.title,
            message: row.message,
            isRead: row.is_read,
            action: {
                type: row.action_type,
                payload: row.action_payload,
            },
            createdAt: row.created_at,
            groupName: row.group_name,
            actorName: row.actor_name,
        }));
        return { notifications, total, unreadCount };
    },
    /**
     * 發送通知核心邏輯
     */
    /**
     * 發送通知核心邏輯
     */
    send: async (userId, title, body, type, action, category, subType, groupName, actorName) => {
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
        // 3. 寫入資料庫 (Notification Center)
        const insertSql = `
      INSERT INTO notifications (user_id, category, type, title, message, action_type, action_payload, sub_type, group_name, actor_name)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
            subType || null,
            groupName || null,
            actorName || null,
        ]);
        // 4. 發送 FCM（多裝置支援）
        // 取得使用者所有裝置的 Token
        const tokens = await notificationService.getUserTokens(userId);
        console.log(`[Notification] User ${userId}: ${tokens.length} FCM tokens found, notify_push=${user.notify_push}`);
        const shouldSendPush = user.notify_push !== false && tokens.length > 0;
        // 細部過濾
        let shouldPush = shouldSendPush;
        if (type === "inventory" && !user.notify_expiry)
            shouldPush = false;
        if (type === "marketing" && !user.notify_marketing)
            shouldPush = false;
        if (!shouldPush) {
            console.log(`[Notification] Skipping FCM for user ${userId}: shouldSendPush=${shouldSendPush}, type=${type}, notify_expiry=${user.notify_expiry}`);
        }
        if (shouldPush && tokens.length > 0) {
            const failedTokens = [];
            console.log(`[Notification] Sending FCM to ${tokens.length} devices for user ${userId}`);
            for (const token of tokens) {
                try {
                    await messaging.send({
                        token,
                        notification: { title, body },
                        data: {
                            type,
                            actionType: actionType || "",
                            actionId: action?.payload?.id || "",
                        },
                    });
                    console.log(`[Notification] FCM sent successfully to token: ${token.substring(0, 20)}...`);
                }
                catch (error) {
                    console.error("[Notification] FCM Send Error:", error);
                    // 如果 token 失效，從 fcm_tokens 表刪除
                    if (error.code === "messaging/registration-token-not-registered") {
                        failedTokens.push(token);
                    }
                }
            }
            // 批次刪除無效 Token
            for (const invalidToken of failedTokens) {
                await notificationService.removeInvalidToken(invalidToken);
            }
            if (tokens.length > failedTokens.length) {
                console.log(`[Notification] Push sent to user ${userId} (${tokens.length - failedTokens.length}/${tokens.length} devices)`);
            }
        }
    },
    /**
     * 發送通知給多個使用者（供前端呼叫）
     */
    sendToMultiple: async (userIds, title, body, type, action, subType, groupName, actorName) => {
        const results = {
            success: [],
            failed: [],
        };
        for (const userId of userIds) {
            try {
                await notificationService.send(userId, title, body, type, action, undefined, subType, groupName, actorName);
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
    sendToRefrigeratorMembers: async (refrigeratorId, title, body, type, action, category = "stock", operatorId, subType, actorName, passedGroupName // [NEW] Allow caller to pass groupName
    ) => {
        // 1. 找出該冰箱的所有成員
        // 我們假設 inventory_settings 有所有成員的設定資料
        const membersResult = await query(`SELECT DISTINCT user_id FROM inventory_settings WHERE refrigerator_id = $1`, [refrigeratorId]);
        let memberIds = membersResult.rows.map((row) => row.user_id);
        // 1.1 決定群組名稱
        // 若 caller 有傳則用傳的，否則嘗試查詢 DB
        let groupName = passedGroupName;
        if (!groupName) {
            try {
                const fridgeResult = await query(`SELECT name FROM refrigerators WHERE id = $1`, [refrigeratorId]);
                if (fridgeResult.rows.length > 0) {
                    groupName = fridgeResult.rows[0].name;
                }
            }
            catch (e) {
                console.warn(`[Notification] Failed to fetch group name for ${refrigeratorId}`, e);
            }
        }
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
                await notificationService.send(memberId, title, body, type, action, category, subType, groupName, actorName);
            }
            catch (error) {
                console.error(`[Notification] Failed to send group notification to ${memberId}:`, error);
            }
        }
    },
};
