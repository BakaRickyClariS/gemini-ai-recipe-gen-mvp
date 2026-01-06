import "dotenv/config";
import { query, pool } from "../db/index.js";
async function listTables() {
    try {
        const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
        // console.log(
        //   "Tables:",
        //   result.rows.map((r) => r.table_name)
        // );
        console.log("TABLES FOUND:", result.rows.map((r) => r.table_name).join(", "));
        return; // Exit early
    }
    catch (err) {
        console.error(err);
    }
    finally {
        if (pool)
            await pool.end();
    }
}
listTables();
