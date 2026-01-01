/**
 * 庫存管理服務
 * 提供庫存食材的 CRUD 操作、消耗功能、統計和摘要
 */
import { query } from "../db/index.js";
// ===== 預設類別設定 =====
const DEFAULT_CATEGORY_ORDER = [
    "fruit",
    "frozen",
    "bake",
    "milk",
    "seafood",
    "meat",
    "others",
];
const DEFAULT_CATEGORIES = [
    {
        id: "fruit",
        title: "蔬果類",
        isVisible: true,
        subCategories: ["葉菜類", "根莖類", "瓜果類", "新鮮菇類", "水果"],
    },
    {
        id: "frozen",
        title: "冷凍調理類",
        isVisible: true,
        subCategories: ["冷凍調理包", "加熱即食餐", "冷凍甜點"],
    },
    {
        id: "bake",
        title: "主食烘焙類",
        isVisible: true,
        subCategories: ["米飯", "麵條", "麵包", "堅果", "乾貨"],
    },
    {
        id: "milk",
        title: "乳品飲料類",
        isVisible: true,
        subCategories: ["蛋類", "鮮奶", "優格", "奶油", "起司", "果汁", "茶飲"],
    },
    {
        id: "seafood",
        title: "冷凍海鮮類",
        isVisible: true,
        subCategories: ["魚肉", "甲殼類", "貝類", "魚漿製品"],
    },
    {
        id: "meat",
        title: "肉品類",
        isVisible: true,
        subCategories: ["豬肉類", "牛肉類", "雞肉類", "加工肉品"],
    },
    {
        id: "others",
        title: "乾貨醬料類",
        isVisible: true,
        subCategories: ["調味醬", "果醬", "乾燥食材", "油品", "醃製品"],
    },
];
// ===== 預設類別資訊（供 categories API 使用）=====
const DEFAULT_CATEGORY_INFO = [
    {
        id: "fruit",
        title: "蔬果類",
        count: 0,
        imageUrl: "/images/categories/fruit.png",
        bgColor: "#E8F5E9",
        slogan: "新鮮蔬果",
        description: ["葉菜類", "根莖類", "瓜果類", "新鮮菇類", "水果"],
    },
    {
        id: "frozen",
        title: "冷凍調理類",
        count: 0,
        imageUrl: "/images/categories/frozen.png",
        bgColor: "#E3F2FD",
        slogan: "冷凍食品",
        description: ["冷凍調理包", "加熱即食餐", "冷凍甜點"],
    },
    {
        id: "bake",
        title: "主食烘焙類",
        count: 0,
        imageUrl: "/images/categories/bake.png",
        bgColor: "#FFF3E0",
        slogan: "麵包主食",
        description: ["米飯", "麵條", "麵包", "堅果", "乾貨"],
    },
    {
        id: "milk",
        title: "乳品飲料類",
        count: 0,
        imageUrl: "/images/categories/milk.png",
        bgColor: "#FFFDE7",
        slogan: "乳製品",
        description: ["蛋類", "鮮奶", "優格", "奶油", "起司", "果汁", "茶飲"],
    },
    {
        id: "seafood",
        title: "冷凍海鮮類",
        count: 0,
        imageUrl: "/images/categories/seafood.png",
        bgColor: "#E0F7FA",
        slogan: "新鮮海產",
        description: ["魚肉", "甲殼類", "貝類", "魚漿製品"],
    },
    {
        id: "meat",
        title: "肉品類",
        count: 0,
        imageUrl: "/images/categories/meat.png",
        bgColor: "#FFEBEE",
        slogan: "優質肉品",
        description: ["豬肉類", "牛肉類", "雞肉類", "加工肉品"],
    },
    {
        id: "others",
        title: "乾貨醬料類",
        count: 0,
        imageUrl: "/images/categories/others.png",
        bgColor: "#F5F5F5",
        slogan: "其他食材",
        description: ["調味醬", "果醬", "乾燥食材", "油品", "醃製品"],
    },
];
// ===== Row 轉換 =====
const rowToInventoryItem = (row) => ({
    id: row.id,
    userId: row.user_id,
    refrigeratorId: row.refrigerator_id,
    name: row.name,
    category: row.category,
    quantity: parseFloat(row.quantity),
    unit: row.unit,
    imageUrl: row.image_url ?? undefined,
    purchaseDate: row.purchase_date ?? "",
    expiryDate: row.expiry_date ?? "",
    lowStockAlert: row.low_stock_alert,
    lowStockThreshold: parseFloat(row.low_stock_threshold),
    notes: row.notes ?? undefined,
    attributes: row.attributes ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
});
const rowToSettings = (row) => ({
    id: row.id,
    userId: row.user_id,
    refrigeratorId: row.refrigerator_id ?? undefined,
    layoutType: row.layout_type,
    categoryOrder: row.category_order,
    categories: row.categories ?? undefined,
    lowStockThreshold: row.low_stock_threshold,
    expiringSoonDays: row.expiring_soon_days,
    notifyOnExpiry: row.notify_on_expiry,
    notifyOnLowStock: row.notify_on_low_stock,
    createdAt: row.created_at,
    updatedAt: row.updated_at ?? undefined,
});
// ===== 庫存管理 API =====
/**
 * 取得庫存列表
 */
export const getInventoryItems = async (userId, refrigeratorId, params = {}) => {
    const { page = 1, limit = 50, category, status, include } = params;
    const offset = (page - 1) * limit;
    let whereClause = "WHERE user_id = $1 AND refrigerator_id = $2";
    const values = [userId, refrigeratorId];
    let paramIndex = 3;
    // 分類篩選
    if (category) {
        whereClause += ` AND category = $${paramIndex}`;
        values.push(category);
        paramIndex++;
    }
    // 狀態篩選
    if (status) {
        const today = new Date().toISOString().split("T")[0];
        const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
            .toISOString()
            .split("T")[0];
        switch (status) {
            case "expired":
                whereClause += ` AND expiry_date < $${paramIndex}`;
                values.push(today);
                paramIndex++;
                break;
            case "expiring-soon":
                whereClause += ` AND expiry_date >= $${paramIndex} AND expiry_date <= $${paramIndex + 1}`;
                values.push(today, threeDaysLater);
                paramIndex += 2;
                break;
            case "low-stock":
                whereClause +=
                    " AND low_stock_alert = TRUE AND quantity <= low_stock_threshold";
                break;
        }
    }
    // 取得總數
    const countResult = await query(`SELECT COUNT(*) as count FROM inventory ${whereClause}`, values);
    const total = parseInt(countResult.rows[0]?.count ?? "0", 10);
    // 取得列表 (JOIN categories 取得中文標題)
    // 注意：我們保持 rowToInventoryItem 介面，但 category 欄位現在是英文 ID。
    // 若前端需要中文標題，可以在 rowToInventoryItem 或這裡擴充。
    // 目前 InventoryItem type 的 category 是 string (ID)。前端負責顯示 Mapping。
    // 但為了方便 debug，我們這裡還是只單純撈 inventory 即可，因為 category ID 已經夠明確。
    // 使用者要求"正規化"，主要目的是"資料庫結構"。API 回傳 "fruit" 是正確的。
    const listResult = await query(`SELECT * FROM inventory ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`, [...values, limit, offset]);
    const items = listResult.rows.map(rowToInventoryItem);
    const result = {
        items,
        total,
    };
    // 包含統計
    if (include?.includes("stats")) {
        result.stats = await getInventoryStats(userId, refrigeratorId);
    }
    // 包含摘要
    if (include?.includes("summary")) {
        result.summary = await getInventorySummary(userId, refrigeratorId);
    }
    return result;
};
/**
 * 取得單一食材
 */
export const getInventoryById = async (id, refrigeratorId) => {
    const result = await query("SELECT * FROM inventory WHERE id = $1 AND refrigerator_id = $2", [id, refrigeratorId]);
    return result.rows[0] ? rowToInventoryItem(result.rows[0]) : null;
};
/**
 * 新增食材
 */
export const createInventoryItem = async (userId, refrigeratorId, input) => {
    const result = await query(`INSERT INTO inventory (
      user_id, refrigerator_id, name, category, quantity, unit,
      image_url, purchase_date, expiry_date, low_stock_alert,
      low_stock_threshold, notes, attributes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`, [
        userId,
        refrigeratorId,
        input.name,
        input.category ?? null,
        input.quantity,
        input.unit ?? null,
        input.imageUrl ?? null,
        input.purchaseDate ?? null,
        input.expiryDate ?? null,
        input.lowStockAlert ?? false,
        input.lowStockThreshold ?? 1,
        input.notes ?? null,
        input.attributes ? JSON.stringify(input.attributes) : null,
    ]);
    return rowToInventoryItem(result.rows[0]);
};
/**
 * 更新食材
 */
export const updateInventoryItem = async (id, refrigeratorId, input) => {
    const updates = [];
    const values = [];
    let paramIndex = 1;
    const fieldMap = {
        name: "name",
        category: "category",
        quantity: "quantity",
        unit: "unit",
        imageUrl: "image_url",
        purchaseDate: "purchase_date",
        expiryDate: "expiry_date",
        lowStockAlert: "low_stock_alert",
        lowStockThreshold: "low_stock_threshold",
        notes: "notes",
    };
    for (const [key, dbField] of Object.entries(fieldMap)) {
        if (input[key] !== undefined) {
            updates.push(`${dbField} = $${paramIndex}`);
            values.push(input[key]);
            paramIndex++;
        }
    }
    if (input.attributes !== undefined) {
        updates.push(`attributes = $${paramIndex}`);
        values.push(JSON.stringify(input.attributes));
        paramIndex++;
    }
    if (updates.length === 0)
        return null;
    updates.push(`updated_at = NOW()`);
    values.push(id, refrigeratorId);
    const result = await query(`UPDATE inventory SET ${updates.join(", ")} WHERE id = $${paramIndex} AND refrigerator_id = $${paramIndex + 1} RETURNING *`, values);
    return result.rows[0] ? rowToInventoryItem(result.rows[0]) : null;
};
/**
 * 刪除食材
 */
export const deleteInventoryItem = async (id, refrigeratorId) => {
    const result = await query("DELETE FROM inventory WHERE id = $1 AND refrigerator_id = $2", [id, refrigeratorId]);
    return (result.rowCount ?? 0) > 0;
};
/**
 * 消耗食材
 */
export const consumeInventoryItem = async (id, refrigeratorId, input) => {
    // 先取得目前數量
    const item = await getInventoryById(id, refrigeratorId);
    if (!item)
        return null;
    const newQuantity = item.quantity - input.quantity;
    if (newQuantity < 0) {
        throw new Error("消耗數量超過庫存");
    }
    const consumedAt = new Date().toISOString();
    if (newQuantity === 0) {
        // 數量為 0 時刪除
        await deleteInventoryItem(id, refrigeratorId);
    }
    else {
        // 更新數量
        await updateInventoryItem(id, refrigeratorId, { quantity: newQuantity });
    }
    // TODO: 可以在此記錄消耗歷史
    return {
        id,
        name: item.name,
        unit: item.unit,
        remainingQuantity: newQuantity,
        consumedAt,
    };
};
/**
 * 取得庫存統計
 */
export const getInventoryStats = async (userId, refrigeratorId) => {
    const today = new Date().toISOString().split("T")[0];
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0];
    const result = await query(`SELECT 
      COUNT(*) as total_items,
      COUNT(*) FILTER (WHERE expiry_date < $3) as expired_count,
      COUNT(*) FILTER (WHERE expiry_date >= $3 AND expiry_date <= $4) as expiring_soon_count,
      COUNT(*) FILTER (WHERE low_stock_alert = TRUE AND quantity <= low_stock_threshold) as low_stock_count
    FROM inventory WHERE user_id = $1 AND refrigerator_id = $2`, [userId, refrigeratorId, today, threeDaysLater]);
    const categoryResult = await query(`SELECT category, COUNT(*) as count FROM inventory 
     WHERE user_id = $1 AND refrigerator_id = $2 
     GROUP BY category`, [userId, refrigeratorId]);
    const byCategory = {};
    for (const row of categoryResult.rows) {
        byCategory[row.category] = parseInt(row.count, 10);
    }
    const row = result.rows[0];
    return {
        totalItems: parseInt(row?.total_items ?? "0", 10),
        expiredCount: parseInt(row?.expired_count ?? "0", 10),
        expiringSoonCount: parseInt(row?.expiring_soon_count ?? "0", 10),
        lowStockCount: parseInt(row?.low_stock_count ?? "0", 10),
        byCategory,
    };
};
/**
 * 取得庫存摘要
 */
export const getInventorySummary = async (userId, refrigeratorId) => {
    const stats = await getInventoryStats(userId, refrigeratorId);
    return {
        total: stats.totalItems,
        expiring: stats.expiringSoonCount,
        expired: stats.expiredCount,
        lowStock: stats.lowStockCount,
    };
};
/**
 * 取得分類列表
 * 從真正的 categories 表取得分類，並 Left Join 庫存數量
 */
export const getInventoryCategories = async (userId, refrigeratorId) => {
    // 1. 取得所有 categories (metadata)
    // 2. 取得該 User 對應的 inventory count
    // 3. 結合回傳
    const result = await query(`SELECT 
       c.id, 
       c.title, 
       c.icon as "imageUrl", 
       c.bg_color as "bgColor",
       COALESCE(i.count, 0) as count
     FROM categories c
     LEFT JOIN (
       SELECT category, COUNT(*) as count 
       FROM inventory 
       WHERE user_id = $1 AND refrigerator_id = $2 
       GROUP BY category
     ) i ON c.id = i.category
     ORDER BY c.sort_order ASC`, [userId, refrigeratorId]);
    return result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        count: parseInt(row.count, 10),
        imageUrl: row.icon,
        bgColor: row.bg_color,
        // 以下欄位目前資料庫沒存，暫時給預設或空值，等待未來擴充 DB
        slogan: "",
        description: [],
    }));
};
// ===== 庫存設定 API =====
/**
 * 取得庫存設定
 * 如果資料庫沒有記錄，會自動建立預設設定
 */
export const getInventorySettings = async (userId, refrigeratorId) => {
    const result = await query(`SELECT * FROM inventory_settings 
     WHERE user_id = $1 AND ($2::text IS NULL OR refrigerator_id = $2)`, [userId, refrigeratorId ?? null]);
    if (result.rows[0]) {
        return rowToSettings(result.rows[0]);
    }
    // 自動建立預設設定並回傳（包含 id）
    const insertResult = await query(`INSERT INTO inventory_settings (
      user_id, refrigerator_id, layout_type, category_order, categories,
      low_stock_threshold, expiring_soon_days, notify_on_expiry, notify_on_low_stock
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    RETURNING *`, [
        userId,
        refrigeratorId ?? null,
        "layout-a",
        JSON.stringify(DEFAULT_CATEGORY_ORDER),
        JSON.stringify(DEFAULT_CATEGORIES),
        2, // lowStockThreshold
        3, // expiringSoonDays
        true, // notifyOnExpiry
        true, // notifyOnLowStock
    ]);
    return rowToSettings(insertResult.rows[0]);
};
/**
 * 更新庫存設定 (upsert)
 */
export const updateInventorySettings = async (userId, refrigeratorId, input) => {
    const existing = await query(`SELECT id FROM inventory_settings 
     WHERE user_id = $1 AND ($2::text IS NULL OR refrigerator_id = $2)`, [userId, refrigeratorId ?? null]);
    if (existing.rows[0]) {
        // Update
        const updates = [];
        const values = [];
        let paramIndex = 1;
        if (input.layoutType !== undefined) {
            updates.push(`layout_type = $${paramIndex}`);
            values.push(input.layoutType);
            paramIndex++;
        }
        if (input.categoryOrder !== undefined) {
            updates.push(`category_order = $${paramIndex}`);
            values.push(JSON.stringify(input.categoryOrder));
            paramIndex++;
        }
        if (input.categories !== undefined) {
            updates.push(`categories = $${paramIndex}`);
            values.push(JSON.stringify(input.categories));
            paramIndex++;
        }
        if (input.lowStockThreshold !== undefined) {
            updates.push(`low_stock_threshold = $${paramIndex}`);
            values.push(input.lowStockThreshold);
            paramIndex++;
        }
        if (input.expiringSoonDays !== undefined) {
            updates.push(`expiring_soon_days = $${paramIndex}`);
            values.push(input.expiringSoonDays);
            paramIndex++;
        }
        if (input.notifyOnExpiry !== undefined) {
            updates.push(`notify_on_expiry = $${paramIndex}`);
            values.push(input.notifyOnExpiry);
            paramIndex++;
        }
        if (input.notifyOnLowStock !== undefined) {
            updates.push(`notify_on_low_stock = $${paramIndex}`);
            values.push(input.notifyOnLowStock);
            paramIndex++;
        }
        if (updates.length > 0) {
            updates.push(`updated_at = NOW()`);
            values.push(existing.rows[0].id);
            const result = await query(`UPDATE inventory_settings SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`, values);
            return rowToSettings(result.rows[0]);
        }
        return getInventorySettings(userId, refrigeratorId);
    }
    else {
        // Insert
        const result = await query(`INSERT INTO inventory_settings (
        user_id, refrigerator_id, layout_type, category_order, categories,
        low_stock_threshold, expiring_soon_days, notify_on_expiry, notify_on_low_stock
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`, [
            userId,
            refrigeratorId ?? null,
            input.layoutType ?? "layout-a",
            JSON.stringify(input.categoryOrder ?? DEFAULT_CATEGORY_ORDER),
            JSON.stringify(input.categories ?? DEFAULT_CATEGORIES),
            input.lowStockThreshold ?? 2,
            input.expiringSoonDays ?? 3,
            input.notifyOnExpiry ?? true,
            input.notifyOnLowStock ?? true,
        ]);
        return rowToSettings(result.rows[0]);
    }
};
