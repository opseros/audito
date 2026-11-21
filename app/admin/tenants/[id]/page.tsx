import Link from "next/link";
import { notFound } from "next/navigation";
import { count, desc, eq, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Pill } from "@/components/ui";
import { SupportForm } from "@/components/app/forms";

export default async function TenantDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, id));
  if (!t) notFound();
  const members = await db
    .select({ u: schema.users, role: schema.memberships.role })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .where(eq(schema.memberships.tenantId, id));
  const [ev] = await db.select({ n: count() }).from(schema.evidence).where(eq(schema.evidence.tenantId, id));
  const [ctl] = await db.select({ n: count() }).from(schema.controls).where(eq(schema.controls.tenantId, id));
  const engs = await db
    .select({ e: schema.engagements })
    .from(schema.engagements)
    .where(or(eq(schema.engagements.orgTenantId, id), eq(schema.engagements.auditorTenantId, id), eq(schema.engagements.providerTenantId, id)));
  const support = await db.select().from(schema.supportSessions).where(eq(schema.supportSessions.tenantId, id)).orderBy(desc(schema.supportSessions.startedAt)).limit(5);
  const lastLogin = members.map((m) => m.u.lastLoginAt).filter(Boolean).sort((a, b) => b!.getTime() - a!.getTime())[0];

  const stats = [
    ["Members", members.length],
    ["Controls", ctl?.n ?? 0],
    ["Evidence items", ev?.n ?? 0],
    ["Engagements", engs.length],
    ["Frameworks", t.frameworks.length],
    ["Last login", lastLogin ? lastLogin.toLocaleDateString("en-GB") : "—"],
  ];

  return (
    <>
      <Link href="/admin/tenants" className="text-sm font-semibold text-admin hover:underline">← Tenants</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="text-[13px] text-muted">{t.type} · {t.plan}{t.subtype ? ` · ${t.subtype}` : ""}</span>
          <h1 className="text-[28px] font-bold">{t.name}</h1>
        </div>
        <Pill status={t.status} />
      </div>
      <div className="flex flex-wrap gap-6">
        <section className="flex min-w-0 flex-[2_1_460px] flex-col gap-4">
          <div className="card grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(160px,1fr))]">
            {stats.map(([l, v]) => (
              <div key={l as string} className="flex flex-col gap-1">
                <span className="text-[13px] text-muted">{l}</span>
                <span className="text-xl font-bold">{v}</span>
              </div>
            ))}
          </div>
          <div className="card flex flex-col gap-2">
            <h2 className="text-base font-bold">Members</h2>
            {members.map(({ u, role }) => (
              <span key={u.id} className="border-b border-hair py-2 text-sm">{u.name} · {u.email} · {role}{u.mfaEnabledAt ? " · 2-step" : ""}</span>
            ))}
          </div>
          <div className="card flex flex-col gap-2">
            <h2 className="text-base font-bold">Recent support sessions</h2>
            {support.length === 0 && <span className="text-sm text-muted">None.</span>}
            {support.map((s) => (
              <span key={s.id} className="border-b border-hair py-2 text-sm">
                {s.startedAt.toLocaleString("en-GB")} · {s.reason} · {s.endedAt ? "ended" : "open"}
              </span>
            ))}
          </div>
        </section>
        <section className="card flex flex-[1_1_300px] flex-col gap-3 self-start">
          <h2 className="text-[17px] font-bold">Support access</h2>
          <span className="text-[13px] leading-normal text-muted">
            Read-only. Needs a reason. The session is logged in the tenant&apos;s audit trail and every blocked write is recorded.
          </span>
          <SupportForm tenantId={t.id} />
        </section>
      </div>
    </>
  );
}
