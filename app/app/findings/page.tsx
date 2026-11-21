import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { Empty, PageTitle, Pill } from "@/components/ui";

export const metadata = { title: "Findings" };

export default async function Findings() {
  const ctx = await requireKind("auditor");
  const org = alias(schema.tenants, "org");
  const rows = await db
    .select({ f: schema.findings, client: org.name, engId: schema.engagements.id })
    .from(schema.findings)
    .innerJoin(schema.engagements, eq(schema.engagements.id, schema.findings.engagementId))
    .innerJoin(org, eq(org.id, schema.engagements.orgTenantId))
    .where(eq(schema.engagements.auditorTenantId, ctx.tenant.id))
    .orderBy(desc(schema.findings.createdAt));
  return (
    <>
      <PageTitle title="Findings" />
      {rows.length === 0 && <Empty>No findings raised yet.</Empty>}
      <div className="flex flex-col gap-3">
        {rows.map(({ f, client, engId }) => (
          <Link key={f.id} href={`/app/rooms/${engId}?tab=findings`} className="card flex flex-wrap items-center gap-4 text-ink no-underline">
            <div className="flex flex-[1_1_320px] flex-col gap-1">
              <span className="font-bold">{f.title}</span>
              <span className="text-[13px] text-muted">{client} · {f.controlRef}</span>
            </div>
            <Pill status={f.severity} />
            <span className="pill bg-hair text-label">{f.status}</span>
          </Link>
        ))}
      </div>
    </>
  );
}
