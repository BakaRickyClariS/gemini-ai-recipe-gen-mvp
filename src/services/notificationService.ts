import { messaging } from '../lib/firebase.js';
import { query } from '../db/index.js';

interface NotificationSettings {
  notifyPush: boolean;
  notifyExpiry: boolean;
  notifyLowStock: boolean;
  daysBeforeExpiry: number;
  notifyMarketing: boolean;
}

export const notificationService = {
  /**
   * 註冊或更新 FCM Token
   */
  registerToken: async (userId: string, token: string) => {
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
  getSettings: async (userId: string) => {
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
        notifyMarketing: false
      };
    }
    
    const row = result.rows[0];
    return {
      notifyPush: row.notify_push,
      notifyExpiry: row.notify_expiry,
      notifyLowStock: row.notify_low_stock ?? true,
      daysBeforeExpiry: row.days_before_expiry ?? 3,
      notifyMarketing: row.notify_marketing
    };
  },

  /**
   * 更新通知設定
   */
  updateSettings: async (userId: string, settings: Partial<NotificationSettings>) => {
    // 構建動態更新 SQL
    // 先確保使用者存在 (如果是第一次只想改設定但沒 Token，也應該要有 User 紀錄)
    // 這裡簡單做：如果 User 不存在先建立一個沒 Token 的
    const ensureUserSql = `
      INSERT INTO users (id, created_at) VALUES ($1, NOW()) ON CONFLICT (id) DO NOTHING;
    `;
    await query(ensureUserSql, [userId]);

    const updates: string[] = [];
    const values: any[] = [userId];
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
      const sql = `UPDATE users SET ${updates.join(', ')} WHERE id = $1`;
      await query(sql, values);
    }
  },

  /**
   * 取得通知列表
   */
  getNotifications: async (userId: string, page = 1, limit = 20) => {
    const offset = (page - 1) * limit;
    
    // 查詢總數
    const countSql = `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`;
    const countResult = await query(countSql, [userId]);
    const total = parseInt(countResult.rows[0]?.total || '0', 10);

    // 查詢未讀數
    const unreadSql = `SELECT COUNT(*) as unread FROM notifications WHERE user_id = $1 AND is_read = false`;
    const unreadResult = await query(unreadSql, [userId]);
    const unreadCount = parseInt(unreadResult.rows[0]?.unread || '0', 10);

    // 查詢分頁資料
    const sql = `
      SELECT id, type, title, message, is_read, action_type, action_payload, created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2 OFFSET $3
    `;
    const result = await query(sql, [userId, limit, offset]);
    
    // 轉換成前端易讀格式
    const notifications = result.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      isRead: row.is_read,
      action: {
        type: row.action_type,
        payload: row.action_payload
      },
      createdAt: row.created_at
    }));

    return { notifications, total, unreadCount };
  },

  /**
   * 發送通知核心邏輯
   */
  send: async (userId: string, title: string, body: string, type: string, action?: any) => {
    // 1. 取得使用者設定
    const userResult = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
    let user = userResult.rows[0];

    // 如果使用者不存在，自動建立 (為了 Notification Center 能顯示)
    if (!user) {
      await query(`INSERT INTO users (id, created_at) VALUES ($1, NOW())`, [userId]);
      const newUserResult = await query(`SELECT * FROM users WHERE id = $1`, [userId]);
      user = newUserResult.rows[0];
    }

    // 2. 判斷是否需要發送推播
    let shouldSendPush = user.notify_push && user.fcm_token;

    // 細部過濾
    if (type === 'inventory' && !user.notify_expiry) shouldSendPush = false;
    if (type === 'marketing' && !user.notify_marketing) shouldSendPush = false;

    // 3. 寫入資料庫 (Notification Center)
    const insertSql = `
      INSERT INTO notifications (user_id, type, title, message, action_type, action_payload)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;
    const actionType = action?.type || null;
    const actionPayload = action?.payload ? JSON.stringify(action.payload) : null;
    
    await query(insertSql, [userId, type, title, body, actionType, actionPayload]);

    // 4. 發送 FCM
    if (shouldSendPush && user.fcm_token) {
      try {
        await messaging.send({
          token: user.fcm_token,
          notification: { title, body },
          data: {
            type,
            actionType: actionType || '',
            // actionPayload 通常很大或結構複雜，FCM data 只能扁平 key-value string
            // 建議只傳 ID 讓前端去 fetch，這裡依照 plan 傳 actionId
            actionId: action?.payload?.id || '' 
          }
        });
        console.log(`[Notification] Push sent to user ${userId}`);
      } catch (error: any) {
        console.error('[Notification] FCM Send Error:', error);
        // 如果 token 失效，可以考慮 UPDATE users SET fcm_token = NULL WHERE id = ...
        if (error.code === 'messaging/registration-token-not-registered') {
           await query(`UPDATE users SET fcm_token = NULL WHERE id = $1`, [userId]);
        }
      }
    }
  },

  /**
   * 發送通知給多個使用者（供前端呼叫）
   */
  sendToMultiple: async (
    userIds: string[], 
    title: string, 
    body: string, 
    type: string, 
    action?: { type?: string; payload?: any }
  ) => {
    const results = {
      success: [] as string[],
      failed: [] as string[]
    };

    for (const userId of userIds) {
      try {
        await notificationService.send(userId, title, body, type, action);
        results.success.push(userId);
      } catch (error) {
        console.error(`[Notification] Failed to send to ${userId}:`, error);
        results.failed.push(userId);
      }
    }

    return results;
  }
};
