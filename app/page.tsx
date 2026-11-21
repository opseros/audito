import Link from "next/link";
import { Logo, PublicHeader } from "@/components/brand";
import { FAQ, PLANS, SITE } from "@/lib/site";
import { LiveDemo } from "@/components/site/live-demo";
import { CountUp, Reveal } from "@/components/site/motion";

export const metadata = { title: "AuditOps · Compliance Operations Platform" };

const FRAMEWORKS = ["SOC 2", "SOC 1", "ISO 27001", "PCI DSS 4.0", "HIPAA", "FedRAMP 20x", "DPDP (India)", "GDPR", "ISO 42001"];

const ROLES = [
  {
    kind: "organization",
    title: "Organizations",
    desc: "Getting certified. Track every control across frameworks, collect evidence once, and answer auditor requests in one place.",
    points: ["Readiness score per framework", "One control, many frameworks", "Hire auditors and consultants"],
    cta: "Start as organization",
    color: "#2B4ACB",
    tint: "bg-org-tint text-org-ink",
  },
  {
    kind: "auditor",
    title: "Auditors & certification bodies",
    desc: "CPA firms, ISO registrars, QSAs and 3PAOs. Run fieldwork, sample populations, review evidence and issue findings.",
    points: ["Request lists and seeded sampling", "Workpapers with reviewer sign-off", "Verified listing and leads"],
    cta: "Start as auditor",
    color: "#0F6B5C",
    tint: "bg-auditor-tint text-auditor-ink",
  },
  {
    kind: "provider",
    title: "Service providers",
    desc: "vCISOs, consultants and MSPs. Manage every client from one console and work inside their workspace with logged access.",
    points: ["Multi-client portfolio", "Contributor access granted by the client", "Join clients' audit rooms"],
    cta: "Start as provider",
    color: "#B4500F",
    tint: "bg-provider-tint text-provider-ink",
  },
];

const FEATURES = [
  { title: "Shared control library", body: "Each control maps to requirements in every framework you follow. Fix it once and readiness moves everywhere it counts." },
  { title: "Live readiness scores", body: "See how close each framework is to audit-ready, which controls are failing, and who owns them." },
  { title: "Evidence library", body: "Upload evidence once, link it to controls, and attach it to auditor requests. Every download is logged." },
  { title: "Engagement rooms", body: "One room per audit for the company, its auditor and its consultant: requests, threads, evidence, findings and a timeline." },
  { title: "Sampling built in", body: "Auditors draw a seeded random sample from a population. The seed and items are locked and reproducible." },
  { title: "Workpapers and internal notes", body: "Auditor-only notes and workpapers with reviewer sign-off. Clients and consultants never see them." },
  { title: "Consultant access, done safely", body: "Grant a provider contributor access. They work in your workspace under their own name and you can revoke it any time." },
  { title: "Verified marketplace", body: "Find audit firms whose credentials were checked against the issuing body, and request proposals with your readiness attached." },
  { title: "Append-only audit trail", body: "Sign-ins, changes, support sessions and decisions are recorded. The database refuses edits and deletes." },
];

const STEPS = [
  ["Create your workspace", "Sign up as an organization, audit firm or service provider and pick your frameworks."],
  ["Get ready", "Work through the shared control library, assign owners and collect evidence."],
  ["Bring in your auditor", "Request proposals from verified firms, or invite the firm you already work with."],
  ["Run the audit in one room", "Requests, evidence, sampling and findings happen in one place, with every party's view kept apart."],
];

const SECURITY = [
  ["Sign-in your way", "Work email and password, Google or Microsoft. Two-step verification with an authenticator app, mandatory if you choose."],
  ["Bot protection", "Cloudflare Turnstile on sign-in, sign-up and password reset, plus rate limits on repeated attempts."],
  ["Strong credentials", "Passwords hashed with argon2id. Session tokens stored only as hashes, revocable per device."],
  ["Least privilege", "Owner, admin, member and viewer roles. Consultants get contributor access only. Every check runs on the server."],
  ["Tenant isolation", "Each party sees only its own data and the engagement rooms it belongs to. Internal auditor notes stay with the auditor."],
  ["Read-only support", "AuditOps staff can view a workspace only in a read-only session with a stated reason, recorded in the audit trail."],
];

function Check() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" className="mt-0.5 flex-none">
      <path d="M3.5 8.5l3 3 6-7" stroke="#0F6B5C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Section({ id, eyebrow, title, lead, children }: { id?: string; eyebrow: string; title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mx-auto max-w-[1240px] scroll-mt-24 px-6 py-20 md:px-8">
      <Reveal className="mx-auto mb-12 max-w-[720px] text-center">
        <span className="text-xs font-semibold tracking-[0.14em] text-org">{eyebrow}</span>
        <h2 className="mt-3 text-[32px] font-bold leading-tight tracking-tight md:text-[40px]">{title}</h2>
        {lead && <p className="mx-auto mt-4 max-w-[640px] text-[17px] leading-relaxed text-muted">{lead}</p>}
      </Reveal>
      <Reveal delay={120}>{children}</Reveal>
    </section>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen">
      <PublicHeader nav />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(15,23,42,0.045)_1px,transparent_1px),linear-gradient(to_bottom,rgba(15,23,42,0.045)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(70%_60%_at_50%_0%,black,transparent)]" />
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-[520px] w-[900px] -translate-x-1/2 animate-glow rounded-full bg-[radial-gradient(closest-side,rgba(43,74,203,0.22),transparent)]" />
        <div className="mx-auto flex max-w-[1240px] flex-col items-center gap-6 px-6 pb-10 pt-14 text-center md:px-8 md:pt-20">
          <span className="pill animate-fade-up bg-org-tint px-3 py-1.5 text-[12px] tracking-[0.12em] text-org-ink">{SITE.tagline}</span>
          <h1 className="max-w-[920px] animate-fade-up text-[40px] font-bold leading-[1.04] tracking-tight [animation-delay:80ms] md:text-[62px]">
            Run every audit in one place, with{" "}
            <span className="bg-gradient-to-r from-org via-[#5B4BD6] to-auditor bg-clip-text text-transparent">everyone who works on it</span>
          </h1>
          <p className="m-0 max-w-[720px] animate-fade-up text-lg leading-relaxed text-muted [animation-delay:160ms]">
            AuditOps connects the company being audited, its auditors and its consultants. Same controls, same evidence, one
            engagement room, and each party sees only what it should.
          </p>
          <div className="flex animate-fade-up flex-wrap justify-center gap-3 [animation-delay:240ms]">
            <Link href="/signup" className="btnp min-h-12 px-6 text-[15px] shadow-[0_10px_30px_-10px_rgba(43,74,203,0.7)]">Get started free</Link>
            <a href="#demo" className="btn min-h-12 px-6 text-[15px]">Try the live demo ↓</a>
          </div>
          <div className="mt-2 flex max-w-[860px] animate-fade-up flex-wrap justify-center gap-2 [animation-delay:320ms]">
            {FRAMEWORKS.map((f) => (
              <span key={f} className="pill border border-line bg-white px-3 py-1.5 text-label">{f}</span>
            ))}
          </div>
        </div>
        <div id="demo" className="scroll-mt-24 px-4 pb-16 md:px-8">
          <div className="animate-fade-up [animation-delay:400ms]">
            <LiveDemo />
          </div>
        </div>
      </section>

      {/* Proof points (facts about the product, not customer metrics) */}
      <section className="border-y border-line bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-6 px-6 py-10 text-center md:grid-cols-4 md:px-8">
          {([
            [9, "frameworks in the catalog"],
            [1, "control library shared across them"],
            [3, "parties in every engagement room"],
            [0, "edits allowed to the audit trail"],
          ] as const).map(([n, l]) => (
            <div key={l}>
              <div className="font-display text-[40px] font-bold tabular-nums text-org"><CountUp to={n} /></div>
              <div className="text-sm text-muted">{l}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Roles */}
      <Section id="roles" eyebrow="BUILT FOR EVERY SIDE OF THE AUDIT" title="One platform, three workspaces" lead="Choose how you join. You can belong to several workspaces with one account.">
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {ROLES.map((r) => (
            <div key={r.kind} className="card flex flex-col gap-4 p-7 transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-24px_rgba(15,23,42,0.35)]">
              <span className={`pill self-start ${r.tint}`}>{r.title}</span>
              <p className="m-0 text-[15px] leading-relaxed text-muted">{r.desc}</p>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-label">
                {r.points.map((p) => (
                  <li key={p} className="flex gap-2"><Check />{p}</li>
                ))}
              </ul>
              <Link href={`/signup?as=${r.kind}`} className="btnp mt-auto" style={{ background: r.color }}>{r.cta}</Link>
            </div>
          ))}
        </div>
      </Section>

      {/* Features */}
      <div className="bg-white">
        <Section id="features" eyebrow="FEATURES" title="Everything an audit needs, nothing it doesn't" lead="From the first control to the final report, the work and the evidence stay in one place.">
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {FEATURES.map((f, i) => (
              <div key={f.title} className="group rounded-card border border-line bg-canvas p-6 transition duration-300 hover:-translate-y-1 hover:border-org/30 hover:bg-white hover:shadow-[0_18px_40px_-24px_rgba(43,74,203,0.45)]">
                <span className="mb-4 flex h-9 w-9 items-center justify-center rounded-lg bg-org-tint font-display text-sm font-bold text-org-ink transition group-hover:bg-org group-hover:text-white">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="text-[17px] font-bold">{f.title}</h3>
                <p className="m-0 mt-2 text-sm leading-relaxed text-muted">{f.body}</p>
              </div>
            ))}
          </div>
        </Section>
      </div>

      {/* How it works */}
      <Section id="how" eyebrow="HOW IT WORKS" title="From sign-up to report in four steps">
        <ol className="m-0 grid list-none gap-5 p-0 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {STEPS.map(([t, b], i) => (
            <li key={t} className="card relative flex flex-col gap-2 p-6">
              <span className="font-display text-sm font-bold text-org">Step {i + 1}</span>
              <h3 className="text-[17px] font-bold">{t}</h3>
              <p className="m-0 text-sm leading-relaxed text-muted">{b}</p>
            </li>
          ))}
        </ol>
      </Section>

      {/* Security */}
      <div className="bg-ink text-white">
        <section id="security" className="mx-auto max-w-[1240px] scroll-mt-24 px-6 py-20 md:px-8">
          <div className="mb-12 max-w-[720px]">
            <span className="text-xs font-semibold tracking-[0.14em] text-[#9DB0F5]">SECURITY</span>
            <h2 className="mt-3 text-[32px] font-bold leading-tight tracking-tight md:text-[40px]">Built for the data auditors look at</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-slate-300">
              A compliance platform has to pass its own audit. These protections are on for every workspace.
            </p>
          </div>
          <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {SECURITY.map(([t, b]) => (
              <div key={t} className="rounded-card border border-white/10 bg-white/5 p-6">
                <h3 className="text-[17px] font-bold">{t}</h3>
                <p className="m-0 mt-2 text-sm leading-relaxed text-slate-300">{b}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Pricing */}
      <Section id="pricing" eyebrow="PRICING" title="Start free. Pay as your compliance grows." lead="Every plan includes the shared control library, two-step verification and the audit trail.">
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(250px,1fr))]">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative flex h-full flex-col gap-4 rounded-card border bg-white p-6 transition duration-300 hover:-translate-y-1 ${p.highlight ? "border-org shadow-[0_16px_40px_-20px_rgba(43,74,203,0.5)]" : "border-line"}`}
            >
              {p.highlight && <span className="pill absolute -top-3 left-6 bg-org text-white">Most popular</span>}
              <div className="min-h-[72px]">
                <h3 className="text-xl font-bold">{p.name}</h3>
                <p className="m-0 mt-1 text-sm text-muted">{p.audience}</p>
              </div>
              <div className="min-h-[64px]">
                <span className="font-display text-[32px] font-bold">{p.price ?? "Talk to us"}</span>
                {p.price && p.price !== "Free" && p.period && <span className="text-sm text-muted"> {p.period}</span>}
                {!p.price && p.period && <div className="text-xs text-muted">Priced {p.period}</div>}
              </div>
              <ul className="m-0 flex list-none flex-col gap-2 p-0 text-sm text-label">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-2"><Check />{f}</li>
                ))}
              </ul>
              {/* Fixed-height footer so every plan's button lines up. */}
              <div className="mt-auto flex flex-col gap-2 pt-2">
                <Link href={p.cta.href} className={p.highlight ? "btnp" : "btn"}>{p.cta.label}</Link>
                <span className="flex h-4 items-center justify-center text-xs">
                  {p.price ? (
                    <span className="text-muted">No card required</span>
                  ) : (
                    <a href={`mailto:${SITE.contactEmail}?subject=${encodeURIComponent(`AuditOps ${p.name} pricing`)}`} className="font-semibold text-org hover:underline">
                      Get a quote
                    </a>
                  )}
                </span>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-muted">
          Need SSO, data residency or a custom contract?{" "}
          <a href={`mailto:${SITE.contactEmail}?subject=AuditOps%20Enterprise`} className="font-semibold text-org hover:underline">Contact us about Enterprise</a>.
        </p>
      </Section>

      {/* FAQ */}
      <div className="bg-white">
        <Section id="faq" eyebrow="FAQ" title="Questions, answered">
          <div className="mx-auto flex max-w-[820px] flex-col gap-3">
            {FAQ.map(([q, a]) => (
              <details key={q} className="group rounded-card border border-line bg-canvas px-5 py-4 open:bg-white">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                  {q}
                  <span className="text-xl leading-none text-muted transition group-open:rotate-45">+</span>
                </summary>
                <p className="m-0 mt-3 text-sm leading-relaxed text-muted">{a}</p>
              </details>
            ))}
          </div>
        </Section>
      </div>

      {/* Final CTA */}
      <section className="mx-auto max-w-[1240px] px-6 py-20 md:px-8">
        <div className="flex flex-col items-center gap-5 rounded-[20px] bg-org px-6 py-14 text-center text-white">
          <h2 className="max-w-[720px] text-[30px] font-bold leading-tight md:text-[38px]">Bring your next audit into one room</h2>
          <p className="m-0 max-w-[560px] text-[17px] text-white/80">Set up your workspace in minutes. Invite your team, your auditor and your consultants when you are ready.</p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="btn min-h-12 border-white px-6 text-[15px] text-org">Get started free</Link>
            <a href={`mailto:${SITE.contactEmail}?subject=AuditOps%20demo`} className="btnp min-h-12 border border-white/40 bg-transparent px-6 text-[15px]">Book a demo</a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-line bg-white">
        <div className="mx-auto grid max-w-[1240px] gap-10 px-6 py-12 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
          <div className="flex flex-col gap-3">
            <Logo tagline />
            <p className="m-0 max-w-[320px] text-sm leading-relaxed text-muted">
              Organizations, auditors and consultants running audits together.
            </p>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Product</span>
            <a href="#features" className="text-muted hover:text-ink">Features</a>
            <a href="#security" className="text-muted hover:text-ink">Security</a>
            <a href="#pricing" className="text-muted hover:text-ink">Pricing</a>
            <a href="#faq" className="text-muted hover:text-ink">FAQ</a>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Get started</span>
            <Link href="/signup?as=organization" className="text-muted hover:text-ink">For organizations</Link>
            <Link href="/signup?as=auditor" className="text-muted hover:text-ink">For auditors</Link>
            <Link href="/signup?as=provider" className="text-muted hover:text-ink">For service providers</Link>
            <Link href="/signin" className="text-muted hover:text-ink">Sign in</Link>
          </div>
          <div className="flex flex-col gap-2 text-sm">
            <span className="font-semibold">Company</span>
            <a href={`mailto:${SITE.contactEmail}`} className="text-muted hover:text-ink">Contact</a>
            <a href={`mailto:${SITE.contactEmail}?subject=Security`} className="text-muted hover:text-ink">Report a security issue</a>
          </div>
        </div>
        <div className="border-t border-line">
          <div className="mx-auto flex max-w-[1240px] flex-wrap justify-between gap-3 px-6 py-5 text-xs text-muted md:px-8">
            <span>© {new Date().getFullYear()} {SITE.name}. All rights reserved.</span>
            <span className="tracking-[0.12em]">{SITE.tagline}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
