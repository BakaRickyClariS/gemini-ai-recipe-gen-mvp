import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 增加監聽器來捕捉連線池錯誤
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

export const query = async (text: string, params?: any[]) => {
  try {
    return await pool.query(text, params);
  } catch (error: any) {
    // 這樣可以印出真正的錯誤文字，而不是 [Object: null prototype]
    console.error('Database Query Error:', error.message || error);
    throw error;
  }
};
