import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { PHASES } from "@/lib/catalog";
import { Empty, PageTitle, Pill } from "@/components/ui";

export const metadata = { title: "Audits" };

export default async function Audits() {
  const ctx = await requireKind("organization");
  const aud = alias(schema.tenants, "aud");
  const pro = alias(schema.tenants, "pro");
  const engs = await db
    .select({ eng: schema.engagements, auditor: aud, provider: pro })
    .from(schema.engagements)
    .innerJoin(aud, eq(aud.id, schema.engagements.auditorTenantId))
    .leftJoin(pro, eq(pro.id, schema.engagements.providerTenantId))
    .where(eq(schema.engagements.orgTenantId, ctx.tenant.id))
    .orderBy(desc(schema.engagements.createdAt));
  const proposals = await db
    .select({ p: schema.proposalRequests, firm: schema.tenants })
    .from(schema.proposalRequests)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.proposalRequests.firmTenantId))
    .where(eq(schema.proposalRequests.orgTenantId, ctx.tenant.id))
    .orderBy(desc(schema.proposalRequests.createdAt));

  return (
    <>
      <PageTitle title="Audits">
        <Link href="/app/marketplace" className="btnp">Find an auditor</Link>
      </PageTitle>
      <div className="flex flex-col gap-3">
        {engs.length === 0 && <Empty>No audits yet. Request a proposal from a verified firm in the marketplace.</Empty>}
        {engs.map(({ eng, auditor, provider }) => (
          <div key={eng.id} className="card flex flex-wrap items-center gap-4">
            <div className="flex flex-[1_1_280px] flex-col gap-1">
              <span className="text-base font-bold">{eng.title}</span>
              <span className="text-[13px] text-muted">{auditor.name}{provider ? ` · consultant ${provider.name}` : ""}</span>
            </div>
            <Pill status={PHASES[eng.phase]}>{PHASES[eng.phase]}</Pill>
            <Link href={`/app/rooms/${eng.id}`} className="btn">Open room</Link>
          </div>
        ))}
      </div>
      {proposals.length > 0 && (
        <section className="card flex flex-col gap-2">
          <h2 className="text-[17px] font-bold">Proposal requests</h2>
          {proposals.map(({ p, firm }) => (
            <div key={p.id} className="flex flex-wrap justify-between gap-3 border-b border-hair py-2 text-sm">
              <span><strong>{firm.name}</strong> · {p.frameworkLabel}{p.targetStart ? ` · start ${p.targetStart}` : ""}</span>
              <span className="pill bg-hair text-label">{p.status}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}
