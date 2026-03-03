/**
 * PostgreSQL 資料庫連線配置
 * 使用 Supabase PostgreSQL
 */
import pkg from "pg";
const { Pool } = pkg;
import { config } from "../config/unifiedConfig.js";
// 從 unifiedConfig 讀取連線字串
const connectionString = config.database.url;
if (!connectionString) {
    console.warn("⚠️ [DB] DATABASE_URL 未設定，資料庫功能將無法使用");
}
// 建立連線池
export const pool = connectionString
    ? new Pool({
        connectionString,
        ssl: {
            rejectUnauthorized: false, // Supabase 需要 SSL
        },
        max: 10, // 最大連線數
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
    })
    : null;
/**
 * 執行 SQL 查詢
 */
export const query = async (text, params) => {
    if (!pool) {
        throw new Error("資料庫未連線，請設定 DATABASE_URL 環境變數");
    }
    const start = Date.now();
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[DB] Query: ${text} | Params: ${JSON.stringify(params)}`);
    console.log(`[DB] Query executed in ${duration}ms:`, {
        rowCount: result.rowCount,
    });
    return result;
};
/**
 * 測試資料庫連線
 */
export const testConnection = async () => {
    if (!pool) {
        console.warn("⚠️ [DB] 無法測試連線：DATABASE_URL 未設定");
        return false;
    }
    try {
        const result = await pool.query("SELECT NOW()");
        console.log("✅ [DB] 資料庫連線成功:", result.rows[0]);
        return true;
    }
    catch (error) {
        console.error("❌ [DB] 資料庫連線失敗:", error);
        return false;
    }
};
