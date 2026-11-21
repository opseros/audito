import Link from "next/link";
import { PublicHeader } from "@/components/brand";

const ROLE_CARDS = [
  {
    kind: "organization",
    title: "Organization",
    desc: "Getting certified. Connect tools, track controls across frameworks, answer auditor requests in one place.",
    points: ["Readiness score per framework", "Auto-collected evidence", "Hire auditors and consultants"],
    cta: "Start as organization",
    color: "#2B4ACB",
  },
  {
    kind: "auditor",
    title: "Auditor / Certification body",
    desc: "CPA firms, ISO registrars, QSAs, 3PAOs. Run engagements, sample, review evidence, issue findings.",
    points: ["Request lists and sampling", "Workpapers with sign-off", "Leads from marketplace"],
    cta: "Start as auditor",
    color: "#0F6B5C",
  },
  {
    kind: "provider",
    title: "Service provider",
    desc: "vCISOs, consultants, MSPs. Manage many client organizations from one console, under your own brand.",
    points: ["Multi-client portfolio", "Reusable control packs", "White-label client portal"],
    cta: "Start as provider",
    color: "#B4500F",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen">
      <PublicHeader />
      <section className="mx-auto flex max-w-[1240px] flex-col items-center gap-[18px] px-8 pb-8 pt-12 text-center">
        <span className="pill bg-org-tint text-[13px] text-org-ink">SOC 2 · ISO 27001 · FedRAMP 20x · PCI DSS 4.0 · HIPAA · DPDP</span>
        <h1 className="max-w-[880px] text-[40px] font-bold leading-[1.05] tracking-tight md:text-[56px]">
          One network for everyone in the audit
        </h1>
        <p className="m-0 max-w-[700px] text-lg leading-relaxed text-muted">
          Companies get audit-ready. Auditors run fieldwork. Consultants manage every client. Same controls, same
          evidence, one engagement room.
        </p>
      </section>
      <section className="mx-auto max-w-[1240px] px-8 pb-16 pt-2">
        <h2 className="mb-5 text-center text-[22px] font-bold">Join as</h2>
        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
          {ROLE_CARDS.map((r) => (
            <div key={r.kind} className="card flex flex-col gap-3 p-7">
              <span className="font-display text-[22px] font-bold">{r.title}</span>
              <span className="text-[15px] leading-normal text-muted">{r.desc}</span>
              <ul className="m-0 list-none p-0 text-sm leading-7 text-label">
                {r.points.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
              <Link href={`/signup?as=${r.kind}`} className="btnp mt-auto" style={{ background: r.color }}>
                {r.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
