import "dotenv/config";
import { query, pool } from "../db/index.js";
async function initNotificationDB() {
    console.log("🚀 開始更新資料庫 Schema...");
    try {
        // 1. 建立 Users 表 (如果不存在)
        // 發現系統尚未有 Users 表，因此直接建立，用來儲存推播設定
        const createUserTableSQL = `
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY, -- 對應前端傳來的 x-user-id
        fcm_token TEXT,
        notify_push BOOLEAN DEFAULT true,
        notify_expiry BOOLEAN DEFAULT true,
        notify_low_stock BOOLEAN DEFAULT true,
        days_before_expiry INTEGER DEFAULT 3,
        notify_marketing BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;
        await query(createUserTableSQL);
        console.log("✅ Users 表建立成功 (或已存在)");
        // 1.1. 升級現有資料庫：新增欄位 (如果不存在)
        try {
            await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_low_stock BOOLEAN DEFAULT true;`);
            await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS days_before_expiry INTEGER DEFAULT 3;`);
            console.log("✅ Users 表欄位升級成功 (或已存在)");
        }
        catch (err) {
            console.warn("⚠️ Users 表欄位升級警告:", err);
        }
        // 2. 建立 Notifications 表
        const createNotificationTableSQL = `
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(255) NOT NULL,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT false,
        action_type VARCHAR(50),
        action_payload JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT fk_user
          FOREIGN KEY(user_id) 
          REFERENCES users(id)
          ON DELETE CASCADE
      );
    `;
        await query(createNotificationTableSQL);
        console.log("✅ Notifications 表建立成功 (或已存在)");
        // 3. 建立索引
        try {
            await query("CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);");
            await query("CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);");
            console.log("✅ 索引建立成功");
        }
        catch (err) {
            console.warn("⚠️ 索引建立警告:", err);
        }
        // 4. 升級現有 Notifications 表：新增 category 欄位
        try {
            await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'system';`);
            // 更新舊資料的 category (若有)
            // await query(`UPDATE notifications SET category = 'stock' WHERE category IS NULL;`);
            console.log("✅ Notifications 表欄位 (category) 升級成功 (或已存在)");
        }
        catch (err) {
            console.warn("⚠️ Notifications 表欄位升級警告:", err);
        }
        console.log("🎉 資料庫 Schema 更新完成！");
    }
    catch (error) {
        console.error("❌ 資料庫更新失敗:", error);
    }
    finally {
        if (pool) {
            await pool.end();
        }
    }
}
// 執行
initNotificationDB();
