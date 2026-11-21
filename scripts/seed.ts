/**
 * Demo data mirroring the AuditMesh prototype. Development / preview only.
 *   SEED_DEMO_PASSWORD='Demo-pass-2026!' npm run db:seed
 */
import { hash } from "@node-rs/argon2";
import { eq } from "drizzle-orm";
import { db, pool, schema } from "./db";
import { CONTROL_LIBRARY, DEFAULT_REQUEST_LIST } from "../lib/catalog";

const PW = process.env.SEED_DEMO_PASSWORD;

async function user(email: string, name: string, superAdmin = false) {
  const [u] = await db
    .insert(schema.users)
    .values({ email, name, passwordHash: await hash(PW!, { memoryCost: 19456, timeCost: 2, parallelism: 1 }), emailVerifiedAt: new Date(), isSuperAdmin: superAdmin })
    .onConflictDoNothing()
    .returning();
  return u ?? (await db.select().from(schema.users).where(eq(schema.users.email, email)))[0];
}

async function tenant(v: typeof schema.tenants.$inferInsert, owner: string, others: [string, "admin" | "member" | "viewer"][] = []) {
  const [t] = await db.insert(schema.tenants).values(v).onConflictDoNothing().returning();
  const row = t ?? (await db.select().from(schema.tenants).where(eq(schema.tenants.slug, v.slug)))[0];
  await db.insert(schema.memberships).values({ tenantId: row.id, userId: owner, role: "owner" }).onConflictDoNothing();
  for (const [uid, role] of others) await db.insert(schema.memberships).values({ tenantId: row.id, userId: uid, role }).onConflictDoNothing();
  return row;
}

async function main() {
  if (!PW || PW.length < 10) throw new Error("Set SEED_DEMO_PASSWORD (10+ chars).");
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed demo data with NODE_ENV=production.");

  const priya = await user("priya@northwind.test", "Priya S.");
  const dev = await user("dev@northwind.test", "Dev K.");
  const auditorU = await user("riya@ledgerline.test", "R. Iyer");
  const proU = await user("asha@brightgate.test", "Asha B.");
  const northstarU = await user("ops@northstar.test", "N. Rao");
  const meridianU = await user("ops@meridian.test", "M. Grant");
  const graniteU = await user("ops@granite.test", "G. Lopez");
  await user("admin@auditmesh.test", "R. Menon", true);

  const nw = await tenant({ name: "Northwind Labs", slug: "northwind-labs", type: "organization", subtype: "51–200", plan: "Growth", frameworks: ["SOC2", "ISO27001", "PCI", "FEDRAMP"] }, priya.id, [[dev.id, "member"]]);
  const ll = await tenant({ name: "Ledgerline CPA", slug: "ledgerline-cpa", type: "auditor", subtype: "CPA firm (SOC)", plan: "Firm", frameworks: ["SOC1", "SOC2", "HIPAA"], listed: true, location: "Remote · US", blurb: "SOC reports for SaaS and fintech. Fieldwork runs fully inside AuditMesh.", timeline: "Type I in 4–6 weeks; Type II after 3–12 month window" }, auditorU.id);
  await tenant({ name: "Northstar Registrar", slug: "northstar-registrar", type: "auditor", subtype: "ISO certification body", plan: "Firm", frameworks: ["ISO27001", "ISO42001"], listed: true, location: "Bengaluru · London", blurb: "Accredited ISO certification. Stage 1 and Stage 2 with surveillance audits.", timeline: "Stage 1 to certificate in 8–12 weeks" }, northstarU.id);
  await tenant({ name: "Granite QSA", slug: "granite-qsa", type: "auditor", subtype: "PCI QSA company", plan: "Firm", frameworks: ["PCI"], listed: true, location: "Remote · US, EU", blurb: "PCI assessments for e-commerce and payments, including checkout script controls.", timeline: "ROC in 6–10 weeks" }, graniteU.id);
  const mer = await tenant({ name: "Meridian 3PAO", slug: "meridian-3pao", type: "auditor", subtype: "FedRAMP 3PAO", status: "pending_verification", plan: "Firm", frameworks: ["FEDRAMP"], location: "Washington DC", blurb: "Assessments for 20x Low and Moderate using machine-readable evidence." }, meridianU.id);
  const bg = await tenant({ name: "Brightgate Advisory", slug: "brightgate-advisory", type: "provider", subtype: "6–20", plan: "Partner", frameworks: ["SOC2", "ISO27001", "PCI"], listed: true, location: "Pune · Remote", blurb: "Readiness, policies and audit support. Works inside your workspace with logged access.", timeline: "Readiness in 6–10 weeks" }, proU.id);

  await db.insert(schema.verifications).values({ tenantId: mer.id, claim: "FedRAMP 3PAO accreditation (A2LA)", document: "a2la-accreditation.pdf" }).onConflictDoNothing();
  await db.insert(schema.providerAccess).values({ providerTenantId: bg.id, orgTenantId: nw.id, grantedBy: priya.id }).onConflictDoNothing();

  // Controls for Northwind with prototype statuses.
  const STATUS: Record<string, ["passing" | "failing" | "needs_evidence", string, string]> = {
    "AC-01": ["failing", "Dev K.", "2 users without MFA in Google Workspace"],
    "CM-02": ["needs_evidence", "Arjun M.", "Branch protection on; 2 emergency changes need records"],
    "CR-01": ["failing", "Dev K.", "3 S3 buckets without default encryption"],
    "HR-03": ["failing", "Priya S.", "4 staff overdue"],
    "AR-01": ["passing", "Priya S.", "Q3 review signed Oct 4"],
    "IR-01": ["needs_evidence", "Dev K.", "No exercise record for 2026"],
    "VM-01": ["passing", "Dev K.", "Last scan Nov 6, 0 overdue criticals"],
    "VR-01": ["needs_evidence", "Arjun M.", "3 of 11 vendors missing review"],
    "SC-01": ["failing", "Arjun M.", "No script inventory on checkout"],
    "LG-01": ["passing", "Dev K.", "All regions logging"],
    "DR-01": ["passing", "Dev K.", "Restore test passed Oct 30"],
  };
  for (const fw of nw.frameworks) await db.insert(schema.tenantFrameworks).values({ tenantId: nw.id, frameworkCode: fw }).onConflictDoNothing();
  await db.update(schema.tenantFrameworks).set({ milestone: "Audit in progress" }).where(eq(schema.tenantFrameworks.frameworkCode, "SOC2"));
  const controlIds: Record<string, string> = {};
  for (const c of CONTROL_LIBRARY) {
    const maps = Object.entries(c.maps).filter(([fw]) => nw.frameworks.includes(fw));
    if (!maps.length) continue;
    const st = STATUS[c.code] || ["needs_evidence", null, null];
    const [row] = await db
      .insert(schema.controls)
      .values({ tenantId: nw.id, code: c.code, name: c.name, testDescription: c.test, status: st[0], ownerName: st[1], testResult: st[2] })
      .onConflictDoNothing()
      .returning();
    if (!row) continue;
    controlIds[c.code] = row.id;
    for (const [fw, ref] of maps) await db.insert(schema.controlMappings).values({ controlId: row.id, frameworkCode: fw, ref }).onConflictDoNothing();
  }

  const existingEng = await db.select().from(schema.engagements).where(eq(schema.engagements.orgTenantId, nw.id));
  if (!existingEng.length) {
    const [eng] = await db
      .insert(schema.engagements)
      .values({ orgTenantId: nw.id, auditorTenantId: ll.id, providerTenantId: bg.id, frameworkCode: "SOC2", title: "SOC 2 Type II · FY26", window: "Observation window Jan 1 – Sep 30", phase: 2, source: "Brightgate Advisory" })
      .returning();
    const statuses = ["submitted", "needs_rework", "accepted", "open", "open", "accepted"] as const;
    const owners = ["Priya S.", "Arjun M.", "Priya S.", "Dev K.", "Arjun M.", "Dev K."];
    for (let i = 0; i < DEFAULT_REQUEST_LIST.length; i++) {
      const r = DEFAULT_REQUEST_LIST[i];
      const [req] = await db
        .insert(schema.engagementRequests)
        .values({ engagementId: eng.id, title: r.title, controlRef: r.control, ownerName: owners[i], ask: r.ask, status: statuses[i], position: i })
        .returning();
      await db.insert(schema.workpapers).values({ auditorTenantId: ll.id, engagementId: eng.id, ref: `WP-${i + 1}`, name: `${r.title} (${r.control})`, preparer: "R. Iyer", ...(i === 2 ? { signedOffBy: auditorU.id, signedOffAt: new Date() } : {}) });
      if (i === 1) {
        await db.insert(schema.requestMessages).values([
          { requestId: req.id, authorUserId: auditorU.id, authorTenantId: ll.id, body: "NW-1182 and NW-1240 have no peer approval before deploy. Please explain or provide emergency-change record." },
          { requestId: req.id, authorUserId: proU.id, authorTenantId: bg.id, onBehalfOfTenantId: nw.id, body: "Both were hotfixes under emergency-change policy. Arjun to attach post-change approvals from Slack." },
          { requestId: req.id, authorUserId: auditorU.id, authorTenantId: ll.id, internal: true, body: "Linked to WP-2. If 2+ of 25 sampled changes lack approval, consider deviation in report." },
        ]);
        const [ev] = await db
          .insert(schema.evidence)
          .values({ tenantId: nw.id, controlId: controlIds["CM-02"], name: "jira-change-sample.csv", source: "Jira", mime: "text/csv", size: 64, sharedWith: ["Ledgerline CPA"] })
          .returning();
        await db.insert(schema.evidenceBlobs).values({ evidenceId: ev.id, data: Buffer.from("ticket,approved\nNW-1182,no\nNW-1240,no\nNW-1301,yes\n") });
        await db.insert(schema.requestEvidence).values({ requestId: req.id, evidenceId: ev.id });
      }
      if (i === 0) {
        await db.insert(schema.requestMessages).values([
          { requestId: req.id, authorUserId: auditorU.id, authorTenantId: ll.id, body: "Please include contractors too." },
          { requestId: req.id, authorUserId: priya.id, authorTenantId: nw.id, body: "Added. Contractors are in second tab." },
        ]);
      }
    }
    await db.insert(schema.findings).values({ engagementId: eng.id, title: "Two emergency changes deployed without prior approval", controlRef: "CC8.1", severity: "moderate", createdBy: auditorU.id });
    await db.insert(schema.proposalRequests).values({ orgTenantId: nw.id, firmTenantId: ll.id, frameworkLabel: "SOC 2 Type II", status: "Accepted", createdBy: priya.id });
  }

  const [gws] = await db
    .insert(schema.evidence)
    .values({ tenantId: nw.id, controlId: controlIds["AC-01"], name: "gws-mfa-report.json", source: "Google Workspace", mime: "application/json", size: 40 })
    .returning();
  await db.insert(schema.evidenceBlobs).values({ evidenceId: gws.id, data: Buffer.from('{"usersWithoutMfa":2}') });

  await db.insert(schema.auditLog).values({ actorLabel: "Seed", action: "seed", summary: "loaded demo data" });
  console.log("Demo data loaded. Accounts (password = SEED_DEMO_PASSWORD):");
  console.log("  priya@northwind.test  (Northwind Labs owner)\n  dev@northwind.test    (Northwind Labs member)\n  riya@ledgerline.test  (Ledgerline CPA owner)\n  asha@brightgate.test  (Brightgate Advisory owner)\n  admin@auditmesh.test  (super admin)");
  await pool.end();
}

main().catch(async (e) => {
  console.error(e);
  await pool.end();
  process.exit(1);
});
