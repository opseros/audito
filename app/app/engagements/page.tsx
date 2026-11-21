import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { can } from "@/lib/permissions";
import { PHASES } from "@/lib/catalog";
import { Card, Chip, PageTitle, Table } from "@/components/ui";
import { NewEngagementForm } from "@/components/app/forms";

export const metadata = { title: "Engagements" };

export default async function Engagements({ searchParams }: { searchParams: Promise<{ phase?: string }> }) {
  const ctx = await requireKind("auditor");
  const { phase } = await searchParams;
  const org = alias(schema.tenants, "org");
  const rows = await db
    .select({
      eng: schema.engagements,
      org,
      total: sql<number>`(select count(*) from engagement_requests r where r.engagement_id = ${schema.engagements.id})`.mapWith(Number),
      received: sql<number>`(select count(*) from engagement_requests r where r.engagement_id = ${schema.engagements.id} and r.status in ('submitted','accepted'))`.mapWith(Number),
      review: sql<number>`(select count(*) from engagement_requests r where r.engagement_id = ${schema.engagements.id} and r.status = 'submitted')`.mapWith(Number),
    })
    .from(schema.engagements)
    .innerJoin(org, eq(org.id, schema.engagements.orgTenantId))
    .where(eq(schema.engagements.auditorTenantId, ctx.tenant.id))
    .orderBy(desc(schema.engagements.createdAt));
  const shown = rows.filter((r) => !phase || PHASES[r.eng.phase] === phase);

  const prospects = await db
    .selectDistinct({ id: schema.tenants.id, name: schema.tenants.name })
    .from(schema.proposalRequests)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.proposalRequests.orgTenantId))
    .where(eq(schema.proposalRequests.firmTenantId, ctx.tenant.id));
  const clients = [...new Map([...prospects, ...rows.map((r) => ({ id: r.org.id, name: r.org.name }))].map((o) => [o.id, o])).values()];

  return (
    <>
      <PageTitle eyebrow={ctx.tenant.name} title="Active engagements" />
      {ctx.tenant.status === "pending_verification" && (
        <div className="rounded-lg border border-warn/20 bg-warn-tint p-3 text-sm text-warn">
          Your firm is waiting for credential verification. You can run engagements with clients who invite you; you will
          appear in the marketplace after approval.
        </div>
      )}
      {can(ctx.role, ctx.tenant.type, "engagement.create") && (
        <Card>
          <h2 className="mb-3 text-base font-bold">New engagement</h2>
          <NewEngagementForm orgs={clients} />
        </Card>
      )}
      <div className="flex flex-wrap gap-2">
        <Chip kind="auditor" href="/app/engagements" on={!phase}>All</Chip>
        {PHASES.map((p) => (
          <Chip key={p} kind="auditor" href={`/app/engagements?phase=${p}`} on={phase === p}>{p}</Chip>
        ))}
      </div>
      <Table head={["Client", "Engagement", "Phase", "Requests", "To review", "Came via", ""]} minWidth={760}>
        {shown.map((r) => (
          <tr key={r.eng.id}>
            <td className="font-semibold">{r.org.name}</td>
            <td>{r.eng.title}</td>
            <td><span className="pill bg-auditor-tint text-auditor-ink">{PHASES[r.eng.phase]}</span></td>
            <td className="text-muted">{r.received} / {r.total} received</td>
            <td className="font-semibold">{r.review}</td>
            <td className="text-muted">{r.eng.source}</td>
            <td><Link href={`/app/rooms/${r.eng.id}`} className="btn">Open room</Link></td>
          </tr>
        ))}
        {shown.length === 0 && <tr><td colSpan={7} className="text-muted">No engagements.</td></tr>}
      </Table>
    </>
  );
}
