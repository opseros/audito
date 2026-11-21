import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { can } from "@/lib/permissions";
import { signWorkpaperAction } from "@/app/app/actions";
import { Lead, PageTitle, Table } from "@/components/ui";

export const metadata = { title: "Workpapers" };

export default async function Workpapers() {
  const ctx = await requireKind("auditor");
  const org = alias(schema.tenants, "org");
  const rows = await db
    .select({ wp: schema.workpapers, client: org.name, signer: schema.users.name })
    .from(schema.workpapers)
    .leftJoin(schema.engagements, eq(schema.engagements.id, schema.workpapers.engagementId))
    .leftJoin(org, eq(org.id, schema.engagements.orgTenantId))
    .leftJoin(schema.users, eq(schema.users.id, schema.workpapers.signedOffBy))
    .where(eq(schema.workpapers.auditorTenantId, ctx.tenant.id))
    .orderBy(desc(schema.workpapers.createdAt), schema.workpapers.ref);
  const canSign = can(ctx.role, ctx.tenant.type, "audit.review");

  return (
    <>
      <PageTitle title="Workpapers" />
      <Lead>Internal to {ctx.tenant.name}. Clients and consultants never see this page.</Lead>
      <Table head={["Ref", "Procedure", "Client", "Preparer", "Reviewer sign-off"]} minWidth={720}>
        {rows.map(({ wp, client, signer }) => (
          <tr key={wp.id}>
            <td className="text-muted">{wp.ref}</td>
            <td className="font-semibold">{wp.name}</td>
            <td>{client || "—"}</td>
            <td>{wp.preparer || "—"}</td>
            <td>
              <form action={signWorkpaperAction}>
                <input type="hidden" name="id" value={wp.id} />
                <button disabled={!canSign} className={wp.signedOffAt ? "btn border-auditor/40 bg-auditor-tint text-auditor-ink" : "btn"} title={wp.signedOffAt ? `Signed by ${signer}` : undefined}>
                  {wp.signedOffAt ? `Signed off · ${signer}` : "Sign off"}
                </button>
              </form>
            </td>
          </tr>
        ))}
        {rows.length === 0 && <tr><td colSpan={5} className="text-muted">Workpapers are created with each engagement.</td></tr>}
      </Table>
    </>
  );
}
