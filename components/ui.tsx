import Link from "next/link";
import type { ReactNode } from "react";

export type Kind = "organization" | "auditor" | "provider" | "admin";

export const ACCENT: Record<Kind, { bg: string; tint: string; ink: string; hex: string }> = {
  organization: { bg: "bg-org", tint: "bg-org-tint", ink: "text-org-ink", hex: "#2B4ACB" },
  auditor: { bg: "bg-auditor", tint: "bg-auditor-tint", ink: "text-auditor-ink", hex: "#0F6B5C" },
  provider: { bg: "bg-provider", tint: "bg-provider-tint", ink: "text-provider-ink", hex: "#B4500F" },
  admin: { bg: "bg-admin", tint: "bg-admin-tint", ink: "text-admin-ink", hex: "#6D28D9" },
};

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cx("card", className)}>{children}</div>;
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow && <span className="text-[13px] text-muted">{eyebrow}</span>}
        <h1 className="font-display text-[30px] font-bold leading-tight">{title}</h1>
      </div>
      {children && <div className="flex flex-wrap gap-3">{children}</div>}
    </div>
  );
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="m-0 max-w-[780px] text-[15px] leading-relaxed text-muted">{children}</p>;
}

const PILL: Record<string, string> = {
  submitted: "bg-org-tint text-org-ink",
  accepted: "bg-auditor-tint text-auditor-ink",
  needs_rework: "bg-danger-tint text-danger",
  open: "bg-hair text-label",
  passing: "bg-auditor-tint text-auditor-ink",
  failing: "bg-danger-tint text-danger",
  needs_evidence: "bg-warn-tint text-warn",
  connected: "bg-auditor-tint text-auditor-ink",
  moderate: "bg-warn-tint text-warn",
  low: "bg-hair text-label",
  high: "bg-danger-tint text-danger",
  active: "bg-auditor-tint text-auditor-ink",
  approved: "bg-auditor-tint text-auditor-ink",
  published: "bg-auditor-tint text-auditor-ink",
  suspended: "bg-danger-tint text-danger",
  rejected: "bg-danger-tint text-danger",
  pending: "bg-warn-tint text-warn",
  pending_verification: "bg-warn-tint text-warn",
  draft: "bg-warn-tint text-warn",
  fieldwork: "bg-auditor-tint text-auditor-ink",
  planning: "bg-org-tint text-org-ink",
  scoping: "bg-org-tint text-org-ink",
  review: "bg-warn-tint text-warn",
  report: "bg-auditor-tint text-auditor-ink",
  consultant: "bg-provider-tint text-provider-ink",
  auditor: "bg-auditor-tint text-auditor-ink",
};

export const STATUS_LABEL: Record<string, string> = {
  submitted: "Submitted",
  accepted: "Accepted",
  needs_rework: "Needs rework",
  open: "Open",
  passing: "Passing",
  failing: "Failing",
  needs_evidence: "Needs evidence",
  moderate: "Moderate",
  low: "Low",
  high: "High",
  active: "Active",
  suspended: "Suspended",
  pending_verification: "Pending verification",
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
};

export function Pill({ status, children, className }: { status?: string; children?: ReactNode; className?: string }) {
  const key = (status || "").toLowerCase().replace(/[\s-]+/g, "_");
  return (
    <span className={cx("pill", PILL[key] || "bg-hair text-label", className)}>
      {children ?? STATUS_LABEL[key] ?? status}
    </span>
  );
}

export function Bar({ pct }: { pct: number }) {
  const color = pct >= 75 ? "bg-auditor" : pct >= 50 ? "bg-org" : "bg-provider";
  return (
    <span className="block h-2 w-full overflow-hidden rounded bg-line">
      <span className={cx("block h-2 rounded", color)} style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </span>
  );
}

export function Table({ head, children, minWidth = 640 }: { head: ReactNode[]; children: ReactNode; minWidth?: number }) {
  return (
    <div className="card overflow-x-auto px-5 py-2">
      <table className="tbl" style={{ minWidth }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="card text-sm text-muted">{children}</div>;
}

export function TextLink({ href, children, className }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Link href={href} className={cx("text-sm font-semibold text-org hover:underline", className)}>
      {children}
    </Link>
  );
}

export function Chip({ href, on, children, kind = "organization" }: { href: string; on: boolean; children: ReactNode; kind?: Kind }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex min-h-10 items-center rounded-full border px-4 text-sm font-semibold",
        on ? cx(ACCENT[kind].bg, "border-transparent text-white") : "border-field bg-white text-label hover:bg-hair"
      )}
    >
      {children}
    </Link>
  );
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card flex flex-col gap-1.5">
      <span className="text-[13px] text-muted">{label}</span>
      <span className="font-display text-[30px] font-bold">{value}</span>
      {sub && <span className="text-xs text-muted">{sub}</span>}
    </div>
  );
}

export function SampleBadge() {
  return <span className="pill ml-2 bg-warn-tint align-middle text-warn">Sample data</span>;
}
