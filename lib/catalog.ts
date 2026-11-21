/** Starter control library applied to new organizations (from the prototype). */
export type TemplateControl = {
  code: string;
  name: string;
  test: string;
  maps: Record<string, string>;
};

export const CONTROL_LIBRARY: TemplateControl[] = [
  { code: "AC-01", name: "MFA enforced for all users", test: "Checks identity provider and cloud IAM for users without MFA.", maps: { SOC2: "CC6.1", ISO27001: "A.5.17", PCI: "8.4.2", FEDRAMP: "Identity & access KSI", HIPAA: "164.312(d)" } },
  { code: "CM-02", name: "Changes approved before deploy", test: "Checks default branch protection and required reviews.", maps: { SOC2: "CC8.1", ISO27001: "A.8.32", PCI: "6.5.1" } },
  { code: "CR-01", name: "Encryption at rest", test: "Checks storage and database default encryption.", maps: { SOC2: "CC6.1", ISO27001: "A.8.24", PCI: "3.5.1", FEDRAMP: "Service configuration KSI", HIPAA: "164.312(a)(2)(iv)" } },
  { code: "HR-03", name: "Security awareness training", test: "Checks HR training records for all active staff.", maps: { SOC2: "CC2.2", ISO27001: "A.6.3", PCI: "12.6.1", HIPAA: "164.308(a)(5)" } },
  { code: "AR-01", name: "Quarterly access review", test: "Checks review completed in last 90 days with sign-off.", maps: { SOC2: "CC6.2", ISO27001: "A.5.18", PCI: "7.2.4", FEDRAMP: "Identity & access KSI" } },
  { code: "IR-01", name: "Incident response plan tested", test: "Manual: tabletop exercise record each year.", maps: { SOC2: "CC7.4", ISO27001: "A.5.24", PCI: "12.10.2", FEDRAMP: "Incident response KSI", HIPAA: "164.308(a)(6)" } },
  { code: "VM-01", name: "Vulnerability scanning", test: "Checks scanner ran in last 30 days with no open criticals past SLA.", maps: { SOC2: "CC7.1", ISO27001: "A.8.8", PCI: "11.3.1", FEDRAMP: "Monitoring KSI" } },
  { code: "VR-01", name: "Vendor risk assessments", test: "Checks each critical vendor has a current review.", maps: { SOC2: "CC9.2", ISO27001: "A.5.19", PCI: "12.8.4", DPDP: "Processor obligations" } },
  { code: "SC-01", name: "Payment page script integrity", test: "Checks script inventory and change alerts on checkout pages.", maps: { PCI: "6.4.3 / 11.6.1" } },
  { code: "LG-01", name: "Central logging and alerts", test: "Checks audit logging on in all regions and alert rules active.", maps: { SOC2: "CC7.2", ISO27001: "A.8.15", PCI: "10.2.1", FEDRAMP: "Monitoring KSI", HIPAA: "164.312(b)" } },
  { code: "PR-01", name: "Privacy notice and consent records", test: "Checks consent capture and notice versioning.", maps: { DPDP: "Sec. 5–6", GDPR: "Art. 7, 13" } },
  { code: "DR-01", name: "Backups tested and restorable", test: "Checks backup jobs and last restore test.", maps: { SOC2: "A1.2", ISO27001: "A.8.13", HIPAA: "164.308(a)(7)" } },
];

export const INTEGRATIONS = [
  ["AWS", "IAM, S3, RDS, CloudTrail config"],
  ["GitHub", "Branch rules, reviews, Dependabot"],
  ["Jira", "Change tickets as audit population"],
  ["Google Workspace", "Users, MFA, offboarding"],
  ["Okta", "SSO, MFA, access reviews"],
  ["Slack", "Approvals and alerts"],
  ["BambooHR", "Staff list, training, background checks"],
  ["Cloudflare", "WAF and checkout script monitoring"],
] as const;

export const DEFAULT_REQUEST_LIST = [
  { title: "Population: new hires in period", control: "CC1.4", ask: "Provide list of all hires in the period with start date and background check date." },
  { title: "Change tickets sample", control: "CC8.1", ask: "For each sampled ticket, provide approval record, peer review link and deploy log." },
  { title: "Quarterly access review", control: "CC6.2", ask: "Provide quarterly access reviews with reviewer sign-off and evidence of revocations." },
  { title: "Incident response test", control: "CC7.4", ask: "Provide most recent incident response tabletop record and lessons learned." },
  { title: "Vendor risk assessments", control: "CC9.2", ask: "Provide vendor inventory with risk tier and latest review for critical vendors." },
  { title: "Encryption at rest config", control: "CC6.7", ask: "Provide configuration evidence for databases and object storage." },
];

export const PHASES = ["Scoping", "Planning", "Fieldwork", "Review", "Report"];
