import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireWorkspace } from "@/lib/context";
import { ASSIGNABLE_ROLES, can, canAssign, ROLE_HELP, ROLE_LABELS } from "@/lib/permissions";
import { changeRoleAction, removeMemberAction, revokeInviteAction, revokeProviderAction } from "@/app/app/actions";
import { Card, PageTitle, Table } from "@/components/ui";
import { GrantProviderForm, InviteForm, WorkspaceForm } from "@/components/app/forms";

export const metadata = { title: "Team & access" };

export default async function TeamPage() {
  const ctx = await requireWorkspace();
  const t = ctx.tenant;
  const manage = can(ctx.role, t.type, "team.manage") && !ctx.actingFrom;
  const members = await db
    .select({ m: schema.memberships, u: schema.users })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.tenantId, t.id))
    .orderBy(schema.memberships.createdAt);
  const invites = manage
    ? await db
        .select()
        .from(schema.invitations)
        .where(and(eq(schema.invitations.tenantId, t.id), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date())))
        .orderBy(desc(schema.invitations.createdAt))
    : [];
  const grants =
    t.type === "organization"
      ? await db
          .select({ p: schema.tenants, at: schema.providerAccess.createdAt })
          .from(schema.providerAccess)
          .innerJoin(schema.tenants, eq(schema.tenants.id, schema.providerAccess.providerTenantId))
          .where(and(eq(schema.providerAccess.orgTenantId, t.id), eq(schema.providerAccess.active, true)))
      : [];
  const providers = t.type === "organization" && can(ctx.role, t.type, "provider.access.grant") && !ctx.actingFrom
    ? await db.select({ id: schema.tenants.id, name: schema.tenants.name }).from(schema.tenants).where(and(eq(schema.tenants.type, "provider"), eq(schema.tenants.status, "active")))
    : [];
  const roleOptions = ASSIGNABLE_ROLES.filter((r) => canAssign(ctx.role, r)).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

  return (
    <>
      <PageTitle eyebrow={t.name} title="Team & access" />
      {ctx.actingFrom && <Card><span className="text-sm text-muted">You are acting for this client. Only its admins manage the team.</span></Card>}

      {manage && (
        <Card>
          <h2 className="mb-3 text-base font-bold">Invite a teammate</h2>
          <InviteForm roles={roleOptions} />
        </Card>
      )}

      <Table head={["Name", "Email", "Sign-in", "Role", ""]} minWidth={720}>
        {members.map(({ m, u }) => (
          <tr key={u.id}>
            <td className="font-semibold">{u.name}{u.id === ctx.user.id && <span className="pill ml-2 bg-org-tint text-org-ink">You</span>}</td>
            <td className="text-muted">{u.email}</td>
            <td className="text-xs text-muted">{u.mfaEnabledAt ? "2-step on" : "2-step off"} · {u.lastLoginAt ? u.lastLoginAt.toLocaleDateString("en-GB") : "never"}</td>
            <td>
              {manage && m.role !== "owner" && u.id !== ctx.user.id && (ctx.role === "owner" || m.role !== "admin") ? (
                <form action={changeRoleAction} className="flex gap-2">
                  <input type="hidden" name="userId" value={u.id} />
                  <select name="role" defaultValue={m.role} className="input w-auto py-2">
                    {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    {!roleOptions.some((r) => r.value === m.role) && <option value={m.role}>{ROLE_LABELS[m.role]}</option>}
                  </select>
                  <button className="btn btn-sm">Save</button>
                </form>
              ) : (
                ROLE_LABELS[m.role]
              )}
            </td>
            <td>
              {manage && m.role !== "owner" && u.id !== ctx.user.id && (ctx.role === "owner" || m.role !== "admin") && (
                <form action={removeMemberAction}>
                  <input type="hidden" name="userId" value={u.id} />
                  <button className="btn btn-sm text-danger">Remove</button>
                </form>
              )}
            </td>
          </tr>
        ))}
      </Table>

      {invites.length > 0 && (
        <Card className="flex flex-col gap-2">
          <h2 className="text-base font-bold">Pending invitations</h2>
          {invites.map((i) => (
            <div key={i.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-hair py-2 text-sm">
              <span>{i.email} · {ROLE_LABELS[i.role]} · expires {i.expiresAt.toLocaleDateString("en-GB")}</span>
              <form action={revokeInviteAction}>
                <input type="hidden" name="id" value={i.id} />
                <button className="btn btn-sm">Revoke</button>
              </form>
            </div>
          ))}
        </Card>
      )}

      {t.type === "organization" && (
        <Card className="flex flex-col gap-3">
          <h2 className="text-base font-bold">Service provider access</h2>
          <p className="m-0 text-sm text-muted">
            Providers you add can work in this workspace as contributors: controls, evidence and audit requests. They cannot
            manage your team or settings. Every action is logged with their firm name.
          </p>
          {grants.map(({ p }) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-hair py-2 text-sm">
              <strong>{p.name}</strong>
              {providers.length > 0 && (
                <form action={revokeProviderAction}>
                  <input type="hidden" name="providerId" value={p.id} />
                  <button className="btn btn-sm text-danger">Revoke</button>
                </form>
              )}
            </div>
          ))}
          {providers.length > 0 && <GrantProviderForm providers={providers.filter((p) => !grants.some((g) => g.p.id === p.id))} />}
        </Card>
      )}

      {can(ctx.role, t.type, "workspace.settings") && !ctx.actingFrom && (
        <Card className="max-w-2xl">
          <h2 className="mb-3 text-base font-bold">Workspace</h2>
          <WorkspaceForm t={t} />
        </Card>
      )}

      <Card className="flex flex-col gap-2">
        <h2 className="text-base font-bold">Roles</h2>
        {(Object.keys(ROLE_HELP) as (keyof typeof ROLE_HELP)[]).map((r) => (
          <span key={r} className="text-sm"><strong>{ROLE_LABELS[r]}</strong> <span className="text-muted">— {ROLE_HELP[r]}</span></span>
        ))}
        <span className="text-sm"><strong>{ROLE_LABELS.contributor}</strong> <span className="text-muted">— a service provider you granted access; works like a member, cannot manage team or settings.</span></span>
      </Card>
    </>
  );
}
