import pkg from "pg";
const { Client } = pkg;
import "dotenv/config";

async function verify() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'tour_updated_at'
    `);

    if (res.rows.length > 0) {
      console.log("✅ SUCCESS: 'tour_updated_at' column exists in database.");
    } else {
      console.log("❌ FAILURE: 'tour_updated_at' column is missing.");

      console.log("Attempting to add column manually...");
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS tour_updated_at TIMESTAMP DEFAULT NOW()",
      );
      console.log("✅ Column added manually.");
    }
  } catch (err) {
    console.error("❌ Verification failed:", err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

verify();
