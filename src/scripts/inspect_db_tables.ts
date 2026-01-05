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

    // Check for inventory_settings table
    const settingsTable = result.rows.find((r) => r.table_name === "inventory_settings");
    if (settingsTable) {
      console.log(`\nColumns for ${settingsTable.table_name}:`);
      const columns = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${settingsTable.table_name}'
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
    // Check for users table
    const usersTable = result.rows.find((r) => r.table_name === "users");
    if (usersTable) {
      console.log(`\nColumns for ${usersTable.table_name}:`);
      const columns = await query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = '${usersTable.table_name}'
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
