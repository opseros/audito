import "server-only";
import { db, schema } from "@/lib/db";

export type AuditInput = {
  actorUserId?: string | null;
  actorLabel: string;
  actorTenantId?: string | null;
  tenantId?: string | null;
  action: string;
  summary: string;
  detail?: Record<string, unknown>;
  ip?: string | null;
};

export async function audit(entry: AuditInput) {
  try {
    await db.insert(schema.auditLog).values({
      actorUserId: entry.actorUserId ?? null,
      actorLabel: entry.actorLabel,
      actorTenantId: entry.actorTenantId ?? null,
      tenantId: entry.tenantId ?? null,
      action: entry.action,
      summary: entry.summary,
      detail: entry.detail ?? null,
      ip: entry.ip ?? null,
    });
  } catch (error) {
    console.error("audit write failed", error);
  }
}
