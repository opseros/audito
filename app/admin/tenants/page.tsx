import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { setTenantStatusAction } from "@/app/admin/actions";
import { Chip, PageTitle, Pill, Table } from "@/components/ui";

export const metadata = { title: "Tenants" };
const TYPES = [["", "All"], ["organization", "Organizations"], ["auditor", "Auditors"], ["provider", "Providers"]] as const;
const LABEL = { organization: "Organization", auditor: "Audit firm", provider: "Service provider" } as const;

export default async function Tenants({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { type = "" } = await searchParams;
  const rows = await db
    .select({
      t: schema.tenants,
      users: sql<number>`(select count(*) from memberships m where m.tenant_id = ${schema.tenants.id})`.mapWith(Number),
    })
    .from(schema.tenants)
    .where(type && ["organization", "auditor", "provider"].includes(type) ? eq(schema.tenants.type, type as "organization") : undefined)
    .orderBy(desc(schema.tenants.createdAt));
  return (
    <>
      <PageTitle title="Tenants" />
      <div className="flex flex-wrap gap-2">
        {TYPES.map(([k, l]) => (
          <Chip key={k} kind="admin" href={k ? `/admin/tenants?type=${k}` : "/admin/tenants"} on={type === k}>{l}</Chip>
        ))}
      </div>
      <Table head={["Tenant", "Type", "Plan", "Users", "Status", ""]} minWidth={820}>
        {rows.map(({ t, users }) => (
          <tr key={t.id}>
            <td className="font-semibold">{t.name}</td>
            <td className="text-muted">{LABEL[t.type]}{t.subtype ? ` · ${t.subtype}` : ""}</td>
            <td className="text-muted">{t.plan}</td>
            <td>{users}</td>
            <td><Pill status={t.status} /></td>
            <td>
              <span className="flex gap-2">
                <Link href={`/admin/tenants/${t.id}`} className="btn">Details</Link>
                <form action={setTenantStatusAction}>
                  <input type="hidden" name="tenantId" value={t.id} />
                  <input type="hidden" name="status" value={t.status === "suspended" ? "active" : "suspended"} />
                  <button className="btn">{t.status === "suspended" ? "Reactivate" : "Suspend"}</button>
                </form>
              </span>
            </td>
          </tr>
        ))}
      </Table>
    </>
  );
}
