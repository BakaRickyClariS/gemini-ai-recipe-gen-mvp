import "dotenv/config";
import { query, pool } from "../db/index.js";

async function checkFridgeSharing() {
  try {
    // Check if any refrigerator_id is associated with multiple distinct user_ids
    const result = await query(`
      SELECT refrigerator_id, COUNT(DISTINCT user_id) as user_count, array_agg(DISTINCT user_id) as users
      FROM inventory
      GROUP BY refrigerator_id
      HAVING COUNT(DISTINCT user_id) > 1
    `);

    if (result.rowCount === 0) {
      console.log("No shared refrigerators found in 'inventory' table.");

      // Also show sample data to confirm assumption
      const sample = await query(
        `SELECT user_id, refrigerator_id FROM inventory LIMIT 5`
      );
      console.log("Sample inventory rows:", sample.rows);
    } else {
      console.log("Found shared refrigerators:", result.rows);
    }
  } catch (err) {
    console.error(err);
  } finally {
    if (pool) await pool.end();
  }
}

checkFridgeSharing();
