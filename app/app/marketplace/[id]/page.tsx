import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { can } from "@/lib/permissions";
import { FRAMEWORK_LABELS } from "@/lib/validation";
import { ProposalForm } from "@/components/app/forms";
import { firmType } from "@/lib/marketplace";

export default async function FirmPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireKind("organization");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [f] = await db.select().from(schema.tenants).where(and(eq(schema.tenants.id, id), eq(schema.tenants.listed, true), eq(schema.tenants.status, "active")));
  if (!f) notFound();
  const fws = f.frameworks.map((c) => FRAMEWORK_LABELS[c] || c);
  const canRequest = can(ctx.role, ctx.tenant.type, "marketplace.request");

  return (
    <>
      <Link href="/app/marketplace" className="text-sm font-semibold text-org hover:underline">← Marketplace</Link>
      <div className="flex flex-wrap gap-6">
        <section className="card flex flex-[2_1_460px] flex-col gap-3 p-7">
          <span className={`pill self-start ${f.type === "provider" ? "bg-provider-tint text-provider-ink" : "bg-auditor-tint text-auditor-ink"}`}>{firmType(f)}</span>
          <h1 className="text-[30px] font-bold">{f.name}</h1>
          <span className="text-sm text-muted">{f.location || ""}</span>
          <p className="m-0 text-[15px] leading-relaxed">{f.blurb || "No description yet."}</p>
          <h2 className="mt-2 text-base font-bold">Frameworks</h2>
          <span className="text-sm">{fws.join(", ") || "—"}</span>
          <h2 className="mt-2 text-base font-bold">Typical timeline</h2>
          <span className="text-sm">{f.timeline || "Ask the firm"}</span>
          <h2 className="mt-2 text-base font-bold">Fees</h2>
          <span className="text-sm text-muted">Set by the firm in its proposal.</span>
        </section>
        <section className="card flex flex-[1_1_300px] flex-col gap-3.5 self-start">
          <h2 className="text-[17px] font-bold">{f.type === "provider" ? "Ask for help" : "Request a proposal"}</h2>
          {canRequest ? (
            <ProposalForm firmId={f.id} frameworks={fws.length ? fws : ["Readiness"]} />
          ) : (
            <span className="text-sm text-muted">Only workspace admins can request proposals.</span>
          )}
          {f.type === "provider" && <span className="text-xs text-muted">To let this provider work in your workspace, grant access under Team &amp; access.</span>}
        </section>
      </div>
    </>
  );
}
