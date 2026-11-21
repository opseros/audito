"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/**
 * Interactive product demo for the homepage. Runs entirely in the browser on
 * sample data: nothing is sent to the server or saved.
 */

type View = "org" | "auditor" | "provider";
type CStatus = "passing" | "failing" | "needs_evidence";
type RStatus = "open" | "submitted" | "needs_rework" | "accepted";

const FW = [
  { key: "SOC2", label: "SOC 2", color: "bg-auditor" },
  { key: "ISO", label: "ISO 27001", color: "bg-org" },
  { key: "PCI", label: "PCI DSS 4.0", color: "bg-provider" },
] as const;

const INITIAL_CONTROLS: { code: string; name: string; owner: string; status: CStatus; result: string; maps: string[] }[] = [
  { code: "AC-01", name: "MFA enforced for all users", owner: "Dev K.", status: "failing", result: "2 users without MFA", maps: ["SOC2", "ISO", "PCI"] },
  { code: "CR-01", name: "Encryption at rest", owner: "Dev K.", status: "failing", result: "3 buckets unencrypted", maps: ["SOC2", "ISO", "PCI"] },
  { code: "HR-03", name: "Security awareness training", owner: "Priya S.", status: "failing", result: "4 staff overdue", maps: ["SOC2", "ISO", "PCI"] },
  { code: "SC-01", name: "Payment page script integrity", owner: "Arjun M.", status: "failing", result: "No script inventory", maps: ["PCI"] },
  { code: "CM-02", name: "Changes approved before deploy", owner: "Arjun M.", status: "needs_evidence", result: "2 emergency changes", maps: ["SOC2", "ISO", "PCI"] },
  { code: "AR-01", name: "Quarterly access review", owner: "Priya S.", status: "passing", result: "Q3 signed Oct 4", maps: ["SOC2", "ISO", "PCI"] },
  { code: "VM-01", name: "Vulnerability scanning", owner: "Dev K.", status: "passing", result: "0 overdue criticals", maps: ["SOC2", "ISO", "PCI"] },
  { code: "LG-01", name: "Central logging and alerts", owner: "Dev K.", status: "passing", result: "All regions logging", maps: ["SOC2", "ISO", "PCI"] },
  { code: "DR-01", name: "Backups tested", owner: "Dev K.", status: "passing", result: "Restore test passed", maps: ["SOC2", "ISO"] },
  { code: "IR-01", name: "Incident response tested", owner: "Dev K.", status: "needs_evidence", result: "No 2026 tabletop", maps: ["SOC2", "ISO", "PCI"] },
];

type Msg = { who: string; side: "auditor" | "org" | "provider"; text: string; internal?: boolean };
const INITIAL_REQUESTS: { title: string; control: string; status: RStatus; ask: string; files: string[]; thread: Msg[] }[] = [
  {
    title: "Change tickets sample",
    control: "CC8.1",
    status: "submitted",
    ask: "For each sampled ticket, provide approval record, peer review link and deploy log.",
    files: ["jira-change-sample.csv", "github-pr-reviews.json"],
    thread: [
      { who: "Ledgerline CPA", side: "auditor", text: "NW-1182 and NW-1240 have no peer approval before deploy." },
      { who: "Brightgate Advisory", side: "provider", text: "Both were emergency hotfixes. Post-change approvals attached." },
      { who: "Ledgerline CPA", side: "auditor", text: "If 2+ of 25 lack approval, consider a deviation.", internal: true },
    ],
  },
  {
    title: "Quarterly access review",
    control: "CC6.2",
    status: "submitted",
    ask: "Provide Q1–Q3 access reviews with reviewer sign-off and evidence of revocations.",
    files: ["access-review-q1.pdf", "access-review-q2.pdf", "access-review-q3.pdf"],
    thread: [{ who: "Northwind Labs", side: "org", text: "All three quarters attached." }],
  },
  {
    title: "Incident response test",
    control: "CC7.4",
    status: "open",
    ask: "Provide the most recent incident response tabletop record and lessons learned.",
    files: [],
    thread: [],
  },
  {
    title: "Encryption at rest config",
    control: "CC6.7",
    status: "accepted",
    ask: "Provide configuration evidence for databases and object storage.",
    files: ["aws-config-encryption.json"],
    thread: [{ who: "Ledgerline CPA", side: "auditor", text: "Accepted. Tested in WP-6.7." }],
  },
];

const CLIENTS = [
  { name: "Northwind Labs", fw: "SOC 2, ISO 27001, PCI", auditor: "Ledgerline CPA", live: true },
  { name: "Orbit Health", fw: "HIPAA, SOC 2", auditor: "Ledgerline CPA", pct: 81 },
  { name: "Kestrel Pay", fw: "SOC 2", auditor: "Not chosen", pct: 58 },
  { name: "Lumen Edu", fw: "ISO 27001, DPDP", auditor: "Not chosen", pct: 49 },
];

const TICKER: [string, string, string][] = [
  ["GitHub", "branch protection check passed for 14 repos", "bg-org"],
  ["Ledgerline CPA", "viewed jira-change-sample.csv", "bg-auditor"],
  ["Brightgate Advisory", "drafted vendor risk policy for Lumen Edu", "bg-provider"],
  ["AWS", "nightly evidence sync finished · 212 resources", "bg-org"],
  ["Priya S.", "assigned IR-01 tabletop to Dev K.", "bg-org"],
  ["Northstar Registrar", "scheduled ISO 27001 Stage 1 for Feb 10", "bg-auditor"],
  ["Google Workspace", "MFA report refreshed", "bg-org"],
];

const PILL: Record<string, string> = {
  passing: "bg-auditor-tint text-auditor-ink",
  failing: "bg-danger-tint text-danger",
  needs_evidence: "bg-warn-tint text-warn",
  open: "bg-hair text-label",
  submitted: "bg-org-tint text-org-ink",
  needs_rework: "bg-danger-tint text-danger",
  accepted: "bg-auditor-tint text-auditor-ink",
};
const LABEL: Record<string, string> = {
  passing: "Passing",
  failing: "Failing",
  needs_evidence: "Needs evidence",
  open: "Open",
  submitted: "Submitted",
  needs_rework: "Needs rework",
  accepted: "Accepted",
};

const AVATAR = { auditor: "bg-auditor-tint text-auditor-ink", org: "bg-org-tint text-org-ink", provider: "bg-provider-tint text-provider-ink" };

function cx(...p: (string | false | undefined)[]) {
  return p.filter(Boolean).join(" ");
}

function now() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
}

type Activity = { id: number; at: string; who: string; what: string; dot: string };

export function LiveDemo() {
  const [view, setView] = useState<View>("org");
  const [acting, setActing] = useState(false);
  const [controls, setControls] = useState(INITIAL_CONTROLS);
  const [requests, setRequests] = useState(INITIAL_REQUESTS);
  const [sel, setSel] = useState(0);
  const [sample, setSample] = useState<string[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [activity, setActivity] = useState<Activity[]>([
    { id: 1, at: "09:12", who: "Ledgerline CPA", what: "requested rework on change tickets", dot: "bg-auditor" },
    { id: 2, at: "08:40", who: "Brightgate Advisory", what: "replied on behalf of Northwind Labs", dot: "bg-provider" },
    { id: 3, at: "08:05", who: "AWS", what: "evidence sync finished", dot: "bg-org" },
  ]);
  const [flash, setFlash] = useState<string | null>(null);
  const nextId = useRef(10);
  const box = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [paused, setPaused] = useState(false);

  const log = useCallback((who: string, what: string, dot: string) => {
    setActivity((a) => [{ id: nextId.current++, at: now(), who, what, dot }, ...a].slice(0, 7));
  }, []);

  const toast = useCallback((m: string) => {
    setFlash(m);
    window.setTimeout(() => setFlash((f) => (f === m ? null : f)), 2400);
  }, []);

  // Auto activity only while the demo is on screen.
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  useEffect(() => {
    if (!visible || paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let i = 0;
    const t = window.setInterval(() => {
      const [who, what, dot] = TICKER[i++ % TICKER.length];
      log(who, what, dot);
    }, 4200);
    return () => window.clearInterval(t);
  }, [visible, paused, log]);

  const readiness = useMemo(
    () =>
      FW.map((f) => {
        const mine = controls.filter((c) => c.maps.includes(f.key));
        const passing = mine.filter((c) => c.status === "passing").length;
        return { ...f, passing, total: mine.length, pct: Math.round((passing / mine.length) * 100) };
      }),
    [controls]
  );
  const avg = Math.round(readiness.reduce((a, r) => a + r.pct, 0) / readiness.length);

  function fix(code: string) {
    const next = controls.map((c) => (c.code === code ? { ...c, status: "passing" as CStatus, result: "Fixed just now" } : c));
    setControls(next);
    const c = controls.find((x) => x.code === code)!;
    const gained = FW.filter((f) => c.maps.includes(f.key)).map((f) => f.label).join(", ");
    log(acting ? "Brightgate Advisory" : c.owner, `fixed ${code} · readiness up in ${gained}`, acting ? "bg-provider" : "bg-org");
    toast(`${code} now passing. Readiness moved in ${gained}.`);
  }

  function review(status: RStatus) {
    setRequests((rs) =>
      rs.map((r, i) =>
        i === sel
          ? {
              ...r,
              status,
              thread: [
                ...r.thread,
                { who: "Ledgerline CPA", side: "auditor", text: status === "accepted" ? "Evidence accepted." : "Evidence incomplete. Please add the deploy log." },
              ],
            }
          : r
      )
    );
    log("Ledgerline CPA", `${status === "accepted" ? "accepted" : "requested rework on"} "${requests[sel].title}"`, "bg-auditor");
    toast(status === "accepted" ? "Accepted and linked to the workpaper." : "Sent back to the client.");
  }

  function draw() {
    if (drawing) return;
    setDrawing(true);
    setSample([]);
    let x = 7;
    const picks = new Set<number>();
    while (picks.size < 25) {
      x = (x * 1103515245 + 12345) % 2147483648;
      picks.add(1000 + (x % 412));
    }
    const items = [...picks].sort((a, b) => a - b).map((n) => `NW-${n}`);
    let i = 0;
    const t = window.setInterval(() => {
      i++;
      setSample(items.slice(0, i));
      if (i >= items.length) {
        window.clearInterval(t);
        setDrawing(false);
        log("Ledgerline CPA", "drew 25 of 412 change tickets · seed 7 · locked", "bg-auditor");
      }
    }, 45);
  }

  function reset() {
    setControls(INITIAL_CONTROLS);
    setRequests(INITIAL_REQUESTS);
    setSample([]);
    setActing(false);
    setView("org");
    toast("Demo reset.");
  }

  const TABS: [View, string, string][] = [
    ["org", "Organization", "bg-org"],
    ["auditor", "Auditor", "bg-auditor"],
    ["provider", "Consultant", "bg-provider"],
  ];

  const r = requests[sel];
  const failing = controls.filter((c) => c.status !== "passing");

  return (
    <div ref={box} className="relative mx-auto w-full max-w-[1120px]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 -z-10 animate-glow rounded-[40px] bg-[radial-gradient(60%_60%_at_50%_30%,rgba(43,74,203,0.18),transparent_70%)]" />
      <div className="overflow-hidden rounded-2xl border border-line bg-white text-left shadow-[0_30px_80px_-30px_rgba(15,23,42,0.35)]">
        {/* Window bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-[#FBFCFD] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-[#F87171]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#FBBF24]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#34D399]" />
            <span className="ml-3 hidden items-center gap-2 rounded-md border border-line bg-white px-3 py-1 text-xs text-muted sm:flex">
              app.auditops · {view === "provider" ? "Brightgate Advisory" : view === "auditor" ? "Ledgerline CPA" : "Northwind Labs"}
            </span>
          </div>
          <div role="tablist" aria-label="Demo view" className="flex rounded-lg border border-line bg-white p-1">
            {TABS.map(([k, l, c]) => (
              <button
                key={k}
                role="tab"
                aria-selected={view === k}
                onClick={() => {
                  setView(k);
                  if (k !== "org") setActing(false);
                }}
                className={cx(
                  "rounded-md px-3 py-1.5 text-xs font-semibold transition",
                  view === k ? cx(c, "text-white shadow-sm") : "text-muted hover:text-ink"
                )}
              >
                {l}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-auditor-ink">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-auditor opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-auditor" />
              </span>
              Live demo
            </span>
            <button onClick={reset} className="text-xs font-semibold text-muted hover:text-ink">Reset</button>
          </div>
        </div>

        {acting && view === "org" && (
          <div className="flex flex-wrap items-center justify-between gap-2 bg-provider-tint px-5 py-2 text-xs font-medium text-provider-ink animate-slide-in">
            <span>Brightgate Advisory acting inside <strong>Northwind Labs</strong> · contributor access · every action logged</span>
            <button onClick={() => { setActing(false); setView("provider"); }} className="font-semibold underline">Back to portfolio</button>
          </div>
        )}

        <div className="grid min-h-[460px] md:grid-cols-[1fr_270px]">
          {/* Main panel */}
          <div key={view} className="flex min-w-0 flex-col gap-4 p-5 animate-fade-up">
            {view === "org" && (
              <>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted">Northwind Labs</div>
                    <div className="font-display text-xl font-bold">Audit readiness</div>
                  </div>
                  <div className="text-xs text-muted">Overall <span className="font-display text-lg font-bold text-ink">{avg}%</span></div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {readiness.map((f) => (
                    <div key={f.key} className="rounded-xl border border-line p-3.5">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm font-semibold">{f.label}</span>
                        <span className="font-display text-2xl font-bold tabular-nums">{f.pct}%</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded bg-line">
                        <div className={cx("h-2 rounded transition-[width] duration-700 ease-out", f.color)} style={{ width: `${f.pct}%` }} />
                      </div>
                      <div className="mt-1.5 text-[11px] text-muted">{f.passing} of {f.total} controls passing</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-line">
                  <div className="flex items-center justify-between border-b border-hair px-4 py-2.5">
                    <span className="text-sm font-bold">Controls needing work</span>
                    <span className="text-[11px] text-muted">Fix one and watch every framework move</span>
                  </div>
                  {failing.length === 0 ? (
                    <div className="px-4 py-6 text-center text-sm font-semibold text-auditor-ink animate-pop-in">All controls passing. Ready for the auditor.</div>
                  ) : (
                    failing.slice(0, 5).map((c) => (
                      <div key={c.code} className="flex items-center gap-3 border-b border-hair px-4 py-2.5 last:border-0 animate-slide-in">
                        <span className="w-12 flex-none text-xs text-muted">{c.code}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold">{c.name}</span>
                          <span className="block truncate text-[11px] text-muted">{c.result} · {c.owner} · {c.maps.length} frameworks</span>
                        </span>
                        <span className={cx("pill hidden sm:inline-block", PILL[c.status])}>{LABEL[c.status]}</span>
                        <button onClick={() => fix(c.code)} className="rounded-md bg-org px-3 py-1.5 text-xs font-semibold text-white hover:brightness-90">Fix</button>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}

            {view === "auditor" && (
              <>
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <div className="text-xs text-muted">Engagement room · Northwind Labs</div>
                    <div className="font-display text-xl font-bold">SOC 2 Type II · FY26</div>
                  </div>
                  <div className="flex gap-1">
                    {["Scoping", "Planning", "Fieldwork", "Review", "Report"].map((p, i) => (
                      <span key={p} className={cx("rounded px-2 py-1 text-[10px] font-semibold", i < 2 ? "bg-auditor-tint text-auditor-ink" : i === 2 ? "bg-auditor text-white" : "bg-hair text-muted")}>{p}</span>
                    ))}
                  </div>
                </div>
                <div className="grid gap-4 lg:grid-cols-[0.9fr_1.3fr]">
                  <div className="flex flex-col gap-1">
                    {requests.map((q, i) => (
                      <button
                        key={q.title}
                        onClick={() => setSel(i)}
                        className={cx(
                          "flex items-center justify-between gap-2 rounded-lg border p-2.5 text-left transition",
                          i === sel ? "border-slate-400 bg-hair" : "border-transparent hover:bg-hair"
                        )}
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-[13px] font-semibold">{q.title}</span>
                          <span className="text-[11px] text-muted">{q.control}</span>
                        </span>
                        <span key={q.status} className={cx("pill animate-pop-in", PILL[q.status])}>{LABEL[q.status]}</span>
                      </button>
                    ))}
                  </div>
                  <div key={sel} className="flex min-w-0 flex-col gap-3 rounded-xl border border-line p-4 animate-fade-up">
                    <div className="text-[13px] leading-relaxed text-label">{r.ask}</div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.files.length ? r.files.map((f) => <span key={f} className="rounded-md border border-line px-2 py-1 text-[11px]">{f}</span>) : <span className="text-[11px] text-muted">No evidence yet</span>}
                    </div>
                    <div className="flex flex-col gap-2">
                      {r.thread.slice(-3).map((m, i) => (
                        <div key={i} className={cx("flex gap-2 animate-slide-in", m.internal && "rounded-lg border border-dashed border-auditor bg-auditor-soft p-2")}>
                          <span className={cx("flex h-7 w-7 flex-none items-center justify-center rounded-full text-[10px] font-bold", AVATAR[m.side])}>
                            {m.who.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                          </span>
                          <span className="text-[12px] leading-snug">
                            <strong>{m.who}</strong>{m.internal && <span className="text-auditor-ink"> · internal, firm only</span>}
                            <br />
                            {m.text}
                          </span>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => review("accepted")} disabled={r.status === "accepted"} className="rounded-md bg-auditor px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Accept evidence</button>
                      <button onClick={() => review("needs_rework")} disabled={r.status === "accepted"} className="rounded-md border border-field px-3 py-1.5 text-xs font-semibold disabled:opacity-50">Request rework</button>
                      {r.control === "CC8.1" && (
                        <button onClick={draw} disabled={drawing} className="rounded-md border border-auditor px-3 py-1.5 text-xs font-semibold text-auditor-ink disabled:opacity-50">
                          {drawing ? "Drawing…" : "Draw sample · 25 of 412"}
                        </button>
                      )}
                    </div>
                    {sample.length > 0 && r.control === "CC8.1" && (
                      <div className="flex flex-wrap gap-1">
                        {sample.map((s) => (
                          <span key={s} className="pill bg-hair font-medium text-ink animate-pop-in">{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {view === "provider" && (
              <>
                <div>
                  <div className="text-xs text-muted">Brightgate Advisory</div>
                  <div className="font-display text-xl font-bold">Client portfolio</div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[["Clients", "4"], ["Audits in progress", "2"], ["Average readiness", `${Math.round((avg + 81 + 58 + 49) / 4)}%`]].map(([l, v]) => (
                    <div key={l} className="rounded-xl border border-line p-3.5">
                      <div className="text-[11px] text-muted">{l}</div>
                      <div className="font-display text-2xl font-bold tabular-nums">{v}</div>
                    </div>
                  ))}
                </div>
                <div className="rounded-xl border border-line">
                  {CLIENTS.map((c) => {
                    const pct = c.live ? avg : c.pct!;
                    return (
                      <div key={c.name} className="flex flex-wrap items-center gap-3 border-b border-hair px-4 py-3 last:border-0">
                        <span className="min-w-[140px] flex-1">
                          <span className="block text-sm font-semibold">{c.name}</span>
                          <span className="block text-[11px] text-muted">{c.fw} · {c.auditor}</span>
                        </span>
                        <span className="flex w-40 items-center gap-2">
                          <span className="h-2 flex-1 overflow-hidden rounded bg-line">
                            <span className={cx("block h-2 rounded transition-[width] duration-700", pct >= 75 ? "bg-auditor" : pct >= 50 ? "bg-org" : "bg-provider")} style={{ width: `${pct}%` }} />
                          </span>
                          <span className="w-9 text-xs font-semibold tabular-nums">{pct}%</span>
                        </span>
                        {c.live ? (
                          <button
                            onClick={() => {
                              setActing(true);
                              setView("org");
                              log("Brightgate Advisory", "entered Northwind Labs workspace", "bg-provider");
                            }}
                            className="rounded-md bg-provider px-3 py-1.5 text-xs font-semibold text-white hover:brightness-90"
                          >
                            Enter
                          </button>
                        ) : (
                          <span className="w-[54px]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Activity */}
          <aside className="border-t border-line bg-[#FBFCFD] p-4 md:border-l md:border-t-0">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-muted">Activity</span>
              <span className="text-[10px] text-muted">{paused ? "paused" : "live"}</span>
            </div>
            <ol className="m-0 flex list-none flex-col gap-3 p-0">
              {activity.slice(0, 6).map((a) => (
                <li key={a.id} className="flex gap-2.5 animate-slide-in">
                  <span className={cx("mt-1.5 h-2 w-2 flex-none rounded-full", a.dot)} />
                  <span className="text-[12px] leading-snug">
                    <span className="text-[10px] text-muted">{a.at}</span>
                    <br />
                    <strong>{a.who}</strong> {a.what}
                  </span>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>

      {flash && (
        <div role="status" className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-ink px-4 py-2.5 text-xs font-medium text-white shadow-lg animate-pop-in">
          {flash}
        </div>
      )}
      <p className="mt-4 text-center text-xs text-muted">
        Interactive demo with sample data. Click <strong>Fix</strong>, switch to <strong>Auditor</strong> to review evidence and
        draw a sample, or enter a client as the <strong>Consultant</strong>. Nothing is saved.
      </p>
    </div>
  );
}
