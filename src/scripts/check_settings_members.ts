import "dotenv/config";
import { query, pool } from "../db/index.js";

async function checkInventorySettingsAsMembers() {
  try {
    const fridgeId = "019b327e-3389-7f84-a64a-355444a1f866"; // The shared one we found
    console.log(`Checking members for fridge: ${fridgeId}`);

    const result = await query(
      `
      SELECT user_id 
      FROM inventory_settings 
      WHERE refrigerator_id = $1
    `,
      [fridgeId]
    );

    console.log("Members found in inventory_settings:", result.rows);
  } catch (err) {
    console.error(err);
  } finally {
    if (pool) await pool.end();
  }
}

checkInventorySettingsAsMembers();
