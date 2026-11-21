import Link from "next/link";
import { Logo, SiteHeader } from "@/components/brand";
import { CONNECTS, FAQ, SITE } from "@/lib/site";
import { LiveDemo } from "@/components/site/live-demo";
import { HeroMock } from "@/components/site/hero-mock";
import { Pricing } from "@/components/site/pricing";
import { Reveal } from "@/components/site/motion";

export const metadata = { title: "AuditOps · Compliance Operations Platform" };

const NAVY = "#0B1437";

const AUDIENCES = [
  {
    eyebrow: "ORGANIZATIONS",
    title: "Get audit-ready, stay audit-ready",
    body: "For companies working toward SOC 2, ISO 27001, PCI DSS, HIPAA or DPDP, and keeping it after the report.",
    points: ["Readiness score per framework", "One control covers many frameworks", "Evidence library linked to controls", "Hire verified auditors and consultants"],
    cta: ["Start as organization", "/signup?as=organization"],
    dark: false,
  },
  {
    eyebrow: "AUDIT FIRMS",
    title: "Run fieldwork in one room per client",
    body: "For CPA firms, ISO certification bodies, PCI QSAs and FedRAMP 3PAOs.",
    points: ["Request lists with accept / rework", "Seeded, locked sampling", "Workpapers and internal notes, firm only", "Verified listing and inbound leads"],
    cta: ["Start as audit firm", "/signup?as=auditor"],
    dark: true,
  },
  {
    eyebrow: "SERVICE PROVIDERS",
    title: "Every client, one console",
    body: "For vCISOs, compliance consultants and MSPs who get clients ready and see them through the audit.",
    points: ["Portfolio readiness across clients", "Work inside client workspaces, logged", "Join clients' audit rooms", "Listed in the marketplace"],
    cta: ["Start as provider", "/signup?as=provider"],
    dark: false,
  },
];

const FEATURES = [
  ["Shared control library", "Each control maps to every framework it satisfies. Fix it once and readiness moves everywhere it counts.", "M4 6h16M4 12h16M4 18h10", "bg-org-tint text-org"],
  ["Live readiness", "See how close each framework is to audit-ready, which controls fail, and who owns them.", "M5 19V9M12 19V5M19 19v-7", "bg-auditor-tint text-auditor"],
  ["Engagement rooms", "Company, auditor and consultant in one room: requests, threads, evidence, findings and a timeline.", "M4 5h16v11H8l-4 4z", "bg-provider-tint text-provider"],
  ["Sampling built in", "Draw a seeded random sample from a population. Seed and items are locked and reproducible.", "M5 5h4v4H5zM15 5h4v4h-4zM5 15h4v4H5zM15 15h4v4h-4z", "bg-admin-tint text-admin"],
  ["Workpapers & internal notes", "Auditor-only notes and workpapers with reviewer sign-off. Clients and consultants never see them.", "M7 3h7l5 5v13H7zM14 3v5h5", "bg-warn-tint text-warn"],
  ["Verified marketplace", "Find audit firms whose credentials were checked, and request proposals with your readiness attached.", "M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z", "bg-org-tint text-org"],
];

const STEPS = [
  ["Create your workspace", "Sign up with your work email, Google or Microsoft as an organization, audit firm or service provider."],
  ["Pick your frameworks", "AuditOps sets up the shared control library. Assign owners, collect evidence, watch readiness climb."],
  ["Bring in your auditor", "Request a proposal from a verified firm or invite yours. Run the audit in one engagement room."],
];

const SECURITY = [
  ["A private workspace per company.", "Each party sees only its own data and the rooms it belongs to."],
  ["Strong sign-in.", "Passwords hashed with argon2id, Google or Microsoft sign-in, two-step verification, Cloudflare Turnstile."],
  ["Least privilege.", "Owner, admin, member and viewer roles. Consultants get contributor access only, revocable any time."],
  ["Append-only audit trail.", "Sign-ins, changes and decisions are recorded, and the database refuses edits and deletes."],
  ["Read-only support.", "AuditOps staff can view a workspace only in a logged, read-only session with a stated reason."],
];

function Tick({ light = false }: { light?: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 flex-none">
      <path d="M3.5 8.5l3 3 6-7" stroke={light ? "#FACC15" : "#0F6B5C"} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Heading({ eyebrow, title, lead, center = true }: { eyebrow: string; title: string; lead?: string; center?: boolean }) {
  return (
    <Reveal className={center ? "mx-auto mb-12 max-w-[680px] text-center" : "mb-8"}>
      <span className="text-[11px] font-bold tracking-[0.16em] text-org">{eyebrow}</span>
      <h2 className="mt-3 text-[30px] font-bold leading-tight tracking-tight md:text-[38px]">{title}</h2>
      {lead && <p className="mx-auto mt-3 max-w-[600px] text-[16px] leading-relaxed text-muted">{lead}</p>}
    </Reveal>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-clip bg-white">
      <SiteHeader />

      {/* ---------------------------------------------------------------- hero */}
      <section className="relative overflow-hidden text-white" style={{ background: NAVY }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_80%_at_85%_10%,rgba(43,74,203,0.55),transparent_60%),radial-gradient(40%_60%_at_100%_100%,rgba(15,107,92,0.35),transparent_60%)]" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(70%_70%_at_60%_40%,black,transparent)]" />
        <div className="relative mx-auto grid max-w-[1180px] items-center gap-12 px-6 pb-24 pt-16 lg:grid-cols-[1fr_1.05fr] lg:pt-24">
          <div className="flex animate-fade-up flex-col items-start gap-6">
            <span className="rounded-full bg-[#FACC15]/15 px-3 py-1 text-[11px] font-bold tracking-[0.14em] text-[#FACC15] ring-1 ring-[#FACC15]/30">
              {SITE.tagline}
            </span>
            <h1 className="text-[42px] font-bold leading-[1.04] tracking-tight md:text-[58px]">
              Every audit,
              <br />
              <span className="text-[#FACC15]">one room.</span>
            </h1>
            <p className="m-0 max-w-[520px] text-[17px] leading-relaxed text-slate-300">
              AuditOps brings the company being audited, its auditor and its consultants into one platform. Track every
              control across frameworks, collect evidence once, and run fieldwork in a shared engagement room where each
              party sees only what it should.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/signup" className="rounded-lg bg-[#FACC15] px-6 py-3 text-[15px] font-bold text-[#0B1437] shadow-[0_12px_30px_-10px_rgba(250,204,21,0.6)] hover:brightness-95">
                Start free
              </Link>
              <a href="#demo" className="rounded-lg border border-white/25 px-6 py-3 text-[15px] font-semibold text-white hover:bg-white/10">
                Try the live demo
              </a>
            </div>
            <span className="text-xs text-slate-400">Free to create a workspace · no card needed · sign up with Google or Microsoft</span>
          </div>
          <div className="flex animate-fade-up justify-center [animation-delay:150ms] lg:justify-end">
            <HeroMock />
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------- frameworks + connects */}
      <section className="border-b border-line bg-canvas">
        <div className="mx-auto max-w-[1180px] px-6 py-16">
          <Heading eyebrow="FRAMEWORKS & SOURCES" title="One control library, every framework" lead="Nine frameworks share one set of controls. Upload evidence from any tool today; direct connectors are on the roadmap." />
          <Reveal className="mb-8 flex flex-wrap justify-center gap-2">
            {["SOC 2", "SOC 1", "ISO 27001", "PCI DSS 4.0", "HIPAA", "FedRAMP 20x", "DPDP (India)", "GDPR", "ISO 42001"].map((f) => (
              <span key={f} className="rounded-full border border-org/20 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-org-ink">{f}</span>
            ))}
          </Reveal>
          <Reveal delay={100} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CONNECTS.map((c) => (
              <div key={c.group} className="rounded-xl border border-line bg-white p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-[0.14em] text-muted">{c.group.toUpperCase()}</span>
                  <span className="text-[10px] font-semibold text-muted">Roadmap</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.tools.map((t) => (
                    <span key={t} className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px]">
                      <span className="flex h-5 w-5 items-center justify-center rounded bg-hair text-[10px] font-bold text-label">{t[0]}</span>
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- who */}
      <section id="who" className="mx-auto max-w-[1180px] scroll-mt-20 px-6 py-20">
        <Heading eyebrow="WHO IT'S FOR" title="Built for every side of the audit" lead="One account can belong to several workspaces. Start on your own side and invite the others when you are ready." />
        <Reveal delay={100} className="grid gap-5 lg:grid-cols-3">
          {AUDIENCES.map((a) => (
            <div
              key={a.eyebrow}
              className={`flex flex-col gap-4 rounded-2xl p-7 transition duration-300 hover:-translate-y-1 ${
                a.dark ? "text-white shadow-[0_24px_60px_-28px_rgba(11,20,55,0.8)]" : "border border-line bg-white"
              }`}
              style={a.dark ? { background: NAVY } : undefined}
            >
              <span className={`text-[11px] font-bold tracking-[0.14em] ${a.dark ? "text-[#FACC15]" : "text-org"}`}>{a.eyebrow}</span>
              <h3 className="text-[21px] font-bold leading-snug">{a.title}</h3>
              <p className={`m-0 text-sm leading-relaxed ${a.dark ? "text-slate-300" : "text-muted"}`}>{a.body}</p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm">
                {a.points.map((p) => (
                  <li key={p} className={`flex gap-2 ${a.dark ? "text-slate-200" : "text-label"}`}>
                    <Tick light={a.dark} />
                    {p}
                  </li>
                ))}
              </ul>
              <Link
                href={a.cta[1]}
                className={`mt-auto self-start rounded-lg px-4 py-2.5 text-sm font-bold ${a.dark ? "bg-[#FACC15] text-[#0B1437]" : "text-white"}`}
                style={a.dark ? undefined : { background: NAVY }}
              >
                {a.cta[0]}
              </Link>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- live demo */}
      <section id="demo" className="scroll-mt-20 border-y border-line bg-canvas">
        <div className="mx-auto max-w-[1240px] px-4 py-20 md:px-6">
          <Heading eyebrow="LIVE DEMO" title="Click around a real audit" lead="Fix a failing control, switch to the auditor to review evidence and draw a sample, or step into a client as the consultant." />
          <Reveal delay={100}>
            <LiveDemo />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- features */}
      <section id="features" className="mx-auto max-w-[1180px] scroll-mt-20 px-6 py-20">
        <Heading eyebrow="FEATURES" title="Less chasing. More audit-ready." lead="Everything the company, the auditor and the consultant need, in one place." />
        <Reveal delay={100} className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, b, icon, tone]) => (
            <div key={t} className="group rounded-2xl border border-line bg-white p-6 transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_44px_-26px_rgba(15,23,42,0.4)]">
              <span className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d={icon} />
                </svg>
              </span>
              <h3 className="text-[17px] font-bold">{t}</h3>
              <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- how */}
      <section id="how" className="scroll-mt-20 bg-canvas">
        <div className="mx-auto max-w-[1180px] px-6 py-20">
          <Heading eyebrow="HOW IT WORKS" title="Set up in minutes" lead="No installs and no IT project. Each company gets its own private workspace." />
          <Reveal delay={100} className="grid gap-5 md:grid-cols-3">
            {STEPS.map(([t, b], i) => (
              <div key={t} className="relative rounded-2xl border border-line bg-white p-6 pt-9">
                <span className="absolute -top-4 left-6 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: NAVY }}>
                  {i + 1}
                </span>
                <h3 className="text-[17px] font-bold">{t}</h3>
                <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{b}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- security */}
      <section id="security" className="mx-auto grid max-w-[1180px] scroll-mt-20 items-start gap-10 px-6 py-20 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <Heading eyebrow="SECURITY & PRIVACY" title="Your audit data stays yours" lead="A compliance platform has to pass its own audit. These protections are on for every workspace." center={false} />
          <Reveal delay={100}>
            <ul className="m-0 flex list-none flex-col gap-4 p-0">
              {SECURITY.map(([t, b]) => (
                <li key={t} className="flex gap-3 text-[15px] leading-relaxed">
                  <Tick />
                  <span><strong>{t}</strong> <span className="text-muted">{b}</span></span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
        <Reveal delay={150}>
          <div className="rounded-2xl p-7 text-white shadow-[0_30px_70px_-30px_rgba(11,20,55,0.8)]" style={{ background: NAVY }}>
            <h3 className="text-xl font-bold">Start free today</h3>
            <p className="m-0 mt-1 text-sm text-slate-300">Create a workspace for your company, your firm or your clients.</p>
            <dl className="m-0 mt-6 divide-y divide-white/10 text-sm">
              {[
                ["Workspace", "Free to create"],
                ["Frameworks", "9 in the catalog"],
                ["Sign-in", "Email, Google, Microsoft"],
                ["Two-step verification", "Included"],
                ["Audit trail", "Append-only"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-3">
                  <dt className="text-slate-300">{k}</dt>
                  <dd className="m-0 font-semibold text-[#FACC15]">{v}</dd>
                </div>
              ))}
            </dl>
            <Link href="/signup" className="mt-6 block rounded-lg bg-[#FACC15] py-3 text-center text-sm font-bold text-[#0B1437] hover:brightness-95">
              Start free
            </Link>
            <p className="m-0 mt-3 text-xs text-slate-400">
              Need a security review or DPA?{" "}
              <a className="font-semibold text-white underline" href={`mailto:${SITE.contactEmail}?subject=AuditOps%20security%20review`}>Talk to us</a>.
            </p>
          </div>
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- pricing */}
      <section id="pricing" className="scroll-mt-20 bg-canvas">
        <div className="mx-auto max-w-[1180px] px-6 py-20">
          <Heading eyebrow="PRICING" title="Simple plans for every side" lead="Creating a workspace is free. Upgrade when your audit needs it." />
          <Reveal delay={100}>
            <Pricing />
          </Reveal>
        </div>
      </section>

      {/* ---------------------------------------------------------------- faq */}
      <section id="faq" className="mx-auto max-w-[820px] scroll-mt-20 px-6 py-20">
        <Heading eyebrow="FAQ" title="Questions" />
        <Reveal delay={100} className="divide-y divide-line border-y border-line">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold">
                {q}
                <span className="text-lg leading-none text-muted transition group-open:rotate-45">+</span>
              </summary>
              <p className="m-0 mt-3 text-sm leading-relaxed text-muted">{a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* ---------------------------------------------------------------- cta */}
      <section className="relative overflow-hidden text-white" style={{ background: NAVY }}>
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_80%_at_50%_0%,rgba(43,74,203,0.45),transparent_70%)]" />
        <div className="relative mx-auto flex max-w-[900px] flex-col items-center gap-5 px-6 py-20 text-center">
          <h2 className="text-[32px] font-bold leading-tight md:text-[42px]">Put your next audit in <span className="text-[#FACC15]">one room</span></h2>
          <p className="m-0 max-w-[560px] text-[16px] text-slate-300">Controls, evidence, requests and findings, shared by the company, its auditor and its consultants.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup?as=organization" className="rounded-lg bg-[#FACC15] px-5 py-3 text-sm font-bold text-[#0B1437] hover:brightness-95">Start as organization</Link>
            <Link href="/signup?as=auditor" className="rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold hover:bg-white/10">Join as auditor</Link>
            <Link href="/signin" className="rounded-lg border border-white/25 px-5 py-3 text-sm font-semibold hover:bg-white/10">Log in</Link>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- footer */}
      <footer className="text-slate-400" style={{ background: "#081030" }}>
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-4 px-6 py-6 text-xs">
          <div className="flex items-center gap-4">
            <Logo dark />
            <span>© {new Date().getFullYear()} Opseros. {SITE.name} {SITE.by}.</span>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap gap-5">
            <a href="#pricing" className="hover:text-white">Pricing</a>
            <a href="#security" className="hover:text-white">Security</a>
            <Link href="/signin" className="hover:text-white">Log in</Link>
            <Link href="/signup" className="hover:text-white">Sign up</Link>
            <a href={`mailto:${SITE.contactEmail}`} className="hover:text-white">Contact</a>
          </nav>
        </div>
      </footer>

      {/* Floating contact */}
      <a
        href={`mailto:${SITE.contactEmail}?subject=AuditOps%20question`}
        aria-label="Contact AuditOps"
        className="fixed bottom-5 right-5 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-org text-white shadow-[0_12px_30px_-8px_rgba(43,74,203,0.7)] transition hover:scale-105"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5h16v11H8l-4 4z" />
        </svg>
      </a>
    </div>
  );
}
