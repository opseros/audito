import { LogoMark } from "@/components/brand";
import Link from "next/link";
import { requireAccount } from "@/lib/context";
import { signOutAction } from "@/app/(auth)/actions";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireAccount();
  return (
    <div className="min-h-screen">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-6 py-3">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-2 font-display text-lg font-bold"><LogoMark size={24} />AuditOps</span>
          <Link href={ctx.tenant ? "/app" : ctx.user.isSuperAdmin ? "/admin" : "/welcome"} className="text-sm font-semibold text-org hover:underline">
            ← Back to workspace
          </Link>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-muted">{ctx.user.email}</span>
          <form action={signOutAction}><button className="btn">Sign out</button></form>
        </div>
      </header>
      <main className="mx-auto flex max-w-4xl flex-col gap-6 px-8 pb-12 pt-7">{children}</main>
    </div>
  );
}
