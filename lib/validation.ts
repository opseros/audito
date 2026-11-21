import { z } from "zod";

export const PASSWORD_MIN = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN, `Use at least ${PASSWORD_MIN} characters.`)
  .max(128, "Use at most 128 characters.")
  .refine(
    (p) => [/[a-z]/, /[A-Z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(p)).length >= 3,
    "Use at least three of: lowercase, uppercase, number, symbol."
  );

export const emailSchema = z.string().trim().toLowerCase().email("Enter a valid email.").max(320);

export const tenantKinds = ["organization", "auditor", "provider"] as const;

export const SIGNUP_COPY = {
  organization: {
    label: "Organization",
    nameLabel: "Company name",
    namePh: "Acme Inc.",
    extraLabel: "Company size",
    extraOpts: ["1–50", "51–200", "201–1000", "1000+"],
    obTitle: "Which frameworks are you working toward?",
    obSub: "Pick any. Controls are shared, so adding more later costs little.",
    obOpts: ["SOC2", "ISO27001", "PCI", "HIPAA", "FEDRAMP", "DPDP", "GDPR"],
  },
  auditor: {
    label: "Auditor",
    nameLabel: "Firm name",
    namePh: "Acme Assurance LLP",
    extraLabel: "Firm type",
    extraOpts: ["CPA firm (SOC)", "ISO certification body", "PCI QSA company", "FedRAMP 3PAO"],
    obTitle: "Which frameworks do you audit or certify?",
    obSub: "Shown on your marketplace profile and used to match leads.",
    obOpts: ["SOC1", "SOC2", "ISO27001", "PCI", "HIPAA", "FEDRAMP"],
  },
  provider: {
    label: "Service provider",
    nameLabel: "Company name",
    namePh: "Acme Advisory",
    extraLabel: "Clients you manage",
    extraOpts: ["1–5", "6–20", "21–100", "100+"],
    obTitle: "Which frameworks do you help clients with?",
    obSub: "Starter control packs created for each one.",
    obOpts: ["SOC2", "ISO27001", "PCI", "HIPAA", "FEDRAMP", "DPDP"],
  },
} as const;

export const FRAMEWORK_LABELS: Record<string, string> = {
  SOC1: "SOC 1",
  SOC2: "SOC 2",
  ISO27001: "ISO 27001",
  PCI: "PCI DSS 4.0",
  FEDRAMP: "FedRAMP 20x",
  HIPAA: "HIPAA",
  DPDP: "DPDP (India)",
  GDPR: "GDPR",
  ISO42001: "ISO 42001",
};

export function safeNext(value: unknown, fallback = "/app") {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) {
    return fallback;
  }
  return /[\r\n]/.test(value) ? fallback : value;
}
