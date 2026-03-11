import pkg from "pg";
const { Client } = pkg;

async function verify() {
  const dbUrl =
    "postgresql://postgres.nzdvjkfvkjxvjtmghswy:fufoodbackend200@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres";
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("Connected to database.");
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name = 'tour_updated_at'
    `);

    if (res.rows.length > 0) {
      console.log("✅ SUCCESS: 'tour_updated_at' column exists in database.");
    } else {
      console.log(
        "❌ FAILURE: 'tour_updated_at' column is missing. Adding it now...",
      );
      await client.query(
        "ALTER TABLE users ADD COLUMN IF NOT EXISTS tour_updated_at TIMESTAMP DEFAULT NOW()",
      );
      console.log("✅ Column added successfully via manual ALTER TABLE.");
    }
  } catch (err) {
    console.error("❌ Deep Verification failed:", err);
  } finally {
    await client.end();
    process.exit(0);
  }
}

verify();
