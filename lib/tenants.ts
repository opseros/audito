import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
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

export type Readiness = { code: string; milestone: string | null; name: string; short: string; total: number; passing: number; pct: number };

/** Readiness for many tenants in one round trip: passing mapped controls / mapped controls. */
export async function readinessMany(tenantIds: string[]): Promise<Map<string, Readiness[]>> {
  const out = new Map<string, Readiness[]>();
  if (!tenantIds.length) return out;
  const rows = await db
    .select({
      tenantId: schema.tenantFrameworks.tenantId,
      code: schema.tenantFrameworks.frameworkCode,
      milestone: schema.tenantFrameworks.milestone,
      name: schema.frameworks.name,
      short: schema.frameworks.shortName,
      total: sql<number>`count(${schema.controls.id})`.mapWith(Number),
      passing: sql<number>`count(${schema.controls.id}) filter (where ${schema.controls.status} = 'passing')`.mapWith(Number),
    })
    .from(schema.tenantFrameworks)
    .innerJoin(schema.frameworks, eq(schema.frameworks.code, schema.tenantFrameworks.frameworkCode))
    .leftJoin(schema.controlMappings, eq(schema.controlMappings.frameworkCode, schema.tenantFrameworks.frameworkCode))
    .leftJoin(
      schema.controls,
      and(eq(schema.controls.id, schema.controlMappings.controlId), eq(schema.controls.tenantId, schema.tenantFrameworks.tenantId))
    )
    .where(inArray(schema.tenantFrameworks.tenantId, tenantIds))
    .groupBy(
      schema.tenantFrameworks.tenantId,
      schema.tenantFrameworks.frameworkCode,
      schema.tenantFrameworks.milestone,
      schema.frameworks.name,
      schema.frameworks.shortName
    )
    .orderBy(schema.tenantFrameworks.frameworkCode);
  for (const r of rows) {
    const list = out.get(r.tenantId) ?? [];
    list.push({ code: r.code, milestone: r.milestone, name: r.name, short: r.short, total: r.total, passing: r.passing, pct: r.total ? Math.round((r.passing / r.total) * 100) : 0 });
    out.set(r.tenantId, list);
  }
  return out;
}

export async function readiness(tenantId: string) {
  return (await readinessMany([tenantId])).get(tenantId) ?? [];
}
