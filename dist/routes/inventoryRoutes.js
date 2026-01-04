/**
 * 庫存管理 API 路由
 * 路徑: /api/v1/refrigerators/:refrigeratorId/inventory
 */
import { Router } from "express";
import * as inventoryService from "../services/inventoryService.js";
import { notificationService } from "../services/notificationService.js";
const router = Router({ mergeParams: true });
// ===== Helper: 取得 userId 和 refrigeratorId =====
const getUserId = (req) => {
    return req.headers["x-user-id"] ?? null;
};
const getRefrigeratorId = (req) => {
    return req.params.refrigeratorId;
};
// ===== 3.1 取得庫存列表 =====
router.get("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        const refrigeratorId = getRefrigeratorId(req);
        if (!userId) {
            res.status(400).json({ status: false, error: "缺少 X-User-Id" });
            return;
        }
        const params = {
            page: req.query.page ? parseInt(req.query.page, 10) : 1,
            limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
            category: req.query.category,
            status: req.query.status,
            include: req.query.include,
        };
        const result = await inventoryService.getInventoryItems(userId, refrigeratorId, params);
        res.json({
            status: true,
            data: {
                items: result.items,
                total: result.total,
                ...(result.stats && { stats: result.stats }),
                ...(result.summary && { summary: result.summary }),
            },
        });
    }
    catch (error) {
        console.error("[Inventory] 取得列表失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.8 取得分類列表 =====
router.get("/categories", async (req, res) => {
    try {
        const userId = getUserId(req);
        const refrigeratorId = getRefrigeratorId(req);
        if (!userId) {
            res.status(400).json({ status: false, error: "缺少 X-User-Id" });
            return;
        }
        const categories = await inventoryService.getInventoryCategories(userId, refrigeratorId);
        res.json({ status: true, data: { categories } });
    }
    catch (error) {
        console.error("[Inventory] 取得分類失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.9 取得庫存摘要 =====
router.get("/summary", async (req, res) => {
    try {
        const userId = getUserId(req);
        const refrigeratorId = getRefrigeratorId(req);
        if (!userId) {
            res.status(400).json({ status: false, error: "缺少 X-User-Id" });
            return;
        }
        const summary = await inventoryService.getInventorySummary(userId, refrigeratorId);
        res.json({ status: true, data: { summary } });
    }
    catch (error) {
        console.error("[Inventory] 取得摘要失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.11 取得庫存設定 =====
router.get("/settings", async (req, res) => {
    try {
        const userId = getUserId(req);
        const refrigeratorId = getRefrigeratorId(req);
        if (!userId) {
            res.status(400).json({ status: false, error: "缺少 X-User-Id" });
            return;
        }
        const settings = await inventoryService.getInventorySettings(userId, refrigeratorId);
        res.json({ status: true, data: { settings } });
    }
    catch (error) {
        console.error("[Inventory] 取得設定失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.11 更新庫存設定 (PUT) =====
router.put("/settings", async (req, res) => {
    try {
        const userId = getUserId(req);
        const refrigeratorId = getRefrigeratorId(req);
        if (!userId) {
            res.status(400).json({ status: false, error: "缺少 X-User-Id" });
            return;
        }
        const input = req.body;
        const settings = await inventoryService.updateInventorySettings(userId, refrigeratorId, input);
        res.json({
            status: true,
            message: "設定已更新",
            data: { settings },
        });
    }
    catch (error) {
        console.error("[Inventory] 更新設定失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.11 部分更新庫存設定 (PATCH) =====
router.patch("/settings", async (req, res) => {
    try {
        const userId = getUserId(req);
        const refrigeratorId = getRefrigeratorId(req);
        if (!userId) {
            res.status(400).json({ status: false, error: "缺少 X-User-Id" });
            return;
        }
        const input = req.body;
        const settings = await inventoryService.updateInventorySettings(userId, refrigeratorId, input);
        res.json({
            status: true,
            message: "設定已更新",
            data: { settings },
        });
    }
    catch (error) {
        console.error("[Inventory] 更新設定失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.2 取得單筆食材 =====
router.get("/:id", async (req, res) => {
    try {
        const refrigeratorId = getRefrigeratorId(req);
        const { id } = req.params;
        const item = await inventoryService.getInventoryById(id, refrigeratorId);
        if (!item) {
            res.status(404).json({ status: false, error: "找不到該食材" });
            return;
        }
        res.json({ status: true, data: { item } });
    }
    catch (error) {
        console.error("[Inventory] 取得單筆失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.3 新增食材 =====
router.post("/", async (req, res) => {
    try {
        const userId = getUserId(req);
        const refrigeratorId = getRefrigeratorId(req);
        if (!userId) {
            res.status(400).json({ status: false, error: "缺少 X-User-Id" });
            return;
        }
        const input = req.body;
        if (!input.name) {
            res.status(400).json({ status: false, error: "缺少食材名稱" });
            return;
        }
        const item = await inventoryService.createInventoryItem(userId, refrigeratorId, input);
        // 觸發通知
        // 觸發通知
        try {
            const notif = input.notification || {};
            const title = notif.title || "入庫成功";
            const body = notif.body || `已成功新增食材：${item.name}`;
            await notificationService.sendToRefrigeratorMembers(refrigeratorId, title, body, "stock", { type: "inventory", payload: { itemId: item.id } }, "stock", // category
            userId, // operatorId
            "stockIn", // subType
            notif.actorName, // from frontend or undefined
            notif.groupName // from frontend or undefined
            );
        }
        catch (err) {
            console.warn("[Inventory] Notification failed:", err);
        }
        res.status(201).json({
            status: true,
            message: "Created successfully",
            data: { id: item.id },
        });
    }
    catch (error) {
        console.error("[Inventory] 新增失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.4 更新食材 =====
router.put("/:id", async (req, res) => {
    try {
        const refrigeratorId = getRefrigeratorId(req);
        const { id } = req.params;
        const input = req.body;
        const item = await inventoryService.updateInventoryItem(id, refrigeratorId, input);
        if (!item) {
            res.status(404).json({ status: false, error: "找不到該食材" });
            return;
        }
        res.json({
            status: true,
            message: "Updated successfully",
            data: { id: item.id },
        });
    }
    catch (error) {
        console.error("[Inventory] 更新失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.5 刪除食材 =====
router.delete("/:id", async (req, res) => {
    try {
        const refrigeratorId = getRefrigeratorId(req);
        const { id } = req.params;
        const deleted = await inventoryService.deleteInventoryItem(id, refrigeratorId);
        if (!deleted) {
            res.status(404).json({ status: false, error: "找不到該食材" });
            return;
        }
        res.json({ status: true, message: "Deleted successfully" });
    }
    catch (error) {
        console.error("[Inventory] 刪除失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
// ===== 3.12 消耗食材 =====
router.post("/:id/consume", async (req, res) => {
    try {
        const refrigeratorId = getRefrigeratorId(req);
        const { id } = req.params;
        const input = req.body;
        if (!input.quantity || input.quantity <= 0) {
            res.status(400).json({
                status: false,
                code: "INV_001",
                error: "缺少或無效的 quantity 欄位",
            });
            return;
        }
        if (!input.reasons || input.reasons.length === 0) {
            res.status(400).json({
                status: false,
                error: "缺少 reasons 欄位",
            });
            return;
        }
        const result = await inventoryService.consumeInventoryItem(id, refrigeratorId, input);
        if (!result) {
            res.status(404).json({
                status: false,
                code: "INV_004",
                error: "找不到該食材",
            });
            return;
        }
        // 觸發消耗通知 (Broadcast)
        try {
            const userId = getUserId(req);
            if (userId) {
                // 現在 consumeInventoryItem 會回傳 name 與 unit
                const itemName = result.name;
                const notif = input.notification || {};
                // 預設文案
                const defaultTitle = "食材消耗通知";
                const defaultBody = `已消耗 ${input.quantity} ${result.unit} ${itemName}`;
                await notificationService.sendToRefrigeratorMembers(refrigeratorId, notif.title || defaultTitle, notif.body || defaultBody, "stock", { type: "inventory", payload: { itemId: id } }, "stock", userId, "consume", // subType
                notif.actorName, notif.groupName);
            }
        }
        catch (err) {
            console.warn("[Inventory] Consumption notification failed:", err);
        }
        res.json({
            status: true,
            message: "Consumed successfully",
            data: result,
        });
    }
    catch (error) {
        if (error instanceof Error && error.message === "消耗數量超過庫存") {
            res.status(400).json({
                status: false,
                code: "INV_002",
                error: error.message,
            });
            return;
        }
        console.error("[Inventory] 消耗失敗:", error);
        res.status(500).json({ status: false, error: "伺服器錯誤" });
    }
});
export default router;
