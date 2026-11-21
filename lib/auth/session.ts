import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { and, eq, gt, lt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "am_session";
const SESSION_DAYS = 30;
const RENEW_WHEN_DAYS_LEFT = 15;
const DAY = 24 * 60 * 60 * 1000;

export async function requestMeta() {
  const h = await headers();
  const ip =
    h.get("cf-connecting-ip") || h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
  return { ip, userAgent: h.get("user-agent")?.slice(0, 300) || null };
}

async function setCookie(token: string, expires: Date) {
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/",
    expires,
  });
}

export async function createSession(userId: string, opts: { mfaVerified: boolean; activeTenantId?: string | null }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
  const meta = await requestMeta();
  await db.insert(schema.sessions).values({
    id: sha256(token),
    userId,
    expiresAt,
    mfaVerified: opts.mfaVerified,
    activeTenantId: opts.activeTenantId ?? null,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  await setCookie(token, expiresAt);
  // Opportunistic cleanup of expired sessions for this user.
  await db.delete(schema.sessions).where(and(eq(schema.sessions.userId, userId), lt(schema.sessions.expiresAt, new Date())));
}

export type SessionWithUser = {
  session: typeof schema.sessions.$inferSelect;
  user: typeof schema.users.$inferSelect;
};

/** Validates the cookie against the database. Cached per request. */
export const getSession = cache(async (): Promise<SessionWithUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 100) return null;

  const id = sha256(token);
  const rows = await db
    .select({ session: schema.sessions, user: schema.users })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .where(and(eq(schema.sessions.id, id), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);

  const row = rows[0];
  if (!row) return null;
  if (row.user.status !== "active") {
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, row.user.id));
    return null;
  }

  // Sliding expiry.
  if (row.session.expiresAt.getTime() - Date.now() < RENEW_WHEN_DAYS_LEFT * DAY) {
    const expiresAt = new Date(Date.now() + SESSION_DAYS * DAY);
    await db.update(schema.sessions).set({ expiresAt }).where(eq(schema.sessions.id, id));
    row.session.expiresAt = expiresAt;
    try {
      await setCookie(token, expiresAt);
    } catch {
      // Server Components cannot set cookies; the next action/route will.
    }
  }
  return row;
});

export async function updateSession(patch: Partial<typeof schema.sessions.$inferInsert>) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return;
  await db.update(schema.sessions).set(patch).where(eq(schema.sessions.id, sha256(token)));
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.id, sha256(token)));
  store.delete(SESSION_COOKIE);
}

export async function destroyAllSessions(userId: string, exceptCurrent = false) {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const all = await db.select({ id: schema.sessions.id }).from(schema.sessions).where(eq(schema.sessions.userId, userId));
  for (const s of all) {
    if (exceptCurrent && token && s.id === sha256(token)) continue;
    await db.delete(schema.sessions).where(eq(schema.sessions.id, s.id));
  }
}
