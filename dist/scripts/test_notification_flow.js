import "dotenv/config";
import { notificationService } from "../services/notificationService.js";
import { query, pool } from "../db/index.js";
async function testNotificationFlow() {
    const TEST_USER_ID = "test-user-" + Date.now();
    console.log(`🧪 Testing with User ID: ${TEST_USER_ID}`);
    try {
        // 1. Send Notification
        console.log('1️⃣ Sending "stock" notification...');
        await notificationService.send(TEST_USER_ID, "Test Stock Title", "Test Stock Body", "stock", { type: "test" }, "stock");
        console.log('2️⃣ Sending "inspiration" notification...');
        await notificationService.send(TEST_USER_ID, "Test Insight Title", "Test Insight Body", "inspiration", { type: "test" }, "inspiration");
        // 2. Initial Check (No Filter)
        const all = await notificationService.getNotifications(TEST_USER_ID);
        console.log(`🔍 Total Notifications (No Filter): ${all.total}`);
        if (all.total !== 2)
            throw new Error("Expected 2 notifications");
        // 3. Filter Check (Stock)
        const stocks = await notificationService.getNotifications(TEST_USER_ID, 1, 20, "stock");
        console.log(`🔍 Stock Notifications: ${stocks.total}`);
        if (stocks.total !== 1)
            throw new Error("Expected 1 stock notification");
        if (stocks.notifications[0].category !== "stock")
            throw new Error("Category mismatch");
        // 4. Filter Check (Inspiration)
        const insights = await notificationService.getNotifications(TEST_USER_ID, 1, 20, "inspiration");
        console.log(`🔍 Inspiration Notifications: ${insights.total}`);
        if (insights.total !== 1)
            throw new Error("Expected 1 inspiration notification");
        console.log("✅ Verification Passed!");
        // Cleanup
        await query("DELETE FROM notifications WHERE user_id = $1", [TEST_USER_ID]);
        await query("DELETE FROM users WHERE id = $1", [TEST_USER_ID]);
    }
    catch (err) {
        console.error("❌ Verification Failed:", err);
        process.exit(1);
    }
    finally {
        if (pool)
            await pool.end();
    }
}
testNotificationFlow();
