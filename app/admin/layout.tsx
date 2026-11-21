import { LogoMark } from "@/components/brand";
import { requireSuperAdmin } from "@/lib/context";
import { signOutAction } from "@/app/(auth)/actions";
import { switchWorkspaceAction } from "@/app/app/actions";
import { SideNav, WorkspaceSwitcher } from "@/components/app/nav";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/admin/overview", label: "Platform overview" },
  { href: "/admin/tenants", label: "Tenants" },
  { href: "/admin/verification", label: "Firm verification" },
  { href: "/admin/frameworks", label: "Framework catalog" },
  { href: "/admin/marketplace", label: "Marketplace moderation" },
  { href: "/admin/billing", label: "Plans and billing" },
  { href: "/admin/audit-log", label: "Audit log" },
  { href: "/admin/settings", label: "Platform settings" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireSuperAdmin();
  const options = [
    { value: "admin", label: "AuditOps · Super admin" },
    ...ctx.memberships.map((m) => ({ value: m.tenant.id, label: m.tenant.name })),
  ];
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-2 font-display text-lg font-bold"><LogoMark size={24} />AuditOps</span>
          <WorkspaceSwitcher options={options} current="admin" action={switchWorkspaceAction} />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted">{ctx.user.name}</span>
          <span className="pill bg-admin-tint text-admin-ink">Super admin</span>
          <form action={signOutAction}><button className="btn">Sign out</button></form>
        </div>
      </header>
      <div className="flex min-h-[calc(100vh-65px)] flex-wrap md:flex-nowrap">
        <SideNav title="AuditOps platform" items={NAV} tint="#EDE9FE" ink="#4C1D95" />
        <main className="box-border flex min-w-0 flex-[999_1_560px] flex-col gap-6 px-8 pb-12 pt-7">{children}</main>
      </div>
    </div>
  );
}
