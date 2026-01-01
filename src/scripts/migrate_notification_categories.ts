/**
 * Migration: 正規化通知分類
 * 將現有通知的 type 欄位值映射到正確的 category
 */

import "dotenv/config";
import { query, pool } from "../db/index.js";

async function migrateNotificationCategories() {
  console.log("🚀 開始正規化通知分類...");

  try {
    // Type 到 Category 的映射
    const typeToCategory: Record<string, string> = {
      // stock 類
      inventory: "stock",
      group: "stock",
      stock: "stock",
      expiry: "stock",
      low_stock: "stock",
      // inspiration 類
      recipe: "inspiration",
      shopping: "inspiration",
      inspiration: "inspiration",
      // official 類
      system: "official",
      marketing: "official",
      official: "official",
    };

    // 逐一更新每種 type
    for (const [type, category] of Object.entries(typeToCategory)) {
      const result = await query(
        `UPDATE notifications SET category = $1 WHERE type = $2 AND (category IS NULL OR category = 'system')`,
        [category, type]
      );
      console.log(
        `✅ 更新 type='${type}' → category='${category}' | 影響 ${result.rowCount} 筆`
      );
    }

    // 檢查結果
    const stats = await query(`
      SELECT category, COUNT(*) as count 
      FROM notifications 
      GROUP BY category 
      ORDER BY count DESC
    `);

    console.log("\n📊 更新後的分類統計:");
    for (const row of stats.rows) {
      console.log(`  - ${row.category || "(null)"}: ${row.count} 筆`);
    }

    console.log("\n🎉 正規化完成！");
  } catch (err) {
    console.error("❌ Migration 失敗:", err);
    process.exit(1);
  } finally {
    if (pool) await pool.end();
  }
}

migrateNotificationCategories();
