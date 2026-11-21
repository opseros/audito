import "server-only";
import { and, count, eq, gt } from "drizzle-orm";
import { db, schema } from "@/lib/db";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_EMAIL = 5;
const MAX_PER_IP = 30;

export async function isRateLimited(email: string, ip: string | null) {
  const since = new Date(Date.now() - WINDOW_MS);
  const [byEmail] = await db
    .select({ n: count() })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.email, email), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  if ((byEmail?.n ?? 0) >= MAX_PER_EMAIL) return true;
  if (!ip) return false;
  const [byIp] = await db
    .select({ n: count() })
    .from(schema.loginAttempts)
    .where(and(eq(schema.loginAttempts.ip, ip), eq(schema.loginAttempts.success, false), gt(schema.loginAttempts.createdAt, since)));
  return (byIp?.n ?? 0) >= MAX_PER_IP;
}

export async function recordAttempt(email: string, ip: string | null, success: boolean) {
  await db.insert(schema.loginAttempts).values({ email, ip, success });
}
