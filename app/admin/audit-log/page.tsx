import Link from "next/link";
import { desc, lt } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { Lead, PageTitle } from "@/components/ui";

export const metadata = { title: "Audit log" };
const PAGE = 100;

export default async function AuditLogPage({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { before } = await searchParams;
  const cursor = before && !Number.isNaN(Date.parse(before)) ? new Date(before) : null;
  const rows = await db
    .select()
    .from(schema.auditLog)
    .where(cursor ? lt(schema.auditLog.at, cursor) : undefined)
    .orderBy(desc(schema.auditLog.at))
    .limit(PAGE);
  return (
    <>
      <PageTitle title="Platform audit log" />
      <Lead>Append-only: the database rejects updates and deletes. Every sign-in, admin action, support session and verification decision.</Lead>
      <section className="card flex max-w-[1000px] flex-col">
        {rows.map((e) => (
          <div key={e.id} className="flex gap-4 border-b border-hair py-2.5 text-sm">
            <span className="w-[120px] flex-none text-[13px] text-muted">{e.at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
            <span className="min-w-0 flex-1"><strong>{e.actorLabel}</strong> {e.summary}</span>
            <span className="hidden flex-none text-xs text-muted md:inline">{e.action}{e.ip ? ` · ${e.ip}` : ""}</span>
          </div>
        ))}
      </section>
      {rows.length === PAGE && (
        <Link className="btn self-start" href={`/admin/audit-log?before=${encodeURIComponent(rows[rows.length - 1].at.toISOString())}`}>Older entries</Link>
      )}
    </>
  );
}
