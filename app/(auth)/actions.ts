"use server";

import { redirect } from "next/navigation";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { destroyAllSessions, destroySession, getSession, requestMeta, updateSession } from "@/lib/auth/session";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { isRateLimited, recordAttempt } from "@/lib/auth/rate-limit";
import { completeSignIn, issueToken, sendVerificationEmail } from "@/lib/auth/flow";
import { checkTotp, openSecret } from "@/lib/auth/mfa";
import { audit } from "@/lib/audit";
import { sha256 } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { createTenant, setTenantFrameworks } from "@/lib/tenants";
import { emailSchema, passwordSchema, safeNext, SIGNUP_COPY, tenantKinds } from "@/lib/validation";
import type { FormState } from "@/components/forms";

const CAPTCHA_ERROR = "Security check failed. Please try again.";

async function userByEmail(email: string) {
  const [u] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${email}`).limit(1);
  return u;
}

async function signupOpen() {
  const [s] = await db.select().from(schema.platformSettings).where(eq(schema.platformSettings.key, "open_signup"));
  return s ? s.enabled : true;
}

// ------------------------------------------------------------------ sign in
export async function signInAction(_: FormState, form: FormData): Promise<FormState> {
  const { ip } = await requestMeta();
  const parsed = emailSchema.safeParse(form.get("email"));
  const password = String(form.get("password") || "");
  if (!parsed.success || !password) return { error: "Invalid email or password." };
  const email = parsed.data;

  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip, "signin"))) return { error: CAPTCHA_ERROR };
  if (await isRateLimited(email, ip)) return { error: "Too many attempts. Wait 15 minutes and try again." };

  const user = await userByEmail(email);
  const ok = await verifyPassword(user?.passwordHash, password);
  await recordAttempt(email, ip, ok && !!user);
  if (!user || !ok) return { error: "Invalid email or password." };
  if (user.status !== "active") return { error: "This account is suspended. Contact your workspace admin." };

  redirect(await completeSignIn(user, "password", String(form.get("next") || "")));
}

// ------------------------------------------------------------------ sign up
export async function signUpAction(_: FormState, form: FormData): Promise<FormState> {
  const { ip } = await requestMeta();
  if (!(await signupOpen())) return { error: "Sign-up is closed. Ask for an invitation." };

  const kind = String(form.get("kind"));
  if (!(tenantKinds as readonly string[]).includes(kind)) return { error: "Choose how you are joining." };
  const copy = SIGNUP_COPY[kind as keyof typeof SIGNUP_COPY];

  const orgName = String(form.get("orgName") || "").trim().slice(0, 120);
  const fullName = String(form.get("fullName") || "").trim().slice(0, 120);
  const extra = String(form.get("extra") || "");
  const email = emailSchema.safeParse(form.get("email"));
  const password = passwordSchema.safeParse(form.get("password"));

  if (!orgName) return { error: `${copy.nameLabel} is required.` };
  if (!fullName) return { error: "Your name is required." };
  if (!email.success) return { error: email.error.issues[0].message };
  if (!password.success) return { error: password.error.issues[0].message };
  if (!(copy.extraOpts as readonly string[]).includes(extra)) return { error: `Choose ${copy.extraLabel.toLowerCase()}.` };
  if (password.data.toLowerCase().includes(email.data.split("@")[0]) && email.data.split("@")[0].length >= 3) {
    return { error: "Password must not contain your email name." };
  }

  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip, "signup"))) return { error: CAPTCHA_ERROR };

  if (await userByEmail(email.data)) {
    // Do not reveal registration; tell the owner by email instead.
    await sendEmail(
      email.data,
      "Someone tried to sign up with your email",
      `An AuditOps account already exists for this address. Sign in at ${env.appUrl}/signin or reset your password at ${env.appUrl}/forgot-password.`
    );
    return { ok: "Check your inbox to continue." };
  }

  const [user] = await db
    .insert(schema.users)
    .values({ email: email.data, name: fullName, passwordHash: await hashPassword(password.data) })
    .returning();
  const tenant = await createTenant(user.id, kind as "organization", orgName, extra);
  await audit({
    actorUserId: user.id,
    actorLabel: user.name,
    actorTenantId: tenant.id,
    tenantId: tenant.id,
    action: "tenant.created",
    summary: `created ${copy.label.toLowerCase()} workspace ${tenant.name}`,
    ip,
  });
  await sendVerificationEmail(user);
  await completeSignIn(user, "password");
  redirect("/onboarding");
}

export async function finishOnboardingAction(form: FormData) {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  const [m] = await db
    .select({ tenant: schema.tenants, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
    .where(and(eq(schema.memberships.userId, auth.user.id), eq(schema.memberships.tenantId, auth.session.activeTenantId ?? "")));
  if (!m || (m.role !== "owner" && m.role !== "admin")) redirect("/app");
  const codes = form.getAll("fw").map(String);
  await setTenantFrameworks(m.tenant.id, m.tenant.type, codes);
  redirect("/app");
}

/** Signed-in user without a workspace (e.g. new Google/Microsoft user). */
export async function createWorkspaceAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  if (!(await signupOpen())) return { error: "Sign-up is closed. Ask for an invitation." };
  const kind = String(form.get("kind"));
  if (!(tenantKinds as readonly string[]).includes(kind)) return { error: "Choose a workspace type." };
  const copy = SIGNUP_COPY[kind as keyof typeof SIGNUP_COPY];
  const orgName = String(form.get("orgName") || "").trim().slice(0, 120);
  const extra = String(form.get("extra") || "");
  if (!orgName) return { error: `${copy.nameLabel} is required.` };
  if (!(copy.extraOpts as readonly string[]).includes(extra)) return { error: `Choose ${copy.extraLabel.toLowerCase()}.` };
  const tenant = await createTenant(auth.user.id, kind as "organization", orgName, extra);
  await updateSession({ activeTenantId: tenant.id, actingTenantId: null });
  await audit({ actorUserId: auth.user.id, actorLabel: auth.user.name, tenantId: tenant.id, action: "tenant.created", summary: `created workspace ${tenant.name}` });
  redirect("/onboarding");
}

// ------------------------------------------------------------------ MFA challenge
export async function mfaAction(_: FormState, form: FormData): Promise<FormState> {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  const { ip } = await requestMeta();
  if (await isRateLimited(`mfa:${auth.user.id}`, ip)) return { error: "Too many attempts. Wait 15 minutes." };
  const secret = openSecret(auth.user.mfaSecret);
  const ok = !!secret && checkTotp(secret, String(form.get("code") || ""));
  await recordAttempt(`mfa:${auth.user.id}`, ip, ok);
  if (!ok) return { error: "That code is not valid. Try the latest one from your app." };
  await updateSession({ mfaVerified: true });
  redirect(safeNext(form.get("next")));
}

// ------------------------------------------------------------------ password reset
export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const { ip } = await requestMeta();
  const email = emailSchema.safeParse(form.get("email"));
  if (!email.success) return { error: "Enter a valid email." };
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip, "forgot"))) return { error: CAPTCHA_ERROR };
  if (await isRateLimited(`reset:${email.data}`, ip)) return { ok: "If an account exists, a reset link is on its way." };
  await recordAttempt(`reset:${email.data}`, ip, false);

  const user = await userByEmail(email.data);
  if (user && user.status === "active") {
    const token = await issueToken(user.id, "password_reset", 60);
    await sendEmail(
      user.email,
      "Reset your AuditOps password",
      `Reset your password: ${env.appUrl}/reset-password?token=${token}\n\nThe link expires in 1 hour. If you did not ask for this, ignore this email.`
    );
  }
  return { ok: "If an account exists, a reset link is on its way." };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = String(form.get("token") || "");
  const password = passwordSchema.safeParse(form.get("password"));
  if (!password.success) return { error: password.error.issues[0].message };
  if (form.get("password") !== form.get("confirm")) return { error: "Passwords do not match." };

  const [row] = await db
    .select()
    .from(schema.authTokens)
    .where(
      and(
        eq(schema.authTokens.id, sha256(token)),
        eq(schema.authTokens.kind, "password_reset"),
        isNull(schema.authTokens.usedAt),
        gt(schema.authTokens.expiresAt, new Date())
      )
    );
  if (!row) return { error: "This link is invalid or has expired. Request a new one." };

  await db.update(schema.authTokens).set({ usedAt: new Date() }).where(eq(schema.authTokens.id, row.id));
  await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password.data), emailVerifiedAt: sql`coalesce(${schema.users.emailVerifiedAt}, now())`, updatedAt: new Date() })
    .where(eq(schema.users.id, row.userId));
  await destroyAllSessions(row.userId);
  await audit({ actorUserId: row.userId, actorLabel: "User", action: "auth.password_reset", summary: "reset password; all sessions signed out" });
  redirect("/signin?reset=1");
}

export async function resendVerificationAction(_: FormState): Promise<FormState> {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  if (auth.user.emailVerifiedAt) redirect("/app");
  const { ip } = await requestMeta();
  if (await isRateLimited(`verify:${auth.user.id}`, ip)) return { error: "Please wait a few minutes before asking again." };
  await recordAttempt(`verify:${auth.user.id}`, ip, false);
  await sendVerificationEmail(auth.user);
  return { ok: "Sent. Check your inbox." };
}

// ------------------------------------------------------------------ invitations
export async function acceptInviteAction(form: FormData) {
  const token = String(form.get("token") || "");
  const auth = await getSession();
  if (!auth) redirect(`/signin?next=${encodeURIComponent(`/invite/${token}`)}`);
  const [inv] = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.id, sha256(token)), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date())));
  if (!inv || inv.email.toLowerCase() !== auth.user.email.toLowerCase()) redirect(`/invite/${token}?error=1`);

  await db
    .insert(schema.memberships)
    .values({ tenantId: inv.tenantId, userId: auth.user.id, role: inv.role })
    .onConflictDoUpdate({ target: [schema.memberships.tenantId, schema.memberships.userId], set: { role: inv.role } });
  await db.update(schema.invitations).set({ acceptedAt: new Date() }).where(eq(schema.invitations.id, inv.id));
  // An invitation link proves control of the mailbox.
  if (!auth.user.emailVerifiedAt) {
    await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, auth.user.id));
  }
  await updateSession({ activeTenantId: inv.tenantId, actingTenantId: null });
  await audit({ actorUserId: auth.user.id, actorLabel: auth.user.name, tenantId: inv.tenantId, action: "team.invite_accepted", summary: `joined as ${inv.role}` });
  redirect("/app");
}

// ------------------------------------------------------------------ sign out
export async function signOutAction() {
  const auth = await getSession();
  if (auth) {
    if (auth.session.supportSessionId) {
      await db.update(schema.supportSessions).set({ endedAt: new Date() }).where(eq(schema.supportSessions.id, auth.session.supportSessionId));
    }
    await audit({ actorUserId: auth.user.id, actorLabel: auth.user.name, action: "auth.sign_out", summary: "signed out" });
  }
  await destroySession();
  redirect("/");
}

/** New user accepting an invitation: the emailed token proves the mailbox. */
export async function acceptInviteNewUserAction(_: FormState, form: FormData): Promise<FormState> {
  const { ip } = await requestMeta();
  const token = String(form.get("token") || "");
  const fullName = String(form.get("fullName") || "").trim().slice(0, 120);
  const password = passwordSchema.safeParse(form.get("password"));
  if (!fullName) return { error: "Your name is required." };
  if (!password.success) return { error: password.error.issues[0].message };
  if (!(await verifyTurnstile(form.get("cf-turnstile-response"), ip, "invite"))) return { error: CAPTCHA_ERROR };

  const [inv] = await db
    .select()
    .from(schema.invitations)
    .where(and(eq(schema.invitations.id, sha256(token)), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date())));
  if (!inv) return { error: "This invitation is no longer valid." };
  if (await userByEmail(inv.email.toLowerCase())) return { error: "An account already exists for this email. Sign in to accept." };

  const [user] = await db
    .insert(schema.users)
    .values({ email: inv.email.toLowerCase(), name: fullName, passwordHash: await hashPassword(password.data), emailVerifiedAt: new Date() })
    .returning();
  await db.insert(schema.memberships).values({ tenantId: inv.tenantId, userId: user.id, role: inv.role });
  await db.update(schema.invitations).set({ acceptedAt: new Date() }).where(eq(schema.invitations.id, inv.id));
  await audit({ actorUserId: user.id, actorLabel: user.name, tenantId: inv.tenantId, action: "team.invite_accepted", summary: `joined as ${inv.role}`, ip });
  redirect(await completeSignIn(user, "password"));
}
