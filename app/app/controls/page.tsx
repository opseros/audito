import Link from "next/link";
import { eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { Chip, PageTitle, Pill, Table } from "@/components/ui";

export const metadata = { title: "Controls" };

export default async function Controls({ searchParams }: { searchParams: Promise<{ fw?: string }> }) {
  const ctx = await requireKind("organization");
  const { fw } = await searchParams;
  const tfs = await db
    .select({ code: schema.frameworks.code, short: schema.frameworks.shortName })
    .from(schema.tenantFrameworks)
    .innerJoin(schema.frameworks, eq(schema.frameworks.code, schema.tenantFrameworks.frameworkCode))
    .where(eq(schema.tenantFrameworks.tenantId, ctx.tenant.id));

  const all = await db.select().from(schema.controls).where(eq(schema.controls.tenantId, ctx.tenant.id)).orderBy(schema.controls.code);
  const maps = all.length
    ? await db.select().from(schema.controlMappings).where(inArray(schema.controlMappings.controlId, all.map((c) => c.id)))
    : [];
  const list = fw ? all.filter((c) => maps.some((m) => m.controlId === c.id && m.frameworkCode === fw)) : all;

  return (
    <>
      <PageTitle title="Controls" />
      <div className="flex flex-wrap gap-2">
        <Chip href="/app/controls" on={!fw}>All frameworks</Chip>
        {tfs.map((f) => (
          <Chip key={f.code} href={`/app/controls?fw=${f.code}`} on={fw === f.code}>{f.short}</Chip>
        ))}
      </div>
      <Table head={["ID", "Control", "Owner", "Maps to", "Status"]} minWidth={720}>
        {list.map((c) => (
          <tr key={c.id}>
            <td className="text-[13px] text-muted">{c.code}</td>
            <td><Link href={`/app/controls/${c.id}`} className="font-semibold text-org hover:underline">{c.name}</Link></td>
            <td>{c.ownerName || "—"}</td>
            <td className="text-[13px] text-muted">{maps.filter((m) => m.controlId === c.id).length} frameworks</td>
            <td><Pill status={c.status} /></td>
          </tr>
        ))}
      </Table>
      <span className="text-[13px] text-muted">{list.length} controls shown</span>
    </>
  );
}

