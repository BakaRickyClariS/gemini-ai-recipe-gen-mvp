import { query, pool } from "../db/index.js";
async function migrate() {
    console.log("🔄 Starting migration: Add columns to notifications table...");
    const sql = `
    ALTER TABLE notifications 
    ADD COLUMN IF NOT EXISTS sub_type VARCHAR(20) NULL,
    ADD COLUMN IF NOT EXISTS group_name VARCHAR(100) NULL,
    ADD COLUMN IF NOT EXISTS actor_name VARCHAR(100) NULL;
  `;
    try {
        await query(sql);
        console.log("✅ Migration successful: Columns added to notifications table.");
    }
    catch (error) {
        console.error("❌ Migration failed:", error);
    }
    finally {
        if (pool) {
            await pool.end();
        }
    }
}
migrate();
