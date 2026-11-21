import { Lead, PageTitle, SampleBadge } from "@/components/ui";

export const metadata = { title: "Marketplace moderation" };

const QUEUE = [
  ["Listing claims FedRAMP 3PAO without accreditation", "Reported by 2 users · listing \"SkyAssure Partners\"", "Remove listing"],
  ["Fee dispute between a client and a QSA", "Proposal accepted, scope changed after kickoff", "Mediate"],
  ["Independence conflict flagged", "Consultant and auditor share a partner on the same HIPAA scope", "Block pairing"],
];

export default function Moderation() {
  return (
    <>
      <PageTitle title="Marketplace moderation" />
      <Lead>Reports from users about listings and firm conduct. The reporting workflow is not live yet. <SampleBadge /></Lead>
      <div className="flex flex-col gap-3">
        {QUEUE.map(([title, detail, act]) => (
          <div key={title} className="card flex flex-wrap items-center gap-4">
            <div className="flex flex-[1_1_340px] flex-col gap-1">
              <span className="font-bold">{title}</span>
              <span className="text-[13px] text-muted">{detail}</span>
            </div>
            <span className="pill bg-warn-tint text-warn">Open</span>
            <span className="flex gap-2">
              <button className="btn" disabled>Dismiss</button>
              <button className="btnp bg-admin" disabled>{act}</button>
            </span>
          </div>
        ))}
      </div>
    </>
  );
}
