"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ActionError, authorizeSuperAdmin } from "@/lib/context";
import { requestMeta, updateSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import type { FormState } from "@/components/forms";

async function adminLog(action: string, summary: string, tenantId?: string | null, detail?: Record<string, unknown>) {
  const ctx = await authorizeSuperAdmin();
  const { ip } = await requestMeta();
  await audit({ actorUserId: ctx.user.id, actorLabel: `${ctx.user.name} (admin)`, tenantId: tenantId ?? null, action, summary, detail, ip });
}

const uuid = (v: FormDataEntryValue | null) => {
  const s = String(v || "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new ActionError("Invalid reference.");
  return s;
};

export async function setTenantStatusAction(form: FormData) {
  await authorizeSuperAdmin();
  const id = uuid(form.get("tenantId"));
  const status = String(form.get("status"));
  if (!["active", "suspended"].includes(status)) return;
  const [t] = await db.update(schema.tenants).set({ status: status as "active", updatedAt: new Date() }).where(eq(schema.tenants.id, id)).returning();
  if (status === "suspended") {
    // Sign members out of the suspended workspace.
    await db.update(schema.sessions).set({ activeTenantId: null, actingTenantId: null }).where(eq(schema.sessions.activeTenantId, id));
    await db.update(schema.sessions).set({ actingTenantId: null }).where(eq(schema.sessions.actingTenantId, id));
  }
  await adminLog(status === "suspended" ? "tenant.suspended" : "tenant.reactivated", `${status === "suspended" ? "suspended" : "reactivated"} ${t?.name}`, id);
  revalidatePath("/admin", "layout");
}

export async function decideVerificationAction(form: FormData) {
  const ctx = await authorizeSuperAdmin();
  const id = uuid(form.get("id"));
  const approve = form.get("decision") === "approve";
  const reason = String(form.get("reason") || "").slice(0, 500) || null;
  const [v] = await db
    .update(schema.verifications)
    .set({ status: approve ? "approved" : "rejected", decidedBy: ctx.user.id, decidedAt: new Date(), reason })
    .where(and(eq(schema.verifications.id, id), eq(schema.verifications.status, "pending")))
    .returning();
  if (!v) return;
  const [t] = await db
    .update(schema.tenants)
    .set(approve ? { status: "active", listed: true, updatedAt: new Date() } : { listed: false, updatedAt: new Date() })
    .where(eq(schema.tenants.id, v.tenantId))
    .returning();
  await adminLog(approve ? "verification.approved" : "verification.rejected", `${approve ? "approved" : "rejected"} ${t?.name} · ${v.claim}`, v.tenantId);
  revalidatePath("/admin", "layout");
}

export async function publishFrameworkAction(form: FormData) {
  await authorizeSuperAdmin();
  const code = String(form.get("code") || "");
  const [f] = await db.update(schema.frameworks).set({ published: true, updatedAt: new Date() }).where(eq(schema.frameworks.code, code)).returning();
  if (f) await adminLog("framework.published", `published ${f.name} ${f.version}`);
  revalidatePath("/admin/frameworks");
}

export async function toggleSettingAction(form: FormData) {
  await authorizeSuperAdmin();
  const key = String(form.get("key") || "");
  const [s] = await db.select().from(schema.platformSettings).where(eq(schema.platformSettings.key, key));
  if (!s) return;
  await db.update(schema.platformSettings).set({ enabled: !s.enabled, updatedAt: new Date() }).where(eq(schema.platformSettings.key, key));
  await adminLog("settings.toggled", `turned ${s.enabled ? "off" : "on"} ${key}`);
  revalidatePath("/admin/settings");
}

export async function startSupportAction(_: FormState, form: FormData): Promise<FormState> {
  let ctx;
  try {
    ctx = await authorizeSuperAdmin();
  } catch {
    return { error: "Super admin only." };
  }
  const tenantId = String(form.get("tenantId") || "");
  const reason = String(form.get("reason") || "").trim().slice(0, 500);
  if (!reason) return { error: "Enter a reason first. It is shown to the tenant." };
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) return { error: "Unknown tenant." };
  const [t] = await db.select().from(schema.tenants).where(eq(schema.tenants.id, tenantId));
  if (!t) return { error: "Unknown tenant." };
  const [s] = await db.insert(schema.supportSessions).values({ adminUserId: ctx.user.id, tenantId, reason }).returning();
  await updateSession({ supportSessionId: s.id, actingTenantId: null });
  await adminLog("support.started", `started read-only support session in ${t.name}: "${reason}"`, tenantId);
  redirect("/app");
}

export async function endSupportAction() {
  const ctx = await authorizeSuperAdmin();
  const auth = ctx.support;
  if (auth) {
    await db.update(schema.supportSessions).set({ endedAt: new Date() }).where(and(eq(schema.supportSessions.id, auth.id), isNull(schema.supportSessions.endedAt)));
    await adminLog("support.ended", `ended support session in ${ctx.tenant?.name}`, ctx.tenant?.id);
  }
  await updateSession({ supportSessionId: null });
  redirect(ctx.tenant ? `/admin/tenants/${ctx.tenant.id}` : "/admin");
}
