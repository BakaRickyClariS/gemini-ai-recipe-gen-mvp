import "dotenv/config";
import { query, pool } from "../db/index.js";
async function verify() {
    try {
        console.log("🔍 Checking notifications table schema...");
        // Try to select the new column
        const res = await query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'category';`);
        if (res.rows.length > 0) {
            console.log('✅ Column "category" exists!');
            console.log("Type:", res.rows[0].data_type);
        }
        else {
            console.error('❌ Column "category" NOT found.');
            process.exit(1);
        }
    }
    catch (err) {
        console.error("❌ Error:", err);
        process.exit(1);
    }
    finally {
        if (pool) {
            await pool.end();
        }
    }
}
verify();
