import "dotenv/config";
import { pool } from "../db/index.js";
const MIGRATION_SQL = `
-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  icon TEXT,
  bg_color TEXT,
  sort_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Insert strict categories (Upsert)
INSERT INTO categories (id, title, icon, bg_color, sort_order) VALUES
('fruit', '蔬果類', '/images/categories/fruit.png', '#E8F5E9', 10),
('frozen', '冷凍調理類', '/images/categories/frozen.png', '#E3F2FD', 20),
('bake', '主食烘焙類', '/images/categories/bake.png', '#FFF3E0', 30),
('milk', '乳品飲料類', '/images/categories/milk.png', '#FFFDE7', 40),
('seafood', '冷凍海鮮類', '/images/categories/seafood.png', '#E0F7FA', 50),
('meat', '肉品類', '/images/categories/meat.png', '#FFEBEE', 60),
('others', '乾貨醬料類', '/images/categories/others.png', '#F5F5F5', 70)
ON CONFLICT (id) DO UPDATE SET 
  title = EXCLUDED.title,
  bg_color = EXCLUDED.bg_color,
  sort_order = EXCLUDED.sort_order;

-- 3. Data Migration: Map old Chinese categories to new IDs
-- Note: '蔬菜類', '水果' -> 'fruit'
UPDATE inventory SET category = 'fruit' WHERE category IN ('蔬菜類', '水果', '葉菜類', '根莖類');
-- Note: '肉類海鮮' -> 'meat' (Defaulting to meat as safest bet, or split if possible. Logic here assumes most user data was "肉類海鮮")
UPDATE inventory SET category = 'meat' WHERE category = '肉類海鮮';
-- Note: '主食類' -> 'bake'
UPDATE inventory SET category = 'bake' WHERE category = '主食類';
-- Note: '乳製品飲料' -> 'milk'
UPDATE inventory SET category = 'milk' WHERE category = '乳製品飲料';
-- Note: '調味料類', '其他' -> 'others'
UPDATE inventory SET category = 'others' WHERE category IN ('調味料類', '其他');

-- 4. Cleanup: Move any remaining unknown categories to 'others'
UPDATE inventory SET category = 'others' WHERE category NOT IN ('fruit', 'frozen', 'bake', 'milk', 'seafood', 'meat', 'others');

-- 5. Strict Schema: Add Foreign Key Constraint
-- We try this. If it fails due to dirty data, the script should warn but proceed with strict mapping above ensuring it works.
ALTER TABLE inventory 
DROP CONSTRAINT IF EXISTS fk_inventory_category;

ALTER TABLE inventory
ADD CONSTRAINT fk_inventory_category
FOREIGN KEY (category) 
REFERENCES categories(id)
ON UPDATE CASCADE;
`;
async function runMigration() {
    if (!pool) {
        console.error("❌ Database connection failed. Please check DATABASE_URL.");
        process.exit(1);
    }
    const client = await pool.connect();
    try {
        console.log("🚀 Starting Category Normalization...");
        await client.query("BEGIN");
        await client.query(MIGRATION_SQL);
        await client.query("COMMIT");
        console.log("✅ Migration completed successfully!");
        console.log('   - Created table "categories"');
        console.log("   - Seeded 7 strict categories");
        console.log('   - Migrated existing "inventory" data');
        console.log("   - Enforced Foreign Key constraint");
    }
    catch (error) {
        await client.query("ROLLBACK");
        console.error("❌ Migration failed:", error);
    }
    finally {
        client.release();
        await pool.end();
    }
}
runMigration();
