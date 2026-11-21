import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { can } from "@/lib/permissions";
import { Pill } from "@/components/ui";
import { ControlForm, UploadForm } from "@/components/app/forms";

export default async function ControlPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireKind("organization");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [c] = await db.select().from(schema.controls).where(and(eq(schema.controls.id, id), eq(schema.controls.tenantId, ctx.tenant.id)));
  if (!c) notFound();
  const maps = await db
    .select({ ref: schema.controlMappings.ref, fw: schema.frameworks.shortName })
    .from(schema.controlMappings)
    .innerJoin(schema.frameworks, eq(schema.frameworks.code, schema.controlMappings.frameworkCode))
    .where(eq(schema.controlMappings.controlId, c.id));
  const ev = await db.select().from(schema.evidence).where(eq(schema.evidence.controlId, c.id)).orderBy(desc(schema.evidence.createdAt));
  const writable = can(ctx.role, ctx.tenant.type, "workspace.write");

  return (
    <>
      <Link href="/app/controls" className="text-sm font-semibold text-org hover:underline">← All controls</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] text-muted">{c.code} · owner {c.ownerName || "unassigned"}</span>
          <h1 className="text-[28px] font-bold">{c.name}</h1>
        </div>
        <Pill status={c.status} className="h-fit self-start" />
      </div>
      <div className="flex flex-wrap gap-6">
        <section className="flex min-w-0 flex-[2_1_460px] flex-col gap-4">
          <div className="card flex flex-col gap-2">
            <h2 className="text-base font-bold">Test</h2>
            <span className="text-sm leading-normal">{c.testDescription}</span>
            <ControlForm c={c} disabled={!writable} />
          </div>
          <div className="card flex flex-col gap-2.5">
            <h2 className="text-base font-bold">Evidence</h2>
            {ev.length === 0 && <span className="text-sm text-muted">No evidence yet.</span>}
            {ev.map((e) => (
              <a key={e.id} href={`/api/evidence/${e.id}`} className="rounded-lg border border-line px-3 py-2.5 text-sm text-ink hover:bg-hair">
                {e.name} <span className="text-muted">· {e.source}</span>
              </a>
            ))}
            {writable && <UploadForm controlId={c.id} />}
          </div>
        </section>
        <section className="card flex flex-[1_1_280px] flex-col gap-2.5 self-start">
          <h2 className="text-base font-bold">Mapped requirements</h2>
          <span className="text-[13px] text-muted">One control, many frameworks</span>
          {maps.map((m) => (
            <div key={m.fw} className="flex justify-between gap-3 border-b border-hair py-2 text-sm">
              <span className="font-semibold">{m.fw}</span>
              <span className="text-muted">{m.ref}</span>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}
