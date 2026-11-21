import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { can, type Action, type WorkspaceRole } from "@/lib/permissions";
import type { Tenant, User } from "@/lib/db/schema";

export type Membership = { tenant: Tenant; role: WorkspaceRole };

export type AppContext = {
  user: User;
  sessionId: string;
  memberships: Membership[];
  /** Tenant the user is working in right now (may be a client org when acting). */
  tenant: Tenant | null;
  role: WorkspaceRole | null;
  /** Provider tenant when a provider is acting inside a client org. */
  actingFrom: Tenant | null;
  support: { id: string; reason: string } | null;
  readOnly: boolean;
  /** Display label for audit log / messages. */
  actorLabel: string;
};

export const getContext = cache(async (): Promise<AppContext | null> => {
  const auth = await getSession();
  if (!auth) return null;
  const { session, user } = auth;

  const [rows, supportRow, grantRow] = await Promise.all([
    db
      .select({ tenant: schema.tenants, role: schema.memberships.role })
      .from(schema.memberships)
      .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
      .where(eq(schema.memberships.userId, user.id)),
    session.supportSessionId && user.isSuperAdmin
      ? db
          .select({ s: schema.supportSessions, tenant: schema.tenants })
          .from(schema.supportSessions)
          .innerJoin(schema.tenants, eq(schema.tenants.id, schema.supportSessions.tenantId))
          .where(eq(schema.supportSessions.id, session.supportSessionId))
          .then((r) => r[0])
      : Promise.resolve(undefined),
    session.actingTenantId && session.activeTenantId
      ? db
          .select({ org: schema.tenants })
          .from(schema.providerAccess)
          .innerJoin(schema.tenants, eq(schema.tenants.id, schema.providerAccess.orgTenantId))
          .where(
            and(
              eq(schema.providerAccess.providerTenantId, session.activeTenantId),
              eq(schema.providerAccess.orgTenantId, session.actingTenantId),
              eq(schema.providerAccess.active, true)
            )
          )
          .then((r) => r[0])
      : Promise.resolve(undefined),
  ]);
  const memberships: Membership[] = rows.filter((r) => r.tenant.status !== "suspended");

  let tenant: Tenant | null = null;
  let role: WorkspaceRole | null = null;
  let actingFrom: Tenant | null = null;
  let support: AppContext["support"] = null;

  // 1. Super admin support session: read-only view of one tenant.
  if (supportRow && !supportRow.s.endedAt) {
    tenant = supportRow.tenant;
    role = "support";
    support = { id: supportRow.s.id, reason: supportRow.s.reason };
  }

  // 2. Provider acting inside a client organization (grant fetched above).
  if (!tenant && grantRow) {
    const provider = memberships.find((m) => m.tenant.id === session.activeTenantId && m.tenant.type === "provider");
    if (provider && provider.role !== "viewer" && grantRow.org.status === "active") {
      tenant = grantRow.org;
      role = "contributor";
      actingFrom = provider.tenant;
    }
  }

  // 3. Normal membership.
  if (!tenant) {
    const m = memberships.find((x) => x.tenant.id === session.activeTenantId) || memberships[0];
    if (m) {
      tenant = m.tenant;
      role = m.role;
    }
  }

  const actorLabel = support
    ? `${user.name} (AuditOps support)`
    : actingFrom
      ? `${actingFrom.name} on behalf of ${tenant?.name}`
      : `${user.name}${tenant ? ` · ${tenant.name}` : ""}`;

  return {
    user,
    sessionId: session.id,
    memberships,
    tenant,
    role,
    actingFrom,
    support,
    readOnly: role === "support" || role === "viewer",
    actorLabel,
  };
});

/** Signed in, email verified, MFA challenge passed. No workspace needed. */
export async function requireAccount() {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  if (!auth.session.mfaVerified) redirect("/mfa");
  if (!auth.user.emailVerifiedAt) redirect("/verify-email");
  const ctx = await getContext();
  if (!ctx) redirect("/signin");
  return ctx;
}

// Platform settings change rarely: cache per server instance for 30 s.
let settingsCache: { at: number; value: Promise<Map<string, boolean>> } | null = null;
export function platformSettings() {
  if (!settingsCache || Date.now() - settingsCache.at > 30_000) {
    settingsCache = {
      at: Date.now(),
      value: db
        .select()
        .from(schema.platformSettings)
        .then((rows) => new Map(rows.map((r) => [r.key, r.enabled])))
        .catch((e) => {
          settingsCache = null;
          throw e;
        }),
    };
  }
  return settingsCache.value;
}

const mfaRequired = async () => Boolean((await platformSettings()).get("require_mfa"));

/** For pages: signed in, verified, MFA satisfied, inside a workspace. */
export async function requireWorkspace() {
  const ctx = await requireAccount();
  if (!ctx.user.mfaEnabledAt && !ctx.support && (await mfaRequired())) redirect("/account/security?mfa=required");
  if (!ctx.tenant || !ctx.role) redirect(ctx.user.isSuperAdmin ? "/admin" : "/welcome");
  return ctx as AppContext & { tenant: Tenant; role: WorkspaceRole };
}

export async function requireKind(kind: Tenant["type"]) {
  const ctx = await requireWorkspace();
  if (ctx.tenant.type !== kind) redirect("/app");
  return ctx;
}

export async function requireSuperAdmin() {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  if (!auth.session.mfaVerified) redirect("/mfa");
  if (!auth.user.isSuperAdmin) redirect("/app");
  const allowNoMfa = process.env.ALLOW_ADMIN_WITHOUT_MFA === "true";
  if (!auth.user.mfaEnabledAt && !allowNoMfa) redirect("/account/security?mfa=required");
  const ctx = await getContext();
  return ctx!;
}

export class ActionError extends Error {}

/** For server actions: throws ActionError instead of redirecting. */
export async function authorize(action: Action) {
  const ctx = await getContext();
  if (!ctx || !ctx.tenant || !ctx.role) throw new ActionError("Sign in again.");
  const auth = await getSession();
  if (!auth?.session.mfaVerified) throw new ActionError("Multi-factor check required.");
  if (ctx.support && action !== "workspace.read") {
    throw new ActionError("Read-only support session. Action blocked and logged.");
  }
  if (!can(ctx.role, ctx.tenant.type, action)) throw new ActionError("Your role does not allow this.");
  return ctx as AppContext & { tenant: Tenant; role: WorkspaceRole };
}

export async function authorizeSuperAdmin() {
  const auth = await getSession();
  if (!auth || !auth.user.isSuperAdmin || !auth.session.mfaVerified) throw new ActionError("Super admin only.");
  return (await getContext())!;
}
