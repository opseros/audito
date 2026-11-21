import "server-only";
import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db, schema } from "@/lib/db";
import type { AppContext } from "@/lib/context";

export type RoomSide = "org" | "auditor" | "provider";

const orgT = alias(schema.tenants, "org_t");
const audT = alias(schema.tenants, "aud_t");
const proT = alias(schema.tenants, "pro_t");

export async function loadEngagement(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [row] = await db
    .select({ eng: schema.engagements, org: orgT, auditor: audT, provider: proT })
    .from(schema.engagements)
    .innerJoin(orgT, eq(orgT.id, schema.engagements.orgTenantId))
    .innerJoin(audT, eq(audT.id, schema.engagements.auditorTenantId))
    .leftJoin(proT, eq(proT.id, schema.engagements.providerTenantId))
    .where(eq(schema.engagements.id, id));
  return row ?? null;
}

/** Which party the current workspace is in this engagement, or null (no access). */
export async function roomSide(ctx: AppContext, eng: typeof schema.engagements.$inferSelect): Promise<RoomSide | null> {
  const t = ctx.tenant;
  if (!t) return null;
  if (t.id === eng.auditorTenantId) return "auditor";
  if (t.id === eng.orgTenantId) return "org";
  if (t.type === "provider" && t.id === eng.providerTenantId) {
    const [grant] = await db
      .select()
      .from(schema.providerAccess)
      .where(
        and(
          eq(schema.providerAccess.providerTenantId, t.id),
          eq(schema.providerAccess.orgTenantId, eng.orgTenantId),
          eq(schema.providerAccess.active, true)
        )
      );
    return grant ? "provider" : null;
  }
  return null;
}

/** May this context write in the room (reply, submit, review)? */
export function roomCanWrite(ctx: AppContext) {
  return !ctx.readOnly && ctx.role !== null && ctx.role !== "viewer" && ctx.role !== "support";
}
