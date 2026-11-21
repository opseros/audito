import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Platform overview" };

export default async function AdminOverview() {
  const byType = await db.select({ type: schema.tenants.type, n: count() }).from(schema.tenants).groupBy(schema.tenants.type);
  const n = (t: string) => byType.find((x) => x.type === t)?.n ?? 0;
  const [pending] = await db.select({ n: count() }).from(schema.verifications).where(eq(schema.verifications.status, "pending"));
  const [engs] = await db.select({ n: count() }).from(schema.engagements);
  const [users] = await db.select({ n: count() }).from(schema.users);
  const log = await db.select().from(schema.auditLog).orderBy(desc(schema.auditLog.at)).limit(8);
  const max = Math.max(1, n("organization"), n("auditor"), n("provider"));
  const mix: [string, number, string][] = [
    ["Organizations", n("organization"), "bg-org"],
    ["Service providers", n("provider"), "bg-provider"],
    ["Audit firms", n("auditor"), "bg-auditor"],
  ];
  const kpis = [
    { label: "Organizations", value: n("organization"), href: "/admin/tenants?type=organization", warn: false },
    { label: "Audit firms", value: n("auditor"), href: "/admin/tenants?type=auditor", warn: false },
    { label: "Service providers", value: n("provider"), href: "/admin/tenants?type=provider", warn: false },
    { label: "Pending verifications", value: pending?.n ?? 0, href: "/admin/verification", warn: (pending?.n ?? 0) > 0 },
    { label: "Users", value: users?.n ?? 0, href: "/admin/tenants", warn: false },
  ];

  return (
    <>
      <PageTitle eyebrow="AuditOps platform" title="Platform overview" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        {kpis.map((k) => (
          <Link key={k.label} href={k.href} className="card flex flex-col gap-1.5 text-ink no-underline hover:border-field">
            <span className="text-[13px] text-muted">{k.label}</span>
            <span className={`font-display text-[30px] font-bold ${k.warn ? "text-warn" : ""}`}>{k.value.toLocaleString("en-US")}</span>
          </Link>
        ))}
      </div>
      <div className="flex flex-wrap gap-6">
        <section className="card flex flex-[2_1_460px] flex-col gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold">Recent platform activity</h2>
            <Link href="/admin/audit-log" className="text-sm font-semibold text-admin hover:underline">Full audit log</Link>
          </div>
          {log.map((e) => (
            <div key={e.id} className="flex gap-4 border-b border-hair py-2 text-sm">
              <span className="w-[90px] flex-none text-[13px] text-muted">
                {e.at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span><strong>{e.actorLabel}</strong> {e.summary}</span>
            </div>
          ))}
        </section>
        <section className="card flex flex-[1_1_300px] flex-col gap-2.5">
          <h2 className="text-[17px] font-bold">Network mix</h2>
          {mix.map(([label, v, c]) => (
            <div key={label} className="flex flex-col gap-1.5">
              <span className="flex justify-between text-sm"><span>{label}</span><strong>{v}</strong></span>
              <span className="block h-2 overflow-hidden rounded bg-line">
                <span className={`block h-2 rounded ${c}`} style={{ width: `${Math.round((v / max) * 100)}%` }} />
              </span>
            </div>
          ))}
          <span className="text-[13px] text-muted">Engagements opened in-platform: {engs?.n ?? 0}.</span>
        </section>
      </div>
    </>
  );
}
