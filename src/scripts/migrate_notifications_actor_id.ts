import "dotenv/config";
import { query, pool } from "../db/index.js";

/**
 * 遷移腳本：為 notifications 資料表新增 actor_id 欄位
 * 
 * actor_id 用於記錄觸發通知的使用者 ID，
 * 讓前端可以過濾掉由本人觸發的通知，避免重複提示。
 */
async function migrate() {
  console.log("🔄 開始遷移：新增 actor_id 欄位至 notifications 資料表...");

  try {
    // 1. 新增 actor_id 欄位
    const addColumnSql = `
      ALTER TABLE notifications 
      ADD COLUMN IF NOT EXISTS actor_id VARCHAR(255) NOT NULL DEFAULT 'system';
    `;
    await query(addColumnSql);
    console.log("✅ 成功新增 actor_id 欄位 (或已存在)");

    // 2. 建立索引 (用於查詢特定使用者觸發的通知)
    const createIndexSql = `
      CREATE INDEX IF NOT EXISTS idx_notifications_actor_id 
      ON notifications(actor_id);
    `;
    await query(createIndexSql);
    console.log("✅ 成功建立 actor_id 索引 (或已存在)");

    console.log("🎉 遷移完成！");
  } catch (error) {
    console.error("❌ 遷移失敗:", error);
  } finally {
    if (pool) {
      await pool.end();
    }
  }
}

// 執行
migrate();
