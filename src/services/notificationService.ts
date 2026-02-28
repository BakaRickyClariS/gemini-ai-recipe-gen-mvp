import { messaging } from "../lib/firebase.js";
import { query } from "../db/index.js";
import * as Sentry from "@sentry/node";

interface NotificationSettings {
  notifyPush: boolean;
  notifyExpiry: boolean;
  notifyLowStock: boolean;
  daysBeforeExpiry: number;
  notifyMarketing: boolean;
}

export const notificationService = {
  /**
   * 註冊或更新 FCM Token（多裝置支援）
   * @param userId 使用者 ID
   * @param token FCM Token
   * @param platform 平台類型 (web | ios | android)
   */
  registerToken: async (
    userId: string,
    token: string,
    platform: string = "web",
  ) => {
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
  removeToken: async (userId: string, token: string) => {
    const sql = `DELETE FROM fcm_tokens WHERE user_id = $1 AND token = $2`;
    await query(sql, [userId, token]);
  },

  /**
   * 取得使用者所有裝置的 FCM Tokens
   */
  getUserTokens: async (userId: string): Promise<string[]> => {
    const sql = `SELECT token FROM fcm_tokens WHERE user_id = $1`;
    const result = await query(sql, [userId]);
    return result.rows.map((row) => row.token);
  },

  /**
   * 刪除無效的 FCM Token
   */
  removeInvalidToken: async (token: string) => {
    const sql = `DELETE FROM fcm_tokens WHERE token = $1`;
    await query(sql, [token]);
    console.log(`[FCM] Removed invalid token: ${token.substring(0, 20)}...`);
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
  updateSettings: async (
    userId: string,
    settings: Partial<NotificationSettings>,
  ) => {
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
      const sql = `UPDATE users SET ${updates.join(", ")} WHERE id = $1`;
      await query(sql, values);
    }
  },

  /**
   * 取得通知列表
   */
  getNotifications: async (
    userId: string,
    page = 1,
    limit = 20,
    category?: string,
  ) => {
    const offset = (page - 1) * limit;

    // 查詢總數
    let countSql = `SELECT COUNT(*) as total FROM notifications WHERE user_id = $1`;
    let countParams: any[] = [userId];

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
        n.actor_id, n.group_name, n.actor_name
      FROM notifications n
      WHERE n.user_id = $1
    `;
    let params: any[] = [userId];
    let paramIndex = 2;

    if (category) {
      sql += ` AND n.category = $${paramIndex++}`;
      params.push(category);
    }

    sql += ` ORDER BY n.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await query(sql, params);

    // 取得關聯的 IDs (避免在 SQL 裡解析 JSON 發生錯誤)
    const refIds = new Set<string>();
    const userIdsToFetch = new Set<string>();

    const parsedNotifications = result.rows.map((row: any) => {
      let payloadObj: any = null;
      if (
        row.action_payload &&
        typeof row.action_payload === "string" &&
        row.action_payload.startsWith("{")
      ) {
        try {
          payloadObj = JSON.parse(row.action_payload);
          if (payloadObj.refrigeratorId)
            refIds.add(String(payloadObj.refrigeratorId));
          if (payloadObj.actorId)
            userIdsToFetch.add(String(payloadObj.actorId));
          if (payloadObj.operatorId)
            userIdsToFetch.add(String(payloadObj.operatorId));
        } catch (e) {
          // ignore parsing error
        }
      }
      return { ...row, payloadObj };
    });

    // 批次查詢關聯資料
    const refrigeratorsMap = new Map<string, string>();
    const usersMap = new Map<string, string>();

    if (refIds.size > 0) {
      const refsResult = await query(
        `SELECT id, name FROM refrigerators WHERE id = ANY($1::uuid[])`,
        [Array.from(refIds)],
      );
      refsResult.rows.forEach((r: any) =>
        refrigeratorsMap.set(String(r.id), r.name),
      );
    }

    if (userIdsToFetch.size > 0) {
      const usersResult = await query(
        `SELECT id, display_name FROM users WHERE id = ANY($1)`,
        [Array.from(userIdsToFetch)],
      );
      usersResult.rows.forEach((u: any) =>
        usersMap.set(String(u.id), u.display_name),
      );
    }

    // 轉換成前端易讀格式
    const notifications = parsedNotifications.map((row: any) => {
      let groupName = row.group_name;
      let actorName = row.actor_name;

      if (!groupName && row.payloadObj?.refrigeratorId) {
        groupName =
          refrigeratorsMap.get(String(row.payloadObj.refrigeratorId)) || null;
      }
      if (!actorName && row.payloadObj) {
        actorName =
          usersMap.get(String(row.payloadObj.actorId)) ||
          usersMap.get(String(row.payloadObj.operatorId)) ||
          null;
      }

      return {
        id: row.id,
        category: row.category || "system",
        type: row.type,
        subType: row.sub_type,
        title: row.title,
        message: row.message,
        isRead: row.is_read,
        action: {
          type: row.action_type,
          payload: row.action_payload, // front-end receives raw string or json object depending on original implementation
        },
        createdAt: row.created_at,
        groupName: groupName,
        actorName: actorName,
        actorId: row.actor_id,
      };
    });

    return { notifications, total, unreadCount };
  },

  /**
   * 發送通知核心邏輯
   */
  /**
   * 發送通知核心邏輯
   */
  send: async (
    userId: string,
    title: string,
    body: string,
    type: string,
    action?: any,
    category?: string,
    subType?: string,
    groupName?: string,
    actorName?: string,
    actorId?: string,
  ) => {
    // 1. 自動映射分類 (Mapping logic based on extension spec)
    let finalCategory = category;
    if (!finalCategory) {
      if (type === "shopping" || type === "inventory") {
        finalCategory = "stock";
      } else if (type === "recipe") {
        finalCategory = "inspiration";
      } else if (type === "group" || type === "system") {
        finalCategory = "official";
      } else {
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
      INSERT INTO notifications (user_id, category, type, title, message, action_type, action_payload, sub_type, group_name, actor_name, actor_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
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
      actorId || "system",
    ]);

    // 4. 發送 FCM（多裝置支援）
    // 取得使用者所有裝置的 Token
    const tokens = await notificationService.getUserTokens(userId);
    console.log(
      `[Notification] User ${userId}: ${tokens.length} FCM tokens found, notify_push=${user.notify_push}`,
    );

    const shouldSendPush = user.notify_push !== false && tokens.length > 0;

    // 細部過濾
    let shouldPush = shouldSendPush;
    if (type === "inventory" && !user.notify_expiry) shouldPush = false;
    if (type === "marketing" && !user.notify_marketing) shouldPush = false;

    if (!shouldPush) {
      console.log(
        `[Notification] Skipping FCM for user ${userId}: shouldSendPush=${shouldSendPush}, type=${type}, notify_expiry=${user.notify_expiry}`,
      );
    }

    if (shouldPush && tokens.length > 0) {
      const failedTokens: string[] = [];
      console.log(
        `[Notification] Sending FCM to ${tokens.length} devices for user ${userId}`,
      );

      for (const token of tokens) {
        try {
          await messaging.send({
            token,
            notification: { title, body },
            data: {
              type,
              actionType: actionType || "",
              actionId: action?.payload?.id || "",
              subType: subType || "",
              groupName: groupName || "",
              actorName: actorName || "",
              actorId: actorId || "",
              refrigeratorId: action?.payload?.refrigeratorId || "",
            },
          });
          console.log(
            `[Notification] FCM sent successfully to token: ${token.substring(
              0,
              20,
            )}...`,
          );
        } catch (error: any) {
          Sentry.captureException(error, {
            tags: { service: "fcm", userId },
            extra: { type, subType, tokenPrefix: token.substring(0, 20) },
          });
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
        console.log(
          `[Notification] Push sent to user ${userId} (${
            tokens.length - failedTokens.length
          }/${tokens.length} devices)`,
        );
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
    action?: { type?: string; payload?: any },
    subType?: string,
    groupName?: string,
    actorName?: string,
    actorId?: string,
  ) => {
    const results = {
      success: [] as string[],
      failed: [] as string[],
    };

    for (const userId of userIds) {
      try {
        await notificationService.send(
          userId,
          title,
          body,
          type,
          action,
          undefined,
          subType,
          groupName,
          actorName,
          actorId,
        );
        results.success.push(userId);
      } catch (error) {
        console.error(`[Notification] Failed to send to ${userId}:`, error);
        results.failed.push(userId);
      }
    }

    return results;
  },

  /**
   * 發送通知給冰箱（群組）的所有成員
   */
  sendToRefrigeratorMembers: async (
    refrigeratorId: string,
    title: string,
    body: string,
    type: string,
    action?: { type?: string; payload?: any },
    category: string = "stock",
    operatorId?: string,
    subType?: string,
    actorName?: string,
    passedGroupName?: string, // [NEW] Allow caller to pass groupName
  ) => {
    // 1. 找出該冰箱的所有成員
    // [MODIFIED] Using user_refrigerators based on migration for better reliability
    const membersResult = await query(
      `SELECT user_id FROM user_refrigerators WHERE refrigerator_id = $1`,
      [refrigeratorId],
    );

    let memberIds = membersResult.rows.map((row) => row.user_id);

    // 1.1 決定群組名稱
    // 若 caller 有傳則用傳的，否則嘗試查詢 DB
    let groupName: string | undefined = passedGroupName;

    if (!groupName) {
      try {
        const fridgeResult = await query(
          `SELECT name FROM refrigerators WHERE id = $1`,
          [refrigeratorId],
        );
        if (fridgeResult.rows.length > 0) {
          groupName = fridgeResult.rows[0].name;
        }
      } catch (e) {
        console.warn(
          `[Notification] Failed to fetch group name for ${refrigeratorId}`,
          e,
        );
      }
    }

    // 確保操作者自己一定會收到（如果他不在設定名單中）
    if (operatorId && !memberIds.includes(operatorId)) {
      memberIds.push(operatorId);
    }

    // 如果還是沒有成員
    if (memberIds.length === 0) {
      console.warn(
        `[Notification] No members found for refrigerator ${refrigeratorId}. Broadcast skipped.`,
      );
      return;
    }

    console.log(
      `[Notification] Broadcasting to refrigerator ${refrigeratorId} members:`,
      memberIds,
    );

    // 2. 逐一發送
    for (const memberId of memberIds) {
      try {
        await notificationService.send(
          memberId,
          title,
          body,
          type,
          action,
          category,
          subType,
          groupName,
          actorName,
          operatorId || "system",
        );
      } catch (error) {
        console.error(
          `[Notification] Failed to send group notification to ${memberId}:`,
          error,
        );
      }
    }
  },

  /**
   * 批次標記已讀
   * @param userId 使用者 ID
   * @param ids 通知 ID 列表
   * @param isRead 是否已讀 (預設 true)
   */
  batchMarkAsRead: async (
    userId: string,
    ids: string[],
    isRead: boolean = true,
  ) => {
    if (ids.length === 0) return { updatedCount: 0 };

    const sql = `
      UPDATE notifications
      SET is_read = $2, updated_at = NOW()
      WHERE user_id = $1 AND id = ANY($3::uuid[])
    `;
    const result = await query(sql, [userId, isRead, ids]);
    return { updatedCount: result.rowCount };
  },

  /**
   * 批次刪除通知
   * @param userId 使用者 ID
   * @param ids 通知 ID 列表
   */
  batchDelete: async (userId: string, ids: string[]) => {
    if (ids.length === 0) return { deletedCount: 0 };

    const sql = `
      DELETE FROM notifications
      WHERE user_id = $1 AND id = ANY($2::uuid[])
    `;
    const result = await query(sql, [userId, ids]);
    return { deletedCount: result.rowCount };
  },

  /**
   * 發送官方公告（廣播給所有使用者）
   */
  sendAnnouncement: async (
    title: string,
    message: string,
    type: string = "announcement",
    shouldPush: boolean = true,
    data: any = {},
  ) => {
    // 1. 取得所有有效使用者 (有 FCM Token 或最近有活動的可以用來過濾，這裡先簡單全部)
    // 為了效能，我們直接從 users 表撈 ID
    const userResult = await query(`SELECT id, notify_push FROM users`);
    const users = userResult.rows;

    console.log(`[Announcement] Preparing to send to ${users.length} users...`);

    // 2. 批次寫入 notifications (使用 unnest 或 loop，考慮到數量可能很大，這裡用簡單的 loop 或 batch insert)
    // 為了避免 SQL 參數過多 (Postgres limit ~65535 parameters)，量大時需分批
    // 這裡做一個簡單的優化：使用 INSERT INTO ... SELECT ... 雖然 notifications 有 user_id FK，
    // 但可以結合 users table 做。不過 notifications ID 是 UUID，需要個別產生。
    // 簡單解法：使用 Loop, for MVP is okay. 若使用者 > 1000 建議改用 Bulk Insert。

    // 這裡改用較高效的寫法：
    // INSERT INTO notifications (user_id, ...) SELECT id, ... FROM users
    // 這樣資料庫層級完成，極快。

    const category = "official";
    const actionType =
      type === "release" ? "release_note" : "announcement_detail";
    const actionPayload = JSON.stringify(data);

    const insertSql = `
      INSERT INTO notifications (user_id, category, type, title, message, action_type, action_payload, created_at, updated_at)
      SELECT id, $1, $2, $3, $4, $5, $6, NOW(), NOW()
      FROM users
    `;

    const insertResult = await query(insertSql, [
      category,
      type,
      title,
      message,
      actionType,
      actionPayload,
    ]);

    console.log(
      `[Announcement] DB inserted ${insertResult.rowCount} notifications.`,
    );

    // 3. 處理推送 (Topic Messaging or Batch Multicast)
    // FCM 最佳解是使用 Topic ('all_users')，但如果之前沒訂閱 Topic，現在發會沒人收到。
    // 所以這裡還是必須用 Token Multicast。
    if (shouldPush) {
      // 取得所有 Token (這可能會很多，建議分批)
      // 假設 MVP 人數不多，一次撈出
      const tokenResult = await query(`SELECT token FROM fcm_tokens`);
      const allTokens = tokenResult.rows.map((r) => r.token);

      if (allTokens.length > 0) {
        console.log(
          `[Announcement] Broadcasting FCM to ${allTokens.length} devices.`,
        );

        // FCM multicast limit is 500 per batch
        const batchSize = 500;
        for (let i = 0; i < allTokens.length; i += batchSize) {
          const batchTokens = allTokens.slice(i, i + batchSize);
          try {
            await messaging.sendEachForMulticast({
              tokens: batchTokens,
              notification: { title, body: message },
              data: {
                type,
                actionType,
                category,
              },
            });
            console.log(
              `[Announcement] Batch ${Math.floor(i / batchSize) + 1} sent.`,
            );
          } catch (err) {
            console.error(`[Announcement] Batch send error:`, err);
          }
        }
      }
    }

    return {
      recipientCount: users.length,
      notificationCount: insertResult.rowCount,
    };
  },
};
