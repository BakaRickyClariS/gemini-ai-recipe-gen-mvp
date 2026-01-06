import "dotenv/config";
import { query, pool } from "../db/index.js";
import { notificationService } from "../services/notificationService.js";

async function debugCategory() {
  try {
    // 1. Hardcode the user we found earlier: 019b327e-3334-71e5-ba2f-5bf2d91c5148
    // Or find again to be safe
    const userRes = await query(`
        SELECT user_id FROM user_refrigerators 
        GROUP BY user_id 
        HAVING COUNT(refrigerator_id) > 1 
        LIMIT 1
      `);

    if (userRes.rows.length === 0) return;
    const userId = userRes.rows[0].user_id;
    console.log(`Checking User: ${userId}`);

    // 2. Fetch with Category = 'stock'
    console.log(`\n📥 Fetching 'stock' category...`);
    const { notifications } = await notificationService.getNotifications(
      userId,
      1,
      50,
      "stock"
    );

    // 3. Analyze
    console.log(`   Total Stock Notifications: ${notifications.length}`);
    const groups: Record<string, number> = {};
    notifications.forEach((n) => {
      const g = n.groupName || "Unknown";
      groups[g] = (groups[g] || 0) + 1;
    });
    console.table(groups);

    // 4. Fetch with Category = 'official'
    console.log(`\n📥 Fetching 'official' category...`);
    const offRes = await notificationService.getNotifications(
      userId,
      1,
      50,
      "official"
    );
    console.log(
      `   Total Official Notifications: ${offRes.notifications.length}`
    );
  } catch (err) {
    console.error(err);
  } finally {
    if (pool) await pool.end();
  }
}

debugCategory();
