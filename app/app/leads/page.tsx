import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { readiness } from "@/lib/tenants";
import { can } from "@/lib/permissions";
import { sendProposalAction } from "@/app/app/actions";
import { Empty, Lead, PageTitle } from "@/components/ui";

export const metadata = { title: "Leads" };

export default async function Leads() {
  const ctx = await requireKind("auditor");
  const rows = await db
    .select({ p: schema.proposalRequests, org: schema.tenants })
    .from(schema.proposalRequests)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.proposalRequests.orgTenantId))
    .where(eq(schema.proposalRequests.firmTenantId, ctx.tenant.id))
    .orderBy(desc(schema.proposalRequests.createdAt));
  const canSend = can(ctx.role, ctx.tenant.type, "audit.review");
  const withReadiness = await Promise.all(
    rows.map(async (r) => ({ ...r, ready: r.p.shareReadiness ? await readiness(r.org.id) : null }))
  );

  return (
    <>
      <PageTitle title="Leads from marketplace" />
      <Lead>Companies that requested proposals. Readiness shown only where the company chose to share it.</Lead>
      {rows.length === 0 && <Empty>No proposal requests yet.</Empty>}
      <div className="flex flex-col gap-3">
        {withReadiness.map(({ p, org, ready }) => (
          <div key={p.id} className="card flex flex-wrap items-center gap-4">
            <div className="flex flex-[1_1_320px] flex-col gap-1">
              <span className="font-bold">{org.name} · {org.subtype || ""} staff</span>
              <span className="text-[13px] text-muted">
                {p.frameworkLabel}
                {ready ? ` · readiness ${ready.map((r) => `${r.short} ${r.pct}%`).join(", ") || "n/a"} (shared)` : " · readiness not shared"}
                {p.targetStart ? ` · wants to start ${p.targetStart}` : ""}
              </span>
            </div>
            {p.status === "Requested" && canSend ? (
              <form action={sendProposalAction}>
                <input type="hidden" name="id" value={p.id} />
                <button className="btnp bg-auditor">Send proposal</button>
              </form>
            ) : (
              <span className="pill bg-auditor-tint text-auditor-ink">{p.status}</span>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
