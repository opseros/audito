import { and, eq, or } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getContext } from "@/lib/context";
import { getSession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const auth = await getSession();
  const ctx = await getContext();
  if (!auth?.session.mfaVerified || !ctx?.tenant || !/^[0-9a-f-]{36}$/i.test(id)) return new Response("Not found", { status: 404 });

  const [ev] = await db.select().from(schema.evidence).where(eq(schema.evidence.id, id));
  if (!ev) return new Response("Not found", { status: 404 });

  let allowed = ev.tenantId === ctx.tenant.id;
  if (!allowed) {
    // Auditor or provider on an engagement where this evidence answers a request.
    const [link] = await db
      .select({ id: schema.engagements.id })
      .from(schema.requestEvidence)
      .innerJoin(schema.engagementRequests, eq(schema.engagementRequests.id, schema.requestEvidence.requestId))
      .innerJoin(schema.engagements, eq(schema.engagements.id, schema.engagementRequests.engagementId))
      .where(
        and(
          eq(schema.requestEvidence.evidenceId, ev.id),
          or(eq(schema.engagements.auditorTenantId, ctx.tenant.id), eq(schema.engagements.providerTenantId, ctx.tenant.id))
        )
      );
    allowed = Boolean(link);
  }
  if (!allowed) return new Response("Not found", { status: 404 });

  const [blob] = await db.select().from(schema.evidenceBlobs).where(eq(schema.evidenceBlobs.evidenceId, ev.id));
  if (!blob) return new Response("File not stored", { status: 404 });

  await audit({ actorUserId: ctx.user.id, actorLabel: ctx.actorLabel, actorTenantId: ctx.tenant.id, tenantId: ev.tenantId, action: "evidence.downloaded", summary: `downloaded ${ev.name}` });

  return new Response(new Uint8Array(blob.data), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${ev.name.replace(/"/g, "")}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  });
}
