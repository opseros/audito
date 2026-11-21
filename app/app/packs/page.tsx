import { requireKind } from "@/lib/context";
import { Lead, PageTitle, SampleBadge } from "@/components/ui";

export const metadata = { title: "Control packs" };

const PACKS = [
  ["SaaS startup: SOC 2 + ISO 27001", "64 policies · 118 controls · 40 task templates", 7],
  ["E-commerce: PCI DSS 4.0 + script integrity", "22 policies · 74 controls · 18 task templates", 2],
  ["Gov cloud: FedRAMP 20x Low starter", "KSI evidence plan · 31 automation checks", 1],
] as const;

export default async function Packs() {
  await requireKind("provider");
  return (
    <>
      <PageTitle title="Control packs" />
      <Lead>Your reusable policies, controls and task templates. Updates flow to every client using the pack. <SampleBadge /></Lead>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        {PACKS.map(([name, size, used]) => (
          <div key={name} className="card flex flex-col gap-2.5">
            <span className="text-base font-bold">{name}</span>
            <span className="text-[13px] text-muted">{size}</span>
            <span className="text-sm">Used by {used} clients</span>
            <button className="btnp mt-auto bg-provider" disabled title="Coming soon">Apply to client</button>
          </div>
        ))}
      </div>
    </>
  );
}
