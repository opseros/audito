import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Neon works over the standard Postgres protocol. Use the pooled connection
 * string (host contains "-pooler") in DATABASE_URL. One small pool per
 * serverless instance, reused across requests.
 */
const globalForDb = globalThis as unknown as { pool?: Pool };

function createPool() {
  // Not validated here: modules are imported during `next build` without a
  // database. A missing URL surfaces on the first query instead.
  const url = process.env.DATABASE_URL || "";
  const local = !url || /localhost|127\.0\.0\.1/.test(url);
  return new Pool({
    connectionString: url || undefined,
    max: 5,
    idleTimeoutMillis: 10_000,
    ssl: local ? undefined : { rejectUnauthorized: true },
  });
}

const pool = globalForDb.pool ?? createPool();
if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
