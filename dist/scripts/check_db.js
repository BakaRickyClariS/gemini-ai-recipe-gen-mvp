import "dotenv/config";
import { query, pool } from "../db/index.js";
async function checkDB() {
    try {
        console.log("🔍 Checking database tables...");
        const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';");
        console.log("Tables found:", res.rows.map(r => r.table_name));
        // Check if 'User' or 'users' exists and list columns
        const userTable = res.rows.find(r => r.table_name.toLowerCase() === 'user' || r.table_name.toLowerCase() === 'users');
        if (userTable) {
            console.log(`\n🔍 Columns for table '${userTable.table_name}':`);
            const cols = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${userTable.table_name}';`);
            console.log(cols.rows);
        }
    }
    catch (error) {
        console.error("Error:", error);
    }
    finally {
        if (pool)
            await pool.end();
    }
}
checkDB();
