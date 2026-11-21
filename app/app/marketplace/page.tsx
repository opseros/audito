import Link from "next/link";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { FRAMEWORK_LABELS } from "@/lib/validation";
import { Chip, Empty, Lead, PageTitle } from "@/components/ui";
import { FIRM_TYPES as TYPES, firmType } from "@/lib/marketplace";

export const metadata = { title: "Marketplace" };

export default async function Marketplace({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireKind("organization");
  const { type = "All" } = await searchParams;
  const firms = await db
    .select()
    .from(schema.tenants)
    .where(and(eq(schema.tenants.listed, true), eq(schema.tenants.status, "active"), inArray(schema.tenants.type, ["auditor", "provider"])));
  const shown = firms.filter((f) => type === "All" || firmType(f) === type);

  return (
    <>
      <PageTitle title="Marketplace" />
      <Lead>Find auditors, certification bodies, QSAs, 3PAOs and consultants. Audit firms are listed only after AuditMesh verifies their credentials.</Lead>
      <div className="flex flex-wrap gap-2">
        {Object.keys(TYPES).map((t) => (
          <Chip key={t} href={`/app/marketplace${t === "All" ? "" : `?type=${encodeURIComponent(t)}`}`} on={type === t}>{t}</Chip>
        ))}
      </div>
      {shown.length === 0 && <Empty>No verified firms in this category yet.</Empty>}
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {shown.map((f) => (
          <div key={f.id} className="card flex flex-col gap-2.5">
            <span className={`pill self-start ${f.type === "provider" ? "bg-provider-tint text-provider-ink" : "bg-auditor-tint text-auditor-ink"}`}>{firmType(f)}</span>
            <span className="text-[17px] font-bold">{f.name}</span>
            <span className="text-[13px] text-muted">{f.frameworks.map((c) => FRAMEWORK_LABELS[c] || c).join(", ")}{f.location ? ` · ${f.location}` : ""}</span>
            <span className="text-sm leading-normal">{f.blurb || "No description yet."}</span>
            <div className="mt-auto flex flex-wrap gap-2.5">
              <Link href={`/app/marketplace/${f.id}`} className="btn">View profile</Link>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
