export const FIRM_TYPES: Record<string, string[] | null> = {
  All: null,
  Auditor: ["CPA firm (SOC)"],
  "Certification body": ["ISO certification body"],
  QSA: ["PCI QSA company"],
  "3PAO": ["FedRAMP 3PAO"],
  Consultant: null,
};

export function firmType(t: { type: string; subtype: string | null }) {
  if (t.type === "provider") return "Consultant";
  return Object.entries(FIRM_TYPES).find(([, subs]) => subs?.includes(t.subtype || ""))?.[0] || "Auditor";
}
