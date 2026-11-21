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

  const rows = await db
    .select({ tenant: schema.tenants, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
    .where(eq(schema.memberships.userId, user.id));
  const memberships: Membership[] = rows.filter((r) => r.tenant.status !== "suspended");

  let tenant: Tenant | null = null;
  let role: WorkspaceRole | null = null;
  let actingFrom: Tenant | null = null;
  let support: AppContext["support"] = null;

  // 1. Super admin support session: read-only view of one tenant.
  if (session.supportSessionId && user.isSuperAdmin) {
    const [s] = await db
      .select({ s: schema.supportSessions, tenant: schema.tenants })
      .from(schema.supportSessions)
      .innerJoin(schema.tenants, eq(schema.tenants.id, schema.supportSessions.tenantId))
      .where(eq(schema.supportSessions.id, session.supportSessionId));
    if (s && !s.s.endedAt) {
      tenant = s.tenant;
      role = "support";
      support = { id: s.s.id, reason: s.s.reason };
    }
  }

  // 2. Provider acting inside a client organization.
  if (!tenant && session.actingTenantId && session.activeTenantId) {
    const provider = memberships.find((m) => m.tenant.id === session.activeTenantId && m.tenant.type === "provider");
    if (provider && provider.role !== "viewer") {
      const [grant] = await db
        .select({ org: schema.tenants })
        .from(schema.providerAccess)
        .innerJoin(schema.tenants, eq(schema.tenants.id, schema.providerAccess.orgTenantId))
        .where(
          and(
            eq(schema.providerAccess.providerTenantId, provider.tenant.id),
            eq(schema.providerAccess.orgTenantId, session.actingTenantId),
            eq(schema.providerAccess.active, true)
          )
        );
      if (grant && grant.org.status === "active") {
        tenant = grant.org;
        role = "contributor";
        actingFrom = provider.tenant;
      }
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
    ? `${user.name} (AuditMesh support)`
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

const mfaRequired = cache(async () => {
  const [s] = await db.select().from(schema.platformSettings).where(eq(schema.platformSettings.key, "require_mfa"));
  return Boolean(s?.enabled);
});

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
