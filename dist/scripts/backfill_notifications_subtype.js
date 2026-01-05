import { query, pool } from "../db/index.js";
/**
 * 根據通知標題與類型推斷 subType
 */
const inferSubType = (notification) => {
    const { title, type } = notification;
    // 官方公告不需要 subType
    if (type === 'system')
        return null;
    // 根據 title 關鍵字推斷 (優先)
    if (title.includes('入庫') || title.includes('辨識完成'))
        return 'stockIn';
    if (title.includes('到期') || title.includes('過期') || title.includes('庫存') || title.includes('低於'))
        return 'stock';
    if (title.includes('消耗') || title.includes('用掉'))
        return 'consume';
    if (title.includes('清單') || title.includes('補貨'))
        return 'list';
    if (title.includes('邀請') || title.includes('共享'))
        return 'share';
    if (title.includes('成員') || title.includes('加入') || title.includes('退出'))
        return 'member';
    if (title.includes('食譜') || title.includes('推薦') || title.includes('靈感'))
        return 'generate';
    // 根據 type fallback
    const typeToSubType = {
        inventory: 'stock',
        shopping: 'list',
        group: 'member',
        recipe: 'generate',
        user: 'self',
    };
    return typeToSubType[type] || null;
};
async function backfill() {
    console.log("🔄 Starting data backfill for notifications subType...");
    try {
        // 1. 查詢所有需要遷移的通知 (sub_type 為 NULL 且非 system)
        const result = await query(`SELECT id, title, type FROM notifications WHERE sub_type IS NULL AND type != 'system'`);
        const notifications = result.rows;
        console.log(`Found ${notifications.length} notifications to migrate.`);
        if (notifications.length === 0) {
            console.log("✅ No notifications need migration.");
            return;
        }
        let updatedCount = 0;
        // 2. 逐筆處理更新
        for (const notification of notifications) {
            const subType = inferSubType(notification);
            if (subType) {
                await query(`UPDATE notifications SET sub_type = $1 WHERE id = $2`, [subType, notification.id]);
                updatedCount++;
                if (updatedCount % 100 === 0) {
                    process.stdout.write('.');
                }
            }
        }
        console.log(`\n✅ Migration complete. Updated ${updatedCount}/${notifications.length} notifications.`);
        // 3. 驗證結果
        const statsResult = await query(`SELECT sub_type, COUNT(*) as count FROM notifications WHERE type != 'system' GROUP BY sub_type`);
        console.log("\n📊 Migration Statistics:");
        console.table(statsResult.rows);
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
backfill();
