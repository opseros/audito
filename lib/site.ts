/**
 * Marketing site content. Edit here; the homepage reads from this file.
 * Plan features describe the offer; plan limits are not enforced in the app yet.
 * Prices: set `price` to a string such as "₹4,999" to publish it. `null`
 * shows "Talk to us" with a contact link.
 */
export const SITE = {
  name: "AuditOps",
  tagline: "COMPLIANCE OPERATIONS PLATFORM",
  contactEmail: "hello@opseros.com",
};

export type Plan = {
  name: string;
  audience: string;
  price: string | null;
  period?: string;
  highlight?: boolean;
  cta: { label: string; href: string };
  features: string[];
};

export const PLANS: Plan[] = [
  {
    name: "Starter",
    audience: "Companies preparing for their first audit",
    price: "Free",
    cta: { label: "Start free", href: "/signup?as=organization" },
    features: [
      "Pick your frameworks",
      "Shared control library with readiness score",
      "Evidence library (10 MB per file)",
      "Invite your team with roles",
      "Hire an auditor from the marketplace",
    ],
  },
  {
    name: "Growth",
    audience: "Organizations running several frameworks",
    price: null,
    period: "per framework / year",
    highlight: true,
    cta: { label: "Start free, upgrade later", href: "/signup?as=organization" },
    features: [
      "Everything in Starter",
      "Engagement rooms with your auditors",
      "Consultant (provider) access with full audit trail",
      "Two-step verification enforcement",
      "Priority support",
    ],
  },
  {
    name: "Audit firm",
    audience: "CPA firms, ISO registrars, QSAs and 3PAOs",
    price: null,
    period: "per seat / month",
    cta: { label: "Join as auditor", href: "/signup?as=auditor" },
    features: [
      "Unlimited client engagements",
      "Request lists, seeded sampling, findings",
      "Internal notes and workpapers with sign-off",
      "Verified marketplace listing and leads",
    ],
  },
  {
    name: "Service provider",
    audience: "vCISOs, consultants and MSPs",
    price: null,
    period: "per client / month",
    cta: { label: "Join as provider", href: "/signup?as=provider" },
    features: [
      "Multi-client portfolio and readiness view",
      "Work inside client workspaces, fully logged",
      "Join your clients' audit rooms",
      "Marketplace listing",
    ],
  },
];

export const FAQ: [string, string][] = [
  [
    "Who is AuditOps for?",
    "Three groups that work on the same audit: the organization being audited, the audit firm (CPA firm, ISO certification body, PCI QSA or FedRAMP 3PAO), and the consultants who help the organization get ready. Each gets its own workspace, and they meet in a shared engagement room.",
  ],
  [
    "Which frameworks are supported?",
    "SOC 1, SOC 2, ISO 27001, PCI DSS 4.0, HIPAA, FedRAMP 20x, India's DPDP Act, GDPR and ISO 42001. Controls are shared, so one control can satisfy requirements in several frameworks at once.",
  ],
  [
    "Can our auditor see everything in our workspace?",
    "No. Auditors see the requests in their engagement and the evidence you attach to them. Your other controls, evidence and team stay private. In the other direction, auditor workpapers and internal notes are never shown to you or your consultants.",
  ],
  [
    "How do consultants get access?",
    "An admin in your workspace grants a service provider contributor access. They can work on controls, evidence and audit requests, but cannot manage your team or settings. You can revoke access at any time, and every action they take is logged under their firm's name.",
  ],
  [
    "How are audit firms verified?",
    "Firms appear in the marketplace only after AuditOps checks their credentials against the issuing body, for example AICPA peer review, ISO/IEC 17021-1 accreditation, the PCI SSC QSA listing or A2LA FedRAMP accreditation.",
  ],
  [
    "How do I sign in?",
    "With your work email and a password, or with Google or Microsoft. Two-step verification with an authenticator app is available for every user and can be made mandatory.",
  ],
];
