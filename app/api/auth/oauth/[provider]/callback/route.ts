import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { finishOAuth, isProvider, providerEnabled } from "@/lib/auth/oauth";
import { completeSignIn, sendVerificationEmail } from "@/lib/auth/flow";
import { audit } from "@/lib/audit";
import { getSession } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const LABEL = { google: "Google", microsoft: "Microsoft" } as const;

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const url = new URL(request.url);
  const fail = (code: string) => NextResponse.redirect(new URL(`/signin?error=${code}`, url.origin));

  if (!isProvider(provider) || !providerEnabled(provider)) return fail("provider");
  if (url.searchParams.get("error")) return fail("cancelled");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("oauth");

  let identity;
  try {
    identity = await finishOAuth(provider, code, state);
  } catch (error) {
    console.error(`OAuth ${provider} failed:`, error instanceof Error ? error.message : error);
    return fail(error instanceof Error && error.message === "email_missing" ? "email_missing" : "oauth");
  }

  // 0. Signed-in user linking a provider from Security settings.
  const current = await getSession();
  if (current?.session.mfaVerified) {
    if (current.user.email.toLowerCase() !== identity.email) {
      return NextResponse.redirect(new URL("/account/security?link=mismatch", url.origin));
    }
    await db
      .insert(schema.oauthAccounts)
      .values({ provider, providerUserId: identity.subject, userId: current.user.id, email: identity.email })
      .onConflictDoNothing();
    await audit({ actorUserId: current.user.id, actorLabel: current.user.name, action: "auth.oauth_linked", summary: `linked ${LABEL[provider]} account` });
    return NextResponse.redirect(new URL("/account/security", url.origin));
  }

  // 1. Known identity.
  const [linked] = await db
    .select({ user: schema.users })
    .from(schema.oauthAccounts)
    .innerJoin(schema.users, eq(schema.users.id, schema.oauthAccounts.userId))
    .where(and(eq(schema.oauthAccounts.provider, provider), eq(schema.oauthAccounts.providerUserId, identity.subject)));
  let user = linked?.user;

  // 2. Existing account with the same email: link only if the provider verified it.
  if (!user) {
    const [byEmail] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${identity.email}`);
    if (byEmail) {
      if (!identity.emailVerified) return fail("unverified_link");
      user = byEmail;
      if (!user.emailVerifiedAt) {
        await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, user.id));
        user.emailVerifiedAt = new Date();
      }
    } else {
      [user] = await db
        .insert(schema.users)
        .values({ email: identity.email, name: identity.name, emailVerifiedAt: identity.emailVerified ? new Date() : null })
        .returning();
      if (!identity.emailVerified) await sendVerificationEmail(user);
    }
    await db
      .insert(schema.oauthAccounts)
      .values({ provider, providerUserId: identity.subject, userId: user.id, email: identity.email })
      .onConflictDoNothing();
    await audit({ actorUserId: user.id, actorLabel: user.name, action: "auth.oauth_linked", summary: `linked ${LABEL[provider]} account` });
  }

  if (user.status !== "active") return fail("suspended");

  const target = await completeSignIn(user, LABEL[provider], identity.next);
  return NextResponse.redirect(new URL(target, url.origin));
}
