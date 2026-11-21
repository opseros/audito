import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { decideVerificationAction } from "@/app/admin/actions";
import { Empty, Lead, PageTitle, Pill } from "@/components/ui";

export const metadata = { title: "Firm verification" };

export default async function Verification() {
  const rows = await db
    .select({ v: schema.verifications, t: schema.tenants })
    .from(schema.verifications)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.verifications.tenantId))
    .orderBy(desc(schema.verifications.createdAt));
  return (
    <>
      <PageTitle title="Firm verification" />
      <Lead>Auditors, certification bodies, QSAs and 3PAOs appear in the marketplace only after credentials are checked against the issuing body.</Lead>
      {rows.length === 0 && <Empty>No verification requests.</Empty>}
      <div className="flex flex-col gap-3">
        {rows.map(({ v, t }) => (
          <div key={v.id} className="card flex flex-wrap items-center gap-4">
            <div className="flex flex-[1_1_320px] flex-col gap-1">
              <span className="font-bold">{t.name}</span>
              <span className="text-[13px] text-muted">{v.claim}{v.document ? ` · ${v.document}` : ""}{v.reason ? ` · ${v.reason}` : ""}</span>
            </div>
            <Pill status={v.status} />
            {v.status === "pending" && (
              <div className="flex flex-wrap gap-2">
                <form action={decideVerificationAction} className="flex gap-2">
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="decision" value="reject" />
                  <input name="reason" className="input w-56 py-2" placeholder="Reason (sent to firm)" required />
                  <button className="btn">Reject</button>
                </form>
                <form action={decideVerificationAction}>
                  <input type="hidden" name="id" value={v.id} />
                  <input type="hidden" name="decision" value="approve" />
                  <button className="btnp bg-admin">Approve</button>
                </form>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
