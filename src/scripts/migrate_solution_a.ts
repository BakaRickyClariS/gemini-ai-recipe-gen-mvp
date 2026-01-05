import "dotenv/config";
import { query, pool } from "../db/index.js";

async function runMigration() {
  console.log("🚀 Starting Solution A Migration...");

  try {
    // 1. Add display_name to users table
    console.log("1️⃣  Checking/Adding 'display_name' to users table...");
    await query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS display_name VARCHAR(100);
    `);
    console.log("   ✅ users.display_name column ensured.");

    // 2. Create refrigerators table
    console.log("2️⃣  Creating 'refrigerators' table...");
    await query(`
      CREATE TABLE IF NOT EXISTS refrigerators (
        id VARCHAR(100) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        owner_id VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log("   ✅ refrigerators table created.");

    // 3. Backfill refrigerators from inventory_settings
    console.log("3️⃣  Backfilling refrigerators from inventory_settings...");
    // Find all distinct refrigerator_ids that are not yet in refrigerators table
    const result = await query(`
      SELECT DISTINCT refrigerator_id 
      FROM inventory_settings 
      WHERE refrigerator_id IS NOT NULL 
      AND refrigerator_id NOT IN (SELECT id FROM refrigerators)
    `);

    if (result.rows.length > 0) {
      console.log(`   Found ${result.rows.length} refrigerators to backfill.`);
      for (const row of result.rows) {
        // Default name: "我的冰箱" (My Fridge)
        await query(`
          INSERT INTO refrigerators (id, name, created_at)
          VALUES ($1, $2, NOW())
        `, [row.refrigerator_id, "我的冰箱"]);
      }
      console.log("   ✅ Backfill completed.");
    } else {
      console.log("   ℹ️  No new refrigerators to backfill.");
    }

  } catch (err) {
    console.error("❌ Migration Failed:", err);
  } finally {
    if (pool) await pool.end();
  }
}

runMigration();
