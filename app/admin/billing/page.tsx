import { count, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { PageTitle, SampleBadge, Table } from "@/components/ui";

export const metadata = { title: "Plans and billing" };

export default async function Billing() {
  const n = async (type: "organization" | "auditor" | "provider") =>
    (await db.select({ n: count() }).from(schema.tenants).where(eq(schema.tenants.type, type)))[0]?.n ?? 0;
  const plans = [
    ["Organization", "Company being audited", "[PRICE] per framework per year", await n("organization")],
    ["Auditor firm", "CPA firm, registrar, QSA, 3PAO", "[PRICE] per seat + [PRICE] per engagement", await n("auditor")],
    ["Service provider", "Consultant, vCISO, MSP", "[PRICE] per client managed", await n("provider")],
    ["Marketplace", "Firm winning a referral", "[PERCENT] referral fee", "n/a"],
    ["Enterprise", "Large org, SSO, data residency", "Custom contract", "—"],
  ];
  return (
    <>
      <PageTitle title="Plans and billing" />
      <Table head={["Plan", "Who pays", "Price model", "Active tenants"]} minWidth={720}>
        {plans.map(([name, who, model, count]) => (
          <tr key={name as string}>
            <td className="font-semibold">{name}</td>
            <td>{who}</td>
            <td className="text-muted">{model}</td>
            <td>{count}</td>
          </tr>
        ))}
      </Table>
      <span className="text-[13px] text-muted">Prices are placeholders until pricing is decided; billing is not connected. <SampleBadge /></span>
    </>
  );
}
