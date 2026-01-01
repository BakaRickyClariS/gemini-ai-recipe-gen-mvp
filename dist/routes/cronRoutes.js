/**
 * Cron Job 路由 - 定時任務端點
 * 用於 Vercel Cron 或外部排程器觸發
 */
import express from "express";
import { query } from "../db/index.js";
import { notificationService } from "../services/notificationService.js";
const router = express.Router();
// 保護 Cron 端點：驗證 CRON_SECRET
const validateCronSecret = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const cronSecret = process.env.CRON_SECRET;
    // 如果沒設定 CRON_SECRET，允許所有請求（開發環境）
    if (!cronSecret) {
        console.warn("[Cron] CRON_SECRET not set, allowing request");
        return next();
    }
    if (authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
};
/**
 * 檢查即將過期的食材並發送通知
 * POST /api/cron/check-expiry
 */
router.post("/check-expiry", validateCronSecret, async (_req, res) => {
    try {
        console.log("[Cron] Starting expiry check...");
        // 取得所有即將過期的食材（預設 3 天內）
        // 連同 user_id 一起取得，才能發通知
        const expiringItemsSql = `
      SELECT 
        i.id, 
        i.name, 
        i.expiry_date, 
        i.user_id,
        i.refrigerator_id
      FROM inventory i
      WHERE i.expiry_date IS NOT NULL
        AND i.expiry_date <= NOW() + INTERVAL '3 days'
        AND i.expiry_date > NOW()
      ORDER BY i.expiry_date ASC
    `;
        const result = await query(expiringItemsSql);
        const expiringItems = result.rows;
        console.log(`[Cron] Found ${expiringItems.length} expiring items`);
        // 按 refrigerator_id 分組
        const itemsByRefrigerator = {};
        for (const item of expiringItems) {
            const fridgeId = item.refrigerator_id;
            // 略過沒有 refrigerator_id 的資料 (理論上不應發生)
            if (!fridgeId)
                continue;
            if (!itemsByRefrigerator[fridgeId]) {
                itemsByRefrigerator[fridgeId] = [];
            }
            itemsByRefrigerator[fridgeId].push(item);
        }
        // 發送通知給每個冰箱的成員 (Broadcast)
        let notificationsSent = 0;
        for (const [fridgeId, items] of Object.entries(itemsByRefrigerator)) {
            const itemNames = items
                .slice(0, 3)
                .map((i) => i.name)
                .join("、");
            const moreCount = items.length > 3 ? `等 ${items.length} 項` : "";
            // 使用 sendToRefrigeratorMembers 廣播給該冰箱所有成員
            await notificationService.sendToRefrigeratorMembers(fridgeId, "食材即將過期提醒", `${itemNames}${moreCount} 即將過期，請儘快使用！`, "inventory", // type
            { type: "inventory", payload: { refrigeratorId: fridgeId } }, // action
            "stock" // category
            );
            notificationsSent++; // 這裡計數的是「發送的冰箱數」，而非「總通數」
        }
        console.log(`[Cron] Sent ${notificationsSent} expiry notifications`);
        res.json({
            success: true,
            data: {
                expiringItemsCount: expiringItems.length,
                usersNotified: notificationsSent,
            },
        });
    }
    catch (error) {
        console.error("[Cron] Expiry check failed:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});
export default router;
