import Link from "next/link";
import { and, desc, eq, ne } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { readiness } from "@/lib/tenants";
import { Bar, Card, Pill, PageTitle } from "@/components/ui";

export const metadata = { title: "Audit readiness" };

export default async function Overview() {
  const ctx = await requireKind("organization");
  const t = ctx.tenant;
  const fws = await readiness(t.id);
  const failing = await db.select().from(schema.controls).where(and(eq(schema.controls.tenantId, t.id), eq(schema.controls.status, "failing"))).limit(6);

  const aud = alias(schema.tenants, "aud");
  const engs = await db
    .select({ eng: schema.engagements, auditor: aud })
    .from(schema.engagements)
    .innerJoin(aud, eq(aud.id, schema.engagements.auditorTenantId))
    .where(eq(schema.engagements.orgTenantId, t.id))
    .orderBy(desc(schema.engagements.createdAt));
  const first = engs[0];
  const reqs = first
    ? await db
        .select()
        .from(schema.engagementRequests)
        .where(and(eq(schema.engagementRequests.engagementId, first.eng.id), ne(schema.engagementRequests.status, "accepted")))
        .orderBy(schema.engagementRequests.position)
        .limit(6)
    : [];
  const providers = await db
    .select({ name: schema.tenants.name })
    .from(schema.providerAccess)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.providerAccess.providerTenantId))
    .where(and(eq(schema.providerAccess.orgTenantId, t.id), eq(schema.providerAccess.active, true)));
  const team = [...new Map(engs.map((e) => [e.auditor.id, e])).values()];

  return (
    <>
      <PageTitle eyebrow={t.name} title="Audit readiness">
        <Link href="/app/integrations" className="btn">Connect tools</Link>
        <Link href="/app/marketplace" className="btnp">Find an auditor</Link>
      </PageTitle>

      {fws.length === 0 ? (
        <Card>
          <p className="m-0 text-sm text-muted">No frameworks yet.</p>
          <Link href="/app/frameworks" className="btnp mt-3">Choose frameworks</Link>
        </Card>
      ) : (
        <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {fws.map((f) => (
            <Link key={f.code} href={`/app/controls?fw=${f.code}`} className="card flex flex-col gap-2.5 text-ink no-underline hover:border-field">
              <span className="flex justify-between gap-2">
                <span className="text-[15px] font-semibold">{f.short}</span>
                <span className="text-xs text-muted">{f.milestone || ""}</span>
              </span>
              <span className="font-display text-[32px] font-bold">{f.pct}%</span>
              <Bar pct={f.pct} />
              <span className="text-[13px] text-muted">
                {f.passing} of {f.total} controls passing
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-6">
        <section className="card flex flex-[2_1_460px] flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-[17px] font-bold">Open auditor requests{first ? ` · ${first.eng.title}` : ""}</h2>
            {first && <Link href={`/app/rooms/${first.eng.id}`} className="text-sm font-semibold text-org hover:underline">Open engagement room</Link>}
          </div>
          {reqs.length === 0 ? (
            <p className="m-0 text-sm text-muted">{first ? "Nothing open. Nice." : "No audit yet. Request a proposal in the marketplace."}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="tbl min-w-[480px]">
                <thead><tr><th>Request</th><th>Control</th><th>Owner</th><th>Status</th></tr></thead>
                <tbody>
                  {reqs.map((r) => (
                    <tr key={r.id}>
                      <td><Link href={`/app/rooms/${first!.eng.id}?req=${r.id}`} className="font-semibold text-ink hover:underline">{r.title}</Link></td>
                      <td className="text-muted">{r.controlRef}</td>
                      <td>{r.ownerName || "—"}</td>
                      <td><Pill status={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        <section className="flex min-w-0 flex-[1_1_300px] flex-col gap-4">
          <div className="card flex flex-col gap-2.5">
            <h2 className="text-[17px] font-bold">Failing checks</h2>
            {failing.length === 0 && <span className="text-sm text-muted">No failing controls.</span>}
            {failing.map((c) => (
              <Link key={c.id} href={`/app/controls/${c.id}`} className="text-sm leading-normal text-ink hover:underline">
                <span className="font-semibold text-danger">{c.code}</span> · {c.testResult || c.name}
              </Link>
            ))}
          </div>
          <div className="card flex flex-col gap-2.5">
            <h2 className="text-[17px] font-bold">Your audit team</h2>
            {team.map((e) => (
              <span key={e.auditor.id} className="text-sm"><strong>{e.auditor.name}</strong> <span className="text-muted">· {e.auditor.subtype || "auditor"}</span></span>
            ))}
            {providers.map((p) => (
              <span key={p.name} className="text-sm"><strong>{p.name}</strong> <span className="text-muted">· consultant</span></span>
            ))}
            {!team.length && !providers.length && <span className="text-sm text-muted">No firms yet.</span>}
            <Link href="/app/marketplace" className="btn">Add auditor or consultant</Link>
          </div>
        </section>
      </div>
    </>
  );
}

