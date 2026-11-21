import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { firmType } from "@/lib/marketplace";
import { Empty, Lead, PageTitle } from "@/components/ui";

export const metadata = { title: "Auditor partners" };

export default async function Partners() {
  await requireKind("provider");
  const firms = await db.select().from(schema.tenants).where(and(eq(schema.tenants.type, "auditor"), eq(schema.tenants.listed, true), eq(schema.tenants.status, "active")));
  return (
    <>
      <PageTitle title="Auditor partners" />
      <Lead>Verified audit firms on AuditOps. Referrals with an independence check are coming soon: you will not be able to refer a client to a firm you also consult for on the same scope.</Lead>
      {firms.length === 0 && <Empty>No verified firms yet.</Empty>}
      <div className="flex flex-col gap-3">
        {firms.map((f) => (
          <div key={f.id} className="card flex flex-wrap items-center gap-4">
            <div className="flex flex-[1_1_300px] flex-col gap-1">
              <span className="font-bold">{f.name}</span>
              <span className="text-[13px] text-muted">{firmType(f)} · {f.location || "Remote"}</span>
            </div>
            <button className="btn" disabled title="Coming soon">Refer client</button>
          </div>
        ))}
      </div>
    </>
  );
}
