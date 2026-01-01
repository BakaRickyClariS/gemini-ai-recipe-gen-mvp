import "dotenv/config";
import { query, pool } from "../db/index.js";

async function listTables() {
  try {
    const result = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log(
      "Tables:",
      result.rows.map((r) => r.table_name)
    );

    // Also check column names for refrigerators or groups related tables
    const refTable = result.rows.find((r) =>
      r.table_name.includes("refrigerator")
    );
    if (refTable) {
      console.log(`\nColumns for ${refTable.table_name}:`);
      const columns = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${refTable.table_name}'
        `);
      console.log(columns.rows);
    }

    // Check for user-refrigerator link table
    const linkTable = result.rows.find(
      (r) =>
        r.table_name.includes("user") && r.table_name.includes("refrigerator")
    );
    if (linkTable) {
      console.log(`\nColumns for ${linkTable.table_name}:`);
      const columns = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${linkTable.table_name}'
        `);
      console.log(columns.rows);
    }
    // Check for members table
    const memberTable = result.rows.find((r) =>
      r.table_name.includes("member")
    );
    if (memberTable) {
      console.log(`\nColumns for ${memberTable.table_name}:`);
      const columns = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${memberTable.table_name}'
        `);
      console.log(columns.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (pool) await pool.end();
  }
}

listTables();
