/**
 * Drizzle ORM 客戶端
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { pool } from "./index.js";
import * as schema from "./schema/index.js";
if (!pool) {
    throw new Error("Database pool not initialized");
}
export const db = drizzle(pool, { schema });
