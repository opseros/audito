import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../lib/db/schema";

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) throw new Error("Set DATABASE_URL.");
export const pool = new Pool({ connectionString: url, max: 2 });
export const db = drizzle(pool, { schema });
export { schema };
