/**
 * Marketing site content. Edit here; the homepage reads from this file.
 *
 * Prices: give each tier { INR, USD } strings, e.g. { INR: "₹999", USD: "$12" },
 * or null to show "Custom". Plan limits are not enforced in the app yet.
 */
export const SITE = {
  name: "AuditOps",
  tagline: "COMPLIANCE OPERATIONS PLATFORM",
  by: "by Opseros",
  contactEmail: "hello@opseros.com",
};

export type Price = { INR: string; USD: string } | null;
export type Tier = {
  name: string;
  audience: string;
  price: Price;
  unit?: string;
  limit: string;
  highlight?: boolean;
  intro?: string;
  features: { title: string; detail?: string }[];
  cta: { label: string; href: string };
};
export type Segment = { key: string; label: string; tiers: Tier[] };

export const PRICING: Segment[] = [
  {
    key: "organizations",
    label: "For organizations",
    tiers: [
      {
        name: "Starter",
        audience: "Preparing for a first audit",
        price: { INR: "Free", USD: "Free" },
        unit: "forever",
        limit: "1 framework",
        features: [
          { title: "Controls & readiness", detail: "Shared control library" },
          { title: "Evidence library", detail: "10 MB per file" },
          { title: "Team roles", detail: "Owner, admin, member, viewer" },
          { title: "Marketplace", detail: "Request auditor proposals" },
        ],
        cta: { label: "Start free", href: "/signup?as=organization" },
      },
      {
        name: "Growth",
        audience: "Several frameworks, active audits",
        price: null,
        unit: "/ month",
        limit: "Up to 4 frameworks",
        highlight: true,
        intro: "Everything in Starter, plus:",
        features: [
          { title: "Engagement rooms", detail: "Requests, sampling, findings" },
          { title: "Consultant access", detail: "Contributor role, fully logged" },
          { title: "Required 2-step sign-in", detail: "For every member" },
          { title: "Priority support" },
        ],
        cta: { label: "Start free", href: "/signup?as=organization" },
      },
      {
        name: "Enterprise",
        audience: "Large teams, custom terms",
        price: null,
        limit: "Unlimited frameworks",
        intro: "Everything in Growth, plus:",
        features: [{ title: "SSO and data residency" }, { title: "Onboarding, invoicing and terms that fit your company" }],
        cta: { label: "Contact us", href: "mailto:hello@opseros.com?subject=AuditOps%20Enterprise" },
      },
    ],
  },
  {
    key: "auditors",
    label: "For audit firms",
    tiers: [
      {
        name: "Firm",
        audience: "CPA firms, ISO registrars, QSAs, 3PAOs",
        price: null,
        unit: "/ seat / month",
        limit: "Unlimited engagements",
        highlight: true,
        features: [
          { title: "Engagement rooms", detail: "Request lists, accept / rework" },
          { title: "Seeded sampling", detail: "Locked and reproducible" },
          { title: "Workpapers & internal notes", detail: "Reviewer sign-off" },
          { title: "Verified marketplace listing", detail: "Leads from organizations" },
        ],
        cta: { label: "Join as auditor", href: "/signup?as=auditor" },
      },
    ],
  },
  {
    key: "providers",
    label: "For service providers",
    tiers: [
      {
        name: "Partner",
        audience: "vCISOs, consultants and MSPs",
        price: null,
        unit: "/ client / month",
        limit: "Any number of clients",
        highlight: true,
        features: [
          { title: "Client portfolio", detail: "Readiness across every client" },
          { title: "Work inside client workspaces", detail: "Every action logged" },
          { title: "Join clients' audit rooms" },
          { title: "Marketplace listing" },
        ],
        cta: { label: "Join as provider", href: "/signup?as=provider" },
      },
    ],
  },
];

export const CONNECTS: { group: string; tools: string[] }[] = [
  { group: "Cloud", tools: ["AWS", "Microsoft Azure", "Google Cloud"] },
  { group: "Identity", tools: ["Google Workspace", "Microsoft Entra ID", "Okta"] },
  { group: "Code & change", tools: ["GitHub", "GitLab", "Bitbucket", "Jira"] },
  { group: "People & HR", tools: ["BambooHR", "Keka", "Darwinbox"] },
  { group: "Security", tools: ["Cloudflare", "CrowdStrike", "Wiz"] },
  { group: "Chat & docs", tools: ["Slack", "Microsoft Teams", "Confluence"] },
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
    "No. Auditors see the requests in their engagement and the evidence you attach to them. In the other direction, auditor workpapers and internal notes are never shown to you or your consultants.",
  ],
  [
    "How do consultants get access?",
    "An admin in your workspace grants a service provider contributor access. They can work on controls, evidence and audit requests, but cannot manage your team or settings. You can revoke access at any time, and every action is logged under their firm's name.",
  ],
  [
    "Can I sign in with Google or Microsoft?",
    "Yes, or with your work email and a password. Two-step verification with an authenticator app is available for everyone and can be made mandatory.",
  ],
  [
    "Do the tool connectors work today?",
    "Connectors to cloud, identity, code and HR tools are on the roadmap. Today you upload evidence from any tool and link it to controls and audit requests.",
  ],
  [
    "How are audit firms verified?",
    "Firms appear in the marketplace only after AuditOps checks their credentials against the issuing body, such as AICPA peer review, ISO/IEC 17021-1 accreditation, the PCI SSC QSA listing or A2LA FedRAMP accreditation.",
  ],
];
