import { requireKind } from "@/lib/context";
import { INTEGRATIONS } from "@/lib/catalog";
import { Lead, PageTitle, SampleBadge } from "@/components/ui";

export const metadata = { title: "Integrations" };

export default async function Integrations() {
  await requireKind("organization");
  return (
    <>
      <PageTitle title="Integrations" />
      <Lead>
        Connected tools will collect evidence and run control tests every hour. Connectors are not live yet <SampleBadge />
      </Lead>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
        {INTEGRATIONS.map(([name, what]) => (
          <div key={name} className="card flex flex-col gap-2.5">
            <span className="flex items-center justify-between gap-2">
              <span className="text-[15px] font-bold">{name}</span>
              <span className="pill bg-hair text-label">Not connected</span>
            </span>
            <span className="text-[13px] text-muted">{what}</span>
            <button className="btn" disabled title="Connector coming soon">Connect</button>
          </div>
        ))}
      </div>
    </>
  );
}
