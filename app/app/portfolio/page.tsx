import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { readinessMany } from "@/lib/tenants";
import { actAsClientAction } from "@/app/app/actions";
import { Bar, Empty, PageTitle, Stat, Table } from "@/components/ui";

export const metadata = { title: "Client portfolio" };

export default async function Portfolio() {
  const ctx = await requireKind("provider");
  const aud = alias(schema.tenants, "aud");
  const [clients, engs] = await Promise.all([
    db
      .select({ org: schema.tenants })
      .from(schema.providerAccess)
      .innerJoin(schema.tenants, eq(schema.tenants.id, schema.providerAccess.orgTenantId))
      .where(and(eq(schema.providerAccess.providerTenantId, ctx.tenant.id), eq(schema.providerAccess.active, true))),
    db
      .select({ eng: schema.engagements, auditor: aud.name })
      .from(schema.engagements)
      .innerJoin(aud, eq(aud.id, schema.engagements.auditorTenantId))
      .where(eq(schema.engagements.providerTenantId, ctx.tenant.id)),
  ]);
  const ready = await readinessMany(clients.map((c) => c.org.id));
  const rows = clients.map(({ org }) => {
    const r = ready.get(org.id) ?? [];
    const pct = r.length ? Math.round(r.reduce((a, b) => a + b.pct, 0) / r.length) : 0;
    const e = engs.find((x) => x.eng.orgTenantId === org.id);
    return { org, pct, fws: r.map((x) => x.short).join(", "), eng: e };
  });
  const canAct = ctx.role !== "viewer";

  return (
    <>
      <PageTitle eyebrow={ctx.tenant.name} title="Client portfolio" />
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
        <Stat label="Clients" value={rows.length} />
        <Stat label="Audits in progress" value={engs.filter((e) => e.eng.phase < 4).length} />
        <Stat label="Average readiness" value={`${rows.length ? Math.round(rows.reduce((a, b) => a + b.pct, 0) / rows.length) : 0}%`} />
      </div>
      {rows.length === 0 ? (
        <Empty>
          No clients yet. A client grants you access from their workspace under <strong>Team &amp; access</strong>. Share your
          workspace name: <strong>{ctx.tenant.name}</strong>.
        </Empty>
      ) : (
        <Table head={["Client", "Frameworks", "Readiness", "Auditor", ""]} minWidth={820}>
          {rows.map(({ org, pct, fws, eng }) => (
            <tr key={org.id}>
              <td className="font-semibold">{org.name}</td>
              <td className="text-muted">{fws || "—"}</td>
              <td className="w-[200px]">
                <span className="flex items-center gap-2.5"><Bar pct={pct} /><span className="w-10 font-semibold">{pct}%</span></span>
              </td>
              <td className="text-muted">{eng?.auditor || "Not chosen"}</td>
              <td>
                <span className="flex gap-2">
                  {canAct && (
                    <form action={actAsClientAction}>
                      <input type="hidden" name="orgId" value={org.id} />
                      <button className="btn">Enter</button>
                    </form>
                  )}
                  {eng && <Link href={`/app/rooms/${eng.eng.id}`} className="btn">Audit room</Link>}
                </span>
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
