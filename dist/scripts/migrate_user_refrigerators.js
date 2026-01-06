import "dotenv/config";
import { query, pool } from "../db/index.js";
async function runMigration() {
    console.log("🚀 Starting user_refrigerators Migration...");
    try {
        // 1. Create user_refrigerators table
        console.log("1️⃣  Creating 'user_refrigerators' table...");
        await query(`
      CREATE TABLE IF NOT EXISTS user_refrigerators (
        user_id VARCHAR(100) NOT NULL,
        refrigerator_id VARCHAR(100) NOT NULL,
        role VARCHAR(20) DEFAULT 'member', -- owner, admin, member
        joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        PRIMARY KEY (user_id, refrigerator_id)
      );
    `);
        console.log("   ✅ user_refrigerators table created.");
        // 2. Backfill from inventory_settings (Users who have settings)
        console.log("2️⃣  Backfilling from inventory_settings...");
        const settingsResult = await query(`
      INSERT INTO user_refrigerators (user_id, refrigerator_id, role)
      SELECT DISTINCT user_id, refrigerator_id, 'member'
      FROM inventory_settings
      WHERE refrigerator_id IS NOT NULL AND user_id IS NOT NULL
      ON CONFLICT (user_id, refrigerator_id) DO NOTHING;
    `);
        console.log(`   ✅ Backfilled ${settingsResult.rowCount} rows from settings.`);
        // 3. Backfill from inventory (Users who have created items)
        // This catches users who might have added items but haven't saved explicit settings yet
        console.log("3️⃣  Backfilling from inventory...");
        const inventoryResult = await query(`
      INSERT INTO user_refrigerators (user_id, refrigerator_id, role)
      SELECT DISTINCT user_id, refrigerator_id, 'member'
      FROM inventory
      WHERE refrigerator_id IS NOT NULL AND user_id IS NOT NULL
      ON CONFLICT (user_id, refrigerator_id) DO NOTHING;
    `);
        console.log(`   ✅ Backfilled ${inventoryResult.rowCount} rows from inventory usage.`);
        // 4. Backfill Owner logic (Optional: infer owner from refrigerators table if exists)
        // If refrigerators table exists and has owner_id
        try {
            const ownerResult = await query(`
          INSERT INTO user_refrigerators (user_id, refrigerator_id, role)
          SELECT owner_id, id, 'owner'
          FROM refrigerators
          WHERE owner_id IS NOT NULL
          ON CONFLICT (user_id, refrigerator_id) 
          DO UPDATE SET role = 'owner';
       `);
            console.log(`   ✅ Updated ${ownerResult.rowCount} owners.`);
        }
        catch (e) {
            console.log("   ℹ️  Skipping owner update (refrigerators table might not have owner_id yet)");
        }
    }
    catch (err) {
        console.error("❌ Migration Failed:", err);
    }
    finally {
        if (pool)
            await pool.end();
    }
}
runMigration();
