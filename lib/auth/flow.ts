import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { createSession, requestMeta } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { safeNext } from "@/lib/validation";
import type { User } from "@/lib/db/schema";

/** Creates the session after primary authentication and returns where to go next. */
export async function completeSignIn(user: User, method: string, next?: string) {
  const [first] = await db
    .select({ tenantId: schema.memberships.tenantId })
    .from(schema.memberships)
    .where(eq(schema.memberships.userId, user.id))
    .limit(1);

  const needsMfa = Boolean(user.mfaEnabledAt);
  await createSession(user.id, { mfaVerified: !needsMfa, activeTenantId: first?.tenantId ?? null });
  await db.update(schema.users).set({ lastLoginAt: new Date() }).where(eq(schema.users.id, user.id));
  const meta = await requestMeta();
  await audit({
    actorUserId: user.id,
    actorLabel: user.name,
    tenantId: first?.tenantId ?? null,
    action: "auth.sign_in",
    summary: `signed in with ${method}`,
    ip: meta.ip,
  });

  const target = safeNext(next, user.isSuperAdmin && !first ? "/admin" : "/app");
  return needsMfa ? `/mfa?next=${encodeURIComponent(target)}` : target;
}

export async function issueToken(userId: string, kind: "email_verify" | "password_reset", ttlMinutes: number) {
  const token = randomToken(32);
  await db.insert(schema.authTokens).values({
    id: sha256(token),
    userId,
    kind,
    expiresAt: new Date(Date.now() + ttlMinutes * 60 * 1000),
  });
  return token;
}

export async function sendVerificationEmail(user: Pick<User, "id" | "email" | "name">) {
  const token = await issueToken(user.id, "email_verify", 24 * 60);
  const link = `${env.appUrl}/verify-email/confirm?token=${token}`;
  await sendEmail(
    user.email,
    "Confirm your AuditMesh email",
    `Hi ${user.name},\n\nConfirm your email address to finish setting up AuditMesh:\n${link}\n\nThe link expires in 24 hours.`
  );
}

export function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40) || "workspace"
  );
}

export async function uniqueSlug(name: string) {
  const base = slugify(name);
  for (let i = 0; i < 20; i++) {
    const slug = i === 0 ? base : `${base}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const [hit] = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.slug, slug));
    if (!hit) return slug;
  }
  return `${base}-${Date.now()}`;
}
