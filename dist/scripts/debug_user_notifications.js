import "dotenv/config";
import { query, pool } from "../db/index.js";
import { notificationService } from "../services/notificationService.js";
async function debugNotifications() {
    try {
        let output = "";
        const log = (msg) => {
            console.log(msg);
            output +=
                (typeof msg === "object" ? JSON.stringify(msg, null, 2) : msg) + "\n";
        };
        // 1. Find a user in multiple refrigerators
        log("🔍 Finding a user with multiple refrigerators...");
        const userRes = await query(`
      SELECT user_id, COUNT(refrigerator_id) as count 
      FROM user_refrigerators 
      GROUP BY user_id 
      HAVING COUNT(refrigerator_id) > 1 
      LIMIT 1
    `);
        if (userRes.rows.length === 0) {
            log("⚠️ No user found with multiple refrigerators. Cannot verify cross-group view.");
            // Fallback: Just show any user
            return;
        }
        const userId = userRes.rows[0].user_id;
        log(`✅ Found User: ${userId} (In ${userRes.rows[0].count} groups)`);
        // 2. Fetch notifications for this user
        log(`\n📥 Fetching notifications for user...`);
        const { notifications } = await notificationService.getNotifications(userId, 1, 50);
        // 3. Analyze the results
        log(`   Total Notifications: ${notifications.length}`);
        // Group by groupName
        const groupByFridge = {};
        notifications.forEach((n) => {
            const name = n.groupName || n.action?.payload?.refrigeratorId || "Unknown";
            groupByFridge[name] = (groupByFridge[name] || 0) + 1;
        });
        log("\n📊 Distribution by Group Name:");
        log(JSON.stringify(groupByFridge, null, 2));
        // Show details
        log("\nRecent 10 Notifications:");
        notifications.slice(0, 10).forEach((n) => {
            log(`- [${n.groupName}] ${n.title} (ID: ${n.id.substring(0, 8)}...)`);
        });
        // Write to file
        const fs = await import("fs");
        fs.writeFileSync("debug_output.txt", output);
        console.log("Written to debug_output.txt");
    }
    catch (err) {
        console.error("❌ Error:", err);
    }
    finally {
        if (pool)
            await pool.end();
    }
}
debugNotifications();
