import Link from "next/link";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireKind } from "@/lib/context";
import { readiness } from "@/lib/tenants";
import { can } from "@/lib/permissions";
import { setFrameworksAction } from "@/app/app/actions";
import { Bar, Lead, PageTitle } from "@/components/ui";
import { SubmitButton } from "@/components/forms";

export const metadata = { title: "Frameworks" };

export default async function Frameworks() {
  const ctx = await requireKind("organization");
  const fws = await readiness(ctx.tenant.id);
  const catalog = await db.select().from(schema.frameworks).where(eq(schema.frameworks.published, true));
  const editable = can(ctx.role, ctx.tenant.type, "workspace.settings") && !ctx.actingFrom;
  const chosen = new Set(fws.map((f) => f.code));

  return (
    <>
      <PageTitle title="Frameworks" />
      <Lead>Every framework maps to one shared control library. Fix a control once and readiness moves in every framework it belongs to.</Lead>
      <div className="flex flex-col gap-3">
        {fws.map((f) => (
          <div key={f.code} className="card flex flex-wrap items-center gap-5">
            <div className="flex flex-[1_1_240px] flex-col gap-1">
              <span className="text-base font-bold">{f.name}</span>
              <span className="text-[13px] text-muted">{f.passing} of {f.total} controls passing</span>
            </div>
            <div className="flex flex-[1_1_200px] items-center gap-2.5">
              <Bar pct={f.pct} />
              <span className="w-11 font-bold">{f.pct}%</span>
            </div>
            <Link href={`/app/controls?fw=${f.code}`} className="btn">View controls</Link>
          </div>
        ))}
      </div>
      {editable && (
        <form action={setFrameworksAction} className="card flex flex-col gap-3">
          <h2 className="text-base font-bold">Add or remove frameworks</h2>
          <div className="flex flex-wrap gap-2.5">
            {catalog.map((f) => (
              <label key={f.code} className="cursor-pointer">
                <input type="checkbox" name="fw" value={f.code} defaultChecked={chosen.has(f.code)} className="peer sr-only" />
                <span className="inline-flex min-h-10 items-center rounded-full border border-field bg-white px-4 text-sm font-semibold text-label peer-checked:border-transparent peer-checked:bg-org peer-checked:text-white">
                  {f.shortName}
                </span>
              </label>
            ))}
          </div>
          <span className="text-xs text-muted">Removing a framework keeps its controls and evidence.</span>
          <div><SubmitButton variant="secondary">Save frameworks</SubmitButton></div>
        </form>
      )}
    </>
  );
}
