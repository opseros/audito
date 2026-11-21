import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { CONTROL_LIBRARY } from "@/lib/catalog";
import { uniqueSlug } from "@/lib/auth/flow";
import type { TenantType } from "@/lib/db/schema";

const VERIFICATION_CLAIM: Record<string, string> = {
  "CPA firm (SOC)": "AICPA peer review / licensed CPA firm",
  "ISO certification body": "ISO/IEC 17021-1 accreditation",
  "PCI QSA company": "PCI SSC QSA company listing",
  "FedRAMP 3PAO": "FedRAMP 3PAO accreditation (A2LA)",
};

export async function createTenant(ownerId: string, kind: TenantType, name: string, subtype: string | null) {
  const slug = await uniqueSlug(name);
  const [tenant] = await db
    .insert(schema.tenants)
    .values({
      name,
      slug,
      type: kind,
      subtype,
      // Audit firms are usable at once but stay out of the marketplace
      // until a super admin verifies their credentials.
      status: kind === "auditor" ? "pending_verification" : "active",
      plan: kind === "organization" ? "Starter" : kind === "auditor" ? "Firm" : "Partner",
      listed: kind === "provider",
    })
    .returning();
  await db.insert(schema.memberships).values({ tenantId: tenant.id, userId: ownerId, role: "owner" });
  if (kind === "auditor") {
    await db.insert(schema.verifications).values({
      tenantId: tenant.id,
      claim: VERIFICATION_CLAIM[subtype || ""] || "Audit firm credentials",
    });
  }
  return tenant;
}

/** Saves framework choices. For organizations also seeds the shared control library. */
export async function setTenantFrameworks(tenantId: string, kind: TenantType, codes: string[]) {
  const valid = (await db.select({ code: schema.frameworks.code }).from(schema.frameworks)).map((f) => f.code);
  const chosen = codes.filter((c) => valid.includes(c));
  await db.update(schema.tenants).set({ frameworks: chosen, updatedAt: new Date() }).where(eq(schema.tenants.id, tenantId));
  if (kind !== "organization" || chosen.length === 0) return chosen;

  for (const code of chosen) {
    await db.insert(schema.tenantFrameworks).values({ tenantId, frameworkCode: code }).onConflictDoNothing();
  }

  for (const tpl of CONTROL_LIBRARY) {
    const maps = Object.entries(tpl.maps).filter(([fw]) => chosen.includes(fw));
    if (!maps.length) continue;
    const [existing] = await db
      .select({ id: schema.controls.id })
      .from(schema.controls)
      .where(and(eq(schema.controls.tenantId, tenantId), eq(schema.controls.code, tpl.code)));
    const controlId =
      existing?.id ??
      (
        await db
          .insert(schema.controls)
          .values({ tenantId, code: tpl.code, name: tpl.name, testDescription: tpl.test, status: "needs_evidence" })
          .returning({ id: schema.controls.id })
      )[0].id;
    for (const [fw, ref] of maps) {
      await db.insert(schema.controlMappings).values({ controlId, frameworkCode: fw, ref }).onConflictDoNothing();
    }
  }
  return chosen;
}

/** Readiness per framework = passing mapped controls / mapped controls. */
export async function readiness(tenantId: string) {
  const fws = await db
    .select({ code: schema.tenantFrameworks.frameworkCode, milestone: schema.tenantFrameworks.milestone, name: schema.frameworks.name, short: schema.frameworks.shortName })
    .from(schema.tenantFrameworks)
    .innerJoin(schema.frameworks, eq(schema.frameworks.code, schema.tenantFrameworks.frameworkCode))
    .where(eq(schema.tenantFrameworks.tenantId, tenantId));
  if (!fws.length) return [];
  const rows = await db
    .select({ fw: schema.controlMappings.frameworkCode, status: schema.controls.status })
    .from(schema.controlMappings)
    .innerJoin(schema.controls, eq(schema.controls.id, schema.controlMappings.controlId))
    .where(and(eq(schema.controls.tenantId, tenantId), inArray(schema.controlMappings.frameworkCode, fws.map((f) => f.code))));
  return fws.map((f) => {
    const mine = rows.filter((r) => r.fw === f.code);
    const passing = mine.filter((r) => r.status === "passing").length;
    const pct = mine.length ? Math.round((passing / mine.length) * 100) : 0;
    return { ...f, total: mine.length, passing, pct };
  });
}
