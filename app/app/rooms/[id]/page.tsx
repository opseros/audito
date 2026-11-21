import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireWorkspace } from "@/lib/context";
import { loadEngagement, roomCanWrite, roomSide } from "@/lib/engagements";
import { PHASES } from "@/lib/catalog";
import { findingResponseAction, setPhaseAction } from "@/app/app/actions";
import { cx, Pill } from "@/components/ui";
import { RoomReplyForm, SampleForm, UploadForm } from "@/components/app/forms";

const ACCENT = { org: "#2B4ACB", auditor: "#0F6B5C", provider: "#B4500F" } as const;
const AVATAR: Record<string, string> = {
  organization: "bg-org-tint text-org-ink",
  auditor: "bg-auditor-tint text-auditor-ink",
  provider: "bg-provider-tint text-provider-ink",
};
const VISIBILITY = {
  org: "You see requests, threads and evidence. Auditor workpapers and internal notes stay hidden.",
  auditor: "Internal notes and workpapers are visible to your firm only.",
  provider: "The client granted you contributor access. Your uploads and replies show as your firm on behalf of the client.",
};
const TABS = [
  ["requests", "Requests"],
  ["sampling", "Sampling"],
  ["findings", "Findings"],
  ["timeline", "Timeline"],
] as const;

function initials(name: string) {
  return name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();
}

export default async function Room({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; req?: string }>;
}) {
  const ctx = await requireWorkspace();
  const { id } = await params;
  const sp = await searchParams;
  const loaded = await loadEngagement(id);
  if (!loaded) notFound();
  const side = await roomSide(ctx, loaded.eng);
  if (!side) notFound();

  const { eng, org, auditor, provider } = loaded;
  const tab = TABS.some(([k]) => k === sp.tab) ? sp.tab! : "requests";
  const accent = ACCENT[side];
  const canWrite = roomCanWrite(ctx);
  const back = side === "auditor" ? ["/app/engagements", "Engagements"] : side === "provider" ? ["/app/portfolio", "Client portfolio"] : ["/app/audits", "Audits"];
  const replyAs = side === "auditor" ? auditor.name : side === "provider" ? `${ctx.tenant.name} on behalf of ${org.name}` : ctx.actingFrom ? `${ctx.actingFrom.name} on behalf of ${org.name}` : org.name;

  const reqs = await db.select().from(schema.engagementRequests).where(eq(schema.engagementRequests.engagementId, eng.id)).orderBy(asc(schema.engagementRequests.position));
  const sel = reqs.find((r) => r.id === sp.req) || reqs[0];
  const accepted = reqs.filter((r) => r.status === "accepted").length;

  // Independent queries in parallel: each round trip to the database costs latency.
  const [messages, files, samples, findings, timeline] = await Promise.all([
    sel
      ? db
          .select({ m: schema.requestMessages, author: schema.users.name, tenant: schema.tenants })
          .from(schema.requestMessages)
          .leftJoin(schema.users, eq(schema.users.id, schema.requestMessages.authorUserId))
          .innerJoin(schema.tenants, eq(schema.tenants.id, schema.requestMessages.authorTenantId))
          .where(
            and(
              eq(schema.requestMessages.requestId, sel.id),
              // Internal notes never leave the auditor firm.
              side === "auditor" ? sql`true` : eq(schema.requestMessages.internal, false)
            )
          )
          .orderBy(asc(schema.requestMessages.createdAt))
      : Promise.resolve([]),
    sel
      ? db
          .select({ e: schema.evidence })
          .from(schema.requestEvidence)
          .innerJoin(schema.evidence, eq(schema.evidence.id, schema.requestEvidence.evidenceId))
          .where(eq(schema.requestEvidence.requestId, sel.id))
      : Promise.resolve([]),
    tab === "sampling"
      ? db.select().from(schema.samples).where(eq(schema.samples.engagementId, eng.id)).orderBy(desc(schema.samples.createdAt))
      : Promise.resolve([]),
    tab === "findings"
      ? db.select().from(schema.findings).where(eq(schema.findings.engagementId, eng.id)).orderBy(desc(schema.findings.createdAt))
      : Promise.resolve([]),
    tab === "timeline"
      ? db
          .select()
          .from(schema.auditLog)
          .where(and(sql`${schema.auditLog.detail}->>'engagementId' = ${eng.id}`, sql`${schema.auditLog.action} <> 'room.internal'`))
          .orderBy(desc(schema.auditLog.at))
          .limit(50)
      : Promise.resolve([]),
  ]);

  const url = (q: Record<string, string>) => `/app/rooms/${eng.id}?${new URLSearchParams(q).toString()}`;

  return (
    <>
      <Link href={back[0]} className="text-sm font-semibold hover:underline" style={{ color: accent }}>← {back[1]}</Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="text-[13px] text-muted">Engagement room · shared by all parties</span>
          <h1 className="text-[26px] font-bold">{org.name} · {eng.title}</h1>
          {eng.window && <span className="text-sm text-muted">{eng.window}</span>}
        </div>
        <div className="flex flex-col gap-1 text-right text-[13px]">
          <span><strong>Organization</strong> · {org.name}</span>
          <span><strong>Auditor</strong> · {auditor.name}</span>
          <span><strong>Consultant</strong> · {provider?.name || "None"}</span>
        </div>
      </div>

      <div className="grid gap-2 [grid-template-columns:repeat(auto-fit,minmax(140px,1fr))]">
        {PHASES.map((p, i) => {
          const cls = i < eng.phase ? "bg-auditor-tint text-auditor-ink" : i === eng.phase ? "bg-auditor text-white" : "border border-line bg-white text-muted";
          const box = (
            <div className={cx("flex flex-col gap-0.5 rounded-[10px] px-3.5 py-3", cls)}>
              <span className="text-xs font-semibold">Step {i + 1}</span>
              <span className="text-sm font-semibold">{p}</span>
            </div>
          );
          return side === "auditor" && canWrite ? (
            <form key={p} action={setPhaseAction}>
              <input type="hidden" name="engagementId" value={eng.id} />
              <input type="hidden" name="phase" value={i} />
              <button className="w-full text-left" title={`Move to ${p}`}>{box}</button>
            </form>
          ) : (
            <div key={p}>{box}</div>
          );
        })}
      </div>

      <div role="tablist" className="flex flex-wrap gap-1 border-b border-line">
        {TABS.map(([k, l]) => (
          <Link
            key={k}
            role="tab"
            aria-selected={tab === k}
            href={url({ tab: k })}
            className={cx("border-b-[3px] px-4 py-3 text-sm font-semibold", tab === k ? "text-ink" : "border-transparent text-muted")}
            style={tab === k ? { borderColor: accent } : undefined}
          >
            {l}
          </Link>
        ))}
      </div>

      {tab === "requests" && (
        <div className="flex flex-wrap gap-6">
          <section className="card flex flex-[1_1_340px] flex-col gap-1 p-3">
            <span className="px-2 py-1.5 text-[13px] text-muted">{reqs.length} requests · {accepted} accepted</span>
            {reqs.map((r) => (
              <Link
                key={r.id}
                href={url({ tab: "requests", req: r.id })}
                className={cx(
                  "flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-ink no-underline",
                  r.id === sel?.id ? "border-slate-400 bg-hair" : "border-transparent bg-white hover:bg-hair"
                )}
              >
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{r.title}</span>
                  <span className="text-xs text-muted">{r.controlRef} · {r.ownerName || "unassigned"}</span>
                </span>
                <Pill status={r.status} />
              </Link>
            ))}
          </section>

          {sel && (
            <section className="card flex flex-[2_1_520px] flex-col gap-4 p-6">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <span className="text-[13px] text-muted">{sel.controlRef}</span>
                  <h2 className="text-[21px] font-bold">{sel.title}</h2>
                </div>
                <Pill status={sel.status} className="h-fit self-start" />
              </div>
              <p className="m-0 text-sm leading-relaxed text-label">{sel.ask}</p>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-bold">Evidence</h3>
                <div className="flex flex-wrap gap-2">
                  {files.length === 0 && <span className="text-[13px] text-muted">No evidence yet</span>}
                  {files.map(({ e }) => (
                    <a key={e.id} href={`/api/evidence/${e.id}`} className="rounded-lg border border-line px-3 py-2 text-[13px] text-ink hover:bg-hair">
                      {e.name} · {e.source.replace("Uploaded by ", "")}
                    </a>
                  ))}
                </div>
                {side !== "auditor" && canWrite && <UploadForm requestId={sel.id} accent={accent} />}
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-sm font-bold">Thread</h3>
                {messages.length === 0 && <span className="text-[13px] text-muted">No messages yet.</span>}
                {messages.map(({ m, author, tenant }) => (
                  <div key={m.id} className={cx("flex gap-3", m.internal && "rounded-[10px] border border-dashed border-auditor bg-auditor-soft p-3")}>
                    <span className={cx("flex h-9 w-9 flex-none items-center justify-center rounded-full text-xs font-bold", AVATAR[tenant.type])}>
                      {initials(tenant.name)}
                    </span>
                    <span className="text-sm leading-normal">
                      <strong>{tenant.name}</strong>
                      <span className="text-muted">
                        {" "}· {author || "former member"}
                        {m.onBehalfOfTenantId && tenant.type === "provider" ? ` · on behalf of ${org.name}` : ""}
                        {m.internal ? " · internal note" : ""}
                      </span>
                      <br />
                      {m.body}
                    </span>
                  </div>
                ))}
              </div>

              <RoomReplyForm requestId={sel.id} side={side} canWrite={canWrite} accent={accent} replyAs={replyAs} />
              <span className="text-xs leading-normal text-muted">{VISIBILITY[side]}</span>
            </section>
          )}
        </div>
      )}

      {tab === "sampling" && (
        <section className="card flex max-w-[880px] flex-col gap-3.5">
          <h2 className="text-lg font-bold">Sampling</h2>
          <span className="text-sm leading-normal text-muted">
            The auditor draws a seeded random sample from the population. The seed and items are recorded and cannot be
            edited after the draw.
          </span>
          {side === "auditor" && canWrite ? (
            <SampleForm engagementId={eng.id} />
          ) : (
            <span className="text-sm font-semibold">Only the auditor can draw samples. You see the result once sent.</span>
          )}
          {samples.map((s) => (
            <div key={s.id} className="flex flex-col gap-2 border-t border-hair pt-3">
              <span className="text-sm font-semibold">
                {s.controlRef} · {s.items.length} of {s.populationSize} · {s.method} · seed {s.seed} · locked
              </span>
              <div className="flex flex-wrap gap-1.5">
                {s.items.map((t) => (
                  <span key={t} className="pill bg-hair font-medium text-ink">{t}</span>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "findings" && (
        <div className="flex flex-col gap-3">
          {findings.length === 0 && <div className="card text-sm text-muted">No findings.</div>}
          {findings.map((f) => (
            <div key={f.id} className="card flex flex-col gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex flex-[1_1_320px] flex-col gap-1">
                  <span className="font-bold">{f.title}</span>
                  <span className="text-[13px] text-muted">{f.controlRef} · management response: {f.managementResponse || "Pending"}</span>
                </div>
                <Pill status={f.severity} />
              </div>
              {side === "org" && canWrite && !f.managementResponse && (
                <form action={findingResponseAction} className="flex flex-wrap items-end gap-3">
                  <input type="hidden" name="findingId" value={f.id} />
                  <label className="lbl flex-1">
                    Management response
                    <input name="response" className="input" required />
                  </label>
                  <button className="btn">Send response</button>
                </form>
              )}
            </div>
          ))}
          <span className="text-[13px] text-muted">Findings raised from request review appear here for all parties. Draft wording stays in auditor workpapers.</span>
        </div>
      )}

      {tab === "timeline" && (
        <section className="card flex max-w-[760px] flex-col">
          {timeline.length === 0 && <span className="text-sm text-muted">No activity yet.</span>}
          {timeline.map((e) => (
            <div key={e.id} className="flex gap-4 border-b border-hair py-3">
              <span className="w-[110px] flex-none text-[13px] text-muted">
                {e.at.toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
              </span>
              <span className="text-sm"><strong>{e.actorLabel}</strong> {e.summary}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

