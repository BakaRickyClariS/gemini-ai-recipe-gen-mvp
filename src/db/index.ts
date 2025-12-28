/**
 * PostgreSQL 資料庫連線配置
 * 使用 Supabase PostgreSQL
 */

import pg from "pg";
const { Pool } = pg;

// 從環境變數讀取連線字串
const connectionString = process.env.DATABASE_URL;

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
      connectionTimeoutMillis: 5000,
    })
  : null;

/**
 * 執行 SQL 查詢
 */
export const query = async (
  text: string,
  params?: unknown[]
): Promise<pg.QueryResult> => {
  if (!pool) {
    throw new Error("資料庫未連線，請設定 DATABASE_URL 環境變數");
  }

  const start = Date.now();
  const result = await pool.query(text, params);
  const duration = Date.now() - start;

  console.log(`[DB] Query executed in ${duration}ms:`, {
    rowCount: result.rowCount,
  });

  return result;
};

/**
 * 測試資料庫連線
 */
export const testConnection = async (): Promise<boolean> => {
  if (!pool) {
    console.warn("⚠️ [DB] 無法測試連線：DATABASE_URL 未設定");
    return false;
  }

  try {
    const result = await pool.query("SELECT NOW()");
    console.log("✅ [DB] 資料庫連線成功:", result.rows[0]);
    return true;
  } catch (error) {
    console.error("❌ [DB] 資料庫連線失敗:", error);
    return false;
  }
};
