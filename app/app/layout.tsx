import { requireWorkspace } from "@/lib/context";
import { signOutAction } from "@/app/(auth)/actions";
import { stopActingAction, switchWorkspaceAction } from "@/app/app/actions";
import { endSupportAction } from "@/app/admin/actions";
import { SideNav, WorkspaceSwitcher, type NavItem } from "@/components/app/nav";
import { ROLE_LABELS } from "@/lib/permissions";

export const dynamic = "force-dynamic";

const KIND = {
  organization: { label: "Organization", tint: "#E6EBFB", ink: "#1E3796" },
  auditor: { label: "Auditor", tint: "#E3F1EE", ink: "#0A4F44" },
  provider: { label: "Service provider", tint: "#FBEDE3", ink: "#6E2F08" },
} as const;

const NAV: Record<keyof typeof KIND, NavItem[]> = {
  organization: [
    { href: "/app/overview", label: "Overview" },
    { href: "/app/frameworks", label: "Frameworks" },
    { href: "/app/controls", label: "Controls" },
    { href: "/app/evidence", label: "Evidence" },
    { href: "/app/integrations", label: "Integrations" },
    { href: "/app/audits", label: "Audits" },
    { href: "/app/marketplace", label: "Marketplace" },
  ],
  auditor: [
    { href: "/app/engagements", label: "Engagements" },
    { href: "/app/workpapers", label: "Workpapers" },
    { href: "/app/findings", label: "Findings" },
    { href: "/app/leads", label: "Leads" },
  ],
  provider: [
    { href: "/app/portfolio", label: "Client portfolio" },
    { href: "/app/tasks", label: "Task board" },
    { href: "/app/packs", label: "Control packs" },
    { href: "/app/partners", label: "Auditor partners" },
  ],
};

const COMMON: NavItem[] = [
  { href: "/app/settings/team", label: "Team & access" },
  { href: "/account/security", label: "Account security" },
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireWorkspace();
  const kind = ctx.tenant.type;
  const style = KIND[kind];

  const options = ctx.memberships.map((m) => ({ value: m.tenant.id, label: `${m.tenant.name} · ${KIND[m.tenant.type].label}` }));
  if (ctx.actingFrom || ctx.support) options.unshift({ value: ctx.tenant.id, label: `${ctx.tenant.name} · ${ctx.support ? "support" : "client"}` });
  if (ctx.user.isSuperAdmin) options.push({ value: "admin", label: "AuditMesh · Super admin" });

  const nav = [...NAV[kind], ...(ctx.support ? [] : COMMON)];

  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-display text-lg font-bold">AuditMesh</span>
          <WorkspaceSwitcher options={options} current={ctx.tenant.id} action={switchWorkspaceAction} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted">{ctx.user.name}</span>
          <span className="pill" style={{ background: style.tint, color: style.ink }}>
            {style.label} · {ROLE_LABELS[ctx.role]}
          </span>
          <form action={signOutAction}>
            <button className="btn">Sign out</button>
          </form>
        </div>
      </header>

      {ctx.actingFrom && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-provider-tint px-6 py-2.5 text-sm font-medium text-provider-ink">
          <span>
            {ctx.actingFrom.name} acting inside <strong>{ctx.tenant.name}</strong> · contributor access granted by client · every
            action logged
          </span>
          <form action={stopActingAction}>
            <button className="btn btn-sm">Back to portfolio</button>
          </form>
        </div>
      )}

      {ctx.support && (
        <div className="flex flex-wrap items-center justify-between gap-3 bg-admin-tint px-6 py-2.5 text-sm font-medium text-admin-ink">
          <span>
            AuditMesh support session in <strong>{ctx.tenant.name}</strong> · read-only · reason: {ctx.support.reason}
          </span>
          <form action={endSupportAction}>
            <button className="btn btn-sm">End session</button>
          </form>
        </div>
      )}

      <div className="flex min-h-[calc(100vh-65px)] flex-wrap md:flex-nowrap">
        <SideNav title={ctx.tenant.name} items={nav} tint={style.tint} ink={style.ink} />
        <main className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-8 pb-12 pt-7">{children}</main>
      </div>
    </div>
  );
}
