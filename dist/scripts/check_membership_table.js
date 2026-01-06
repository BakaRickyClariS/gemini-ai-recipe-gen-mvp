import "dotenv/config";
import { query, pool } from "../db/index.js";
async function checkTables() {
    const tables = [
        "user_refrigerators",
        "user_groups",
        "group_members",
        "refrigerator_members",
    ];
    for (const table of tables) {
        try {
            await query(`SELECT 1 FROM ${table} LIMIT 1`);
            console.log(`✅ Table '${table}' EXISTS`);
        }
        catch (e) {
            if (e.code === "42P01") {
                console.log(`❌ Table '${table}' does NOT exist`);
            }
            else {
                console.log(`⚠️ Error checking '${table}': ${e.message}`);
            }
        }
    }
    if (pool)
        await pool.end();
}
checkTables();
