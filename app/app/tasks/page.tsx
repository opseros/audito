import { requireKind } from "@/lib/context";
import { PageTitle, SampleBadge } from "@/components/ui";

export const metadata = { title: "Task board" };

const COLS = [
  { name: "To do", items: [["Draft incident response plan", "Lumen Edu", "Nov 15"], ["Payment page script inventory", "Fernhill Retail", "Nov 20"], ["Risk register first pass", "Lumen Edu", "Nov 22"]] },
  { name: "Waiting on client", items: [["Collect vendor SOC reports", "Northwind Labs", "Nov 12"], ["KSI gap review workshop", "Cobalt Gov Cloud", "Nov 18"]] },
  { name: "Done", items: [["Access review sign-off", "Orbit Health", "Done"]] },
];

export default async function Tasks() {
  await requireKind("provider");
  return (
    <>
      <PageTitle title="Task board · all clients" />
      <p className="m-0 text-sm text-muted">Cross-client tasks are coming soon. <SampleBadge /></p>
      <div className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
        {COLS.map((c) => (
          <section key={c.name} className="flex min-w-0 flex-col gap-2.5 rounded-card bg-[#EEF1F5] p-3.5">
            <h2 className="text-[15px] font-bold">{c.name} · {c.items.length}</h2>
            {c.items.map(([title, client, due]) => (
              <div key={title} className="card flex flex-col gap-2 p-3.5">
                <span className="text-sm font-semibold">{title}</span>
                <span className="text-xs text-muted">{client} · {due}</span>
              </div>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
