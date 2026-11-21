"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { ActionError, authorize, getContext, type AppContext } from "@/lib/context";
import { getSession, requestMeta, updateSession, destroyAllSessions } from "@/lib/auth/session";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { base32, checkTotp, newTotpSecret, openSecret, sealSecret, totpUri } from "@/lib/auth/mfa";
import { audit } from "@/lib/audit";
import { randomToken, sha256 } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { env } from "@/lib/env";
import { loadEngagement, roomCanWrite, roomSide } from "@/lib/engagements";
import { ASSIGNABLE_ROLES, canAssign } from "@/lib/permissions";
import { setTenantFrameworks } from "@/lib/tenants";
import { DEFAULT_REQUEST_LIST } from "@/lib/catalog";
import { emailSchema, passwordSchema } from "@/lib/validation";
import type { FormState } from "@/components/forms";

const MAX_UPLOAD = 10 * 1024 * 1024;

async function guard(fn: () => Promise<FormState | void>): Promise<FormState> {
  try {
    return (await fn()) || { ok: "Saved." };
  } catch (error) {
    if (error instanceof ActionError) {
      const ctx = await getContext();
      if (ctx?.support) {
        await audit({ actorUserId: ctx.user.id, actorLabel: ctx.actorLabel, tenantId: ctx.tenant?.id, action: "support.blocked", summary: "blocked write attempt during support session" });
      }
      return { error: error.message };
    }
    // Next.js redirect() throws; let it through.
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error(error);
    return { error: "Something went wrong. Try again." };
  }
}

async function log(ctx: AppContext, action: string, summary: string, detail?: Record<string, unknown>, tenantId?: string) {
  const { ip } = await requestMeta();
  await audit({
    actorUserId: ctx.user.id,
    actorLabel: ctx.actorLabel,
    actorTenantId: ctx.actingFrom?.id ?? ctx.tenant?.id ?? null,
    tenantId: tenantId ?? ctx.tenant?.id ?? null,
    action,
    summary,
    detail,
    ip,
  });
}

const uuid = (v: FormDataEntryValue | null) => {
  const s = String(v || "");
  if (!/^[0-9a-f-]{36}$/i.test(s)) throw new ActionError("Invalid reference.");
  return s;
};

// ============================================================ workspace switching
export async function switchWorkspaceAction(form: FormData) {
  const ctx = await getContext();
  if (!ctx) redirect("/signin");
  const target = String(form.get("tenantId") || "");
  if (target === "admin" && ctx.user.isSuperAdmin) redirect("/admin");
  if (!ctx.memberships.some((m) => m.tenant.id === target)) redirect("/app");
  await updateSession({ activeTenantId: target, actingTenantId: null, supportSessionId: null });
  redirect("/app");
}

export async function actAsClientAction(form: FormData) {
  const ctx = await getContext();
  if (!ctx?.tenant || ctx.tenant.type !== "provider" || ctx.support) redirect("/app");
  if (ctx.role === "viewer") redirect("/app/portfolio");
  const orgId = uuid(form.get("orgId"));
  const [grant] = await db
    .select()
    .from(schema.providerAccess)
    .where(and(eq(schema.providerAccess.providerTenantId, ctx.tenant.id), eq(schema.providerAccess.orgTenantId, orgId), eq(schema.providerAccess.active, true)));
  if (!grant) redirect("/app/portfolio");
  await updateSession({ actingTenantId: orgId });
  await log(ctx, "provider.enter_client", `entered client workspace`, { orgId }, orgId);
  redirect("/app/overview");
}

export async function stopActingAction() {
  const ctx = await getContext();
  if (ctx?.actingFrom) await log(ctx, "provider.leave_client", "left client workspace");
  await updateSession({ actingTenantId: null });
  redirect("/app/portfolio");
}

// ============================================================ controls & evidence
export async function updateControlAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await authorize("workspace.write");
    const id = uuid(form.get("controlId"));
    const status = String(form.get("status"));
    if (!["passing", "failing", "needs_evidence"].includes(status)) throw new ActionError("Invalid status.");
    const ownerName = String(form.get("ownerName") || "").trim().slice(0, 80) || null;
    const testResult = String(form.get("testResult") || "").trim().slice(0, 500) || null;
    const [row] = await db
      .update(schema.controls)
      .set({ status: status as "passing", ownerName, testResult, updatedAt: new Date() })
      .where(and(eq(schema.controls.id, id), eq(schema.controls.tenantId, ctx.tenant.id)))
      .returning();
    if (!row) throw new ActionError("Control not found.");
    await log(ctx, "control.updated", `set ${row.code} to ${status.replace("_", " ")}`);
    revalidatePath("/app", "layout");
    return { ok: "Control updated." };
  });
}

export async function uploadEvidenceAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await authorize("workspace.write");
    const requestId = String(form.get("requestId") || "");
    const req = requestId ? await requestInScope(ctx, requestId) : null;
    if (requestId && (!req || req.side === "auditor")) throw new ActionError("Only the client or its consultant can attach evidence.");
    // Evidence always belongs to the organization, even when a provider uploads it.
    const ownerTenantId = req ? req.loaded.org.id : ctx.tenant.id;
    const viaProvider = ctx.actingFrom ?? (req?.side === "provider" ? ctx.tenant : null);
    if (!req && ctx.tenant.type !== "organization") throw new ActionError("Evidence belongs to an organization workspace.");
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) throw new ActionError("Choose a file.");
    if (file.size > MAX_UPLOAD) throw new ActionError("Files up to 10 MB.");
    const controlRaw = String(form.get("controlId") || "");
    let controlId: string | null = null;
    if (controlRaw) {
      const [c] = await db.select({ id: schema.controls.id }).from(schema.controls).where(and(eq(schema.controls.id, uuid(controlRaw)), eq(schema.controls.tenantId, ownerTenantId)));
      controlId = c?.id ?? null;
    }
    const name = file.name.replace(/[^\w.\- ()]/g, "_").slice(0, 160) || "evidence";
    const source = viaProvider ? `Uploaded by ${viaProvider.name}` : `Uploaded by ${ctx.user.name}`;
    const [ev] = await db
      .insert(schema.evidence)
      .values({
        tenantId: ownerTenantId,
        controlId,
        name,
        source,
        mime: file.type || "application/octet-stream",
        size: file.size,
        uploadedBy: ctx.user.id,
        onBehalfOfTenantId: viaProvider ? ownerTenantId : null,
        sharedWith: req ? [req.loaded.auditor.name] : [],
      })
      .returning();
    await db.insert(schema.evidenceBlobs).values({ evidenceId: ev.id, data: Buffer.from(await file.arrayBuffer()) });

    if (req) await db.insert(schema.requestEvidence).values({ requestId: req.id, evidenceId: ev.id }).onConflictDoNothing();
    await log(ctx, "evidence.uploaded", `uploaded ${name}`, req ? { engagementId: req.engagementId } : undefined, ownerTenantId);
    revalidatePath("/app", "layout");
    return { ok: `${name} uploaded.` };
  });
}

export async function shareEvidenceAction(form: FormData) {
  const ctx = await authorize("workspace.write");
  const id = uuid(form.get("evidenceId"));
  const firm = String(form.get("firm") || "").slice(0, 120);
  if (!firm) return;
  await db
    .update(schema.evidence)
    .set({ sharedWith: sql`array(select distinct unnest(array_append(${schema.evidence.sharedWith}, ${firm})))` })
    .where(and(eq(schema.evidence.id, id), eq(schema.evidence.tenantId, ctx.tenant.id)));
  await log(ctx, "evidence.shared", `shared evidence with ${firm}`);
  revalidatePath("/app/evidence");
}

export async function setFrameworksAction(form: FormData) {
  const ctx = await authorize("workspace.settings");
  await setTenantFrameworks(ctx.tenant.id, ctx.tenant.type, form.getAll("fw").map(String));
  await log(ctx, "workspace.frameworks", "updated frameworks");
  revalidatePath("/app", "layout");
  redirect("/app/frameworks");
}

// ============================================================ team
export async function inviteMemberAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await authorize("team.manage");
    if (ctx.actingFrom) throw new ActionError("Providers cannot manage a client's team.");
    const email = emailSchema.safeParse(form.get("email"));
    if (!email.success) throw new ActionError("Enter a valid email.");
    const role = String(form.get("role")) as (typeof ASSIGNABLE_ROLES)[number];
    if (!ASSIGNABLE_ROLES.includes(role) || !canAssign(ctx.role, role)) throw new ActionError("You cannot assign that role.");

    const [existing] = await db
      .select({ id: schema.users.id })
      .from(schema.memberships)
      .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
      .where(and(eq(schema.memberships.tenantId, ctx.tenant.id), sql`lower(${schema.users.email}) = ${email.data}`));
    if (existing) throw new ActionError("That person is already a member.");

    const token = randomToken(32);
    await db.insert(schema.invitations).values({
      id: sha256(token),
      tenantId: ctx.tenant.id,
      email: email.data,
      role,
      invitedBy: ctx.user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await sendEmail(
      email.data,
      `${ctx.user.name} invited you to ${ctx.tenant.name} on AuditOps`,
      `Join ${ctx.tenant.name} as ${role}: ${env.appUrl}/invite/${token}\n\nThe link expires in 7 days.`
    );
    await log(ctx, "team.invited", `invited ${email.data} as ${role}`);
    revalidatePath("/app/settings/team");
    return { ok: `Invitation sent to ${email.data}.` };
  });
}

export async function changeRoleAction(form: FormData) {
  const ctx = await authorize("team.manage");
  const userId = uuid(form.get("userId"));
  const role = String(form.get("role")) as (typeof ASSIGNABLE_ROLES)[number];
  if (userId === ctx.user.id) throw new ActionError("You cannot change your own role.");
  if (!ASSIGNABLE_ROLES.includes(role) || !canAssign(ctx.role, role)) throw new ActionError("Not allowed.");
  const [target] = await db.select().from(schema.memberships).where(and(eq(schema.memberships.tenantId, ctx.tenant.id), eq(schema.memberships.userId, userId)));
  if (!target || target.role === "owner") throw new ActionError("Owners cannot be changed here.");
  if (ctx.role === "admin" && target.role === "admin") throw new ActionError("Only the owner can change an admin.");
  await db.update(schema.memberships).set({ role }).where(and(eq(schema.memberships.tenantId, ctx.tenant.id), eq(schema.memberships.userId, userId)));
  await log(ctx, "team.role_changed", `changed a member from ${target.role} to ${role}`, { userId });
  revalidatePath("/app/settings/team");
}

export async function removeMemberAction(form: FormData) {
  const ctx = await authorize("team.manage");
  const userId = uuid(form.get("userId"));
  if (userId === ctx.user.id) throw new ActionError("You cannot remove yourself.");
  const [target] = await db.select().from(schema.memberships).where(and(eq(schema.memberships.tenantId, ctx.tenant.id), eq(schema.memberships.userId, userId)));
  if (!target || target.role === "owner") throw new ActionError("The owner cannot be removed.");
  if (ctx.role === "admin" && target.role === "admin") throw new ActionError("Only the owner can remove an admin.");
  await db.delete(schema.memberships).where(and(eq(schema.memberships.tenantId, ctx.tenant.id), eq(schema.memberships.userId, userId)));
  // End their sessions pointing at this workspace.
  await db.update(schema.sessions).set({ activeTenantId: null }).where(and(eq(schema.sessions.userId, userId), eq(schema.sessions.activeTenantId, ctx.tenant.id)));
  await log(ctx, "team.removed", "removed a member", { userId });
  revalidatePath("/app/settings/team");
}

export async function revokeInviteAction(form: FormData) {
  const ctx = await authorize("team.manage");
  const id = String(form.get("id") || "");
  await db.delete(schema.invitations).where(and(eq(schema.invitations.id, id), eq(schema.invitations.tenantId, ctx.tenant.id)));
  await log(ctx, "team.invite_revoked", "revoked an invitation");
  revalidatePath("/app/settings/team");
}

// ============================================================ provider access
export async function grantProviderAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await authorize("provider.access.grant");
    const providerId = uuid(form.get("providerId"));
    const [p] = await db.select().from(schema.tenants).where(and(eq(schema.tenants.id, providerId), eq(schema.tenants.type, "provider")));
    if (!p) throw new ActionError("Provider not found.");
    await db
      .insert(schema.providerAccess)
      .values({ providerTenantId: p.id, orgTenantId: ctx.tenant.id, grantedBy: ctx.user.id, active: true })
      .onConflictDoUpdate({ target: [schema.providerAccess.providerTenantId, schema.providerAccess.orgTenantId], set: { active: true } });
    await log(ctx, "provider.access_granted", `granted contributor access to ${p.name}`);
    revalidatePath("/app/settings/team");
    return { ok: `${p.name} can now work in your workspace. Every action is logged.` };
  });
}

export async function revokeProviderAction(form: FormData) {
  const ctx = await authorize("provider.access.grant");
  const providerId = uuid(form.get("providerId"));
  await db.update(schema.providerAccess).set({ active: false }).where(and(eq(schema.providerAccess.providerTenantId, providerId), eq(schema.providerAccess.orgTenantId, ctx.tenant.id)));
  await db.update(schema.sessions).set({ actingTenantId: null }).where(eq(schema.sessions.actingTenantId, ctx.tenant.id));
  await log(ctx, "provider.access_revoked", "revoked provider access", { providerId });
  revalidatePath("/app/settings/team");
}

// ============================================================ marketplace
export async function requestProposalAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await authorize("marketplace.request");
    const firmId = uuid(form.get("firmId"));
    const [firm] = await db.select().from(schema.tenants).where(and(eq(schema.tenants.id, firmId), eq(schema.tenants.listed, true), eq(schema.tenants.status, "active")));
    if (!firm) throw new ActionError("Firm not available.");
    const frameworkLabel = String(form.get("framework") || "").slice(0, 80) || "Audit";
    const targetStart = String(form.get("targetStart") || "").slice(0, 7) || null;
    await db.insert(schema.proposalRequests).values({
      orgTenantId: ctx.tenant.id,
      firmTenantId: firm.id,
      frameworkLabel,
      targetStart,
      shareReadiness: form.get("share") === "on",
      createdBy: ctx.user.id,
    });
    await log(ctx, "marketplace.proposal_requested", `requested a proposal from ${firm.name}`);
    revalidatePath("/app/marketplace");
    return { ok: `Proposal requested from ${firm.name}.` };
  });
}

export async function sendProposalAction(form: FormData) {
  const ctx = await authorize("audit.review");
  const id = uuid(form.get("id"));
  await db.update(schema.proposalRequests).set({ status: "Proposal sent" }).where(and(eq(schema.proposalRequests.id, id), eq(schema.proposalRequests.firmTenantId, ctx.tenant.id)));
  await log(ctx, "marketplace.proposal_sent", "sent a proposal");
  revalidatePath("/app/leads");
}

// ============================================================ engagements
export async function createEngagementAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await authorize("engagement.create");
    const orgId = uuid(form.get("orgId"));
    const [org] = await db.select().from(schema.tenants).where(and(eq(schema.tenants.id, orgId), eq(schema.tenants.type, "organization")));
    if (!org) throw new ActionError("Choose a client organization.");
    // Only clients who asked this firm for a proposal, or are already clients.
    const [rel] = await db
      .select({ id: schema.proposalRequests.id })
      .from(schema.proposalRequests)
      .where(and(eq(schema.proposalRequests.orgTenantId, org.id), eq(schema.proposalRequests.firmTenantId, ctx.tenant.id)));
    const [prior] = await db.select({ id: schema.engagements.id }).from(schema.engagements).where(and(eq(schema.engagements.orgTenantId, org.id), eq(schema.engagements.auditorTenantId, ctx.tenant.id)));
    if (!rel && !prior) throw new ActionError("That organization has not engaged your firm.");

    const fw = String(form.get("framework") || "SOC2");
    const title = String(form.get("title") || "").trim().slice(0, 120) || `${fw} audit`;
    const [provider] = await db
      .select({ id: schema.providerAccess.providerTenantId })
      .from(schema.providerAccess)
      .where(and(eq(schema.providerAccess.orgTenantId, org.id), eq(schema.providerAccess.active, true)))
      .limit(1);
    const [eng] = await db
      .insert(schema.engagements)
      .values({
        orgTenantId: org.id,
        auditorTenantId: ctx.tenant.id,
        providerTenantId: provider?.id ?? null,
        frameworkCode: fw,
        title,
        window: String(form.get("window") || "").slice(0, 120) || null,
        phase: 0,
        source: rel ? "Marketplace" : "Direct",
      })
      .returning();
    let i = 0;
    for (const r of DEFAULT_REQUEST_LIST) {
      await db.insert(schema.engagementRequests).values({ engagementId: eng.id, title: r.title, controlRef: r.control, ask: r.ask, position: i++ });
      await db.insert(schema.workpapers).values({ auditorTenantId: ctx.tenant.id, engagementId: eng.id, ref: `WP-${i}`, name: `${r.title} (${r.control})`, preparer: ctx.user.name });
    }
    if (rel) await db.update(schema.proposalRequests).set({ status: "Accepted" }).where(eq(schema.proposalRequests.id, rel.id));
    await log(ctx, "engagement.created", `opened engagement ${title} with ${org.name}`, { engagementId: eng.id });
    await audit({ actorUserId: ctx.user.id, actorLabel: ctx.actorLabel, actorTenantId: ctx.tenant.id, tenantId: org.id, action: "engagement.created", summary: `${ctx.tenant.name} opened ${title}` });
    redirect(`/app/rooms/${eng.id}`);
  });
}

async function requestInScope(ctx: AppContext, requestId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) return null;
  const [req] = await db.select().from(schema.engagementRequests).where(eq(schema.engagementRequests.id, requestId));
  if (!req) return null;
  const loaded = await loadEngagement(req.engagementId);
  if (!loaded) return null;
  const side = await roomSide(ctx, loaded.eng);
  return side ? { ...req, side, loaded } : null;
}

export async function roomAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await getContext();
    if (!ctx?.tenant) throw new ActionError("Sign in again.");
    const auth = await getSession();
    if (!auth?.session.mfaVerified) throw new ActionError("Multi-factor check required.");
    if (!roomCanWrite(ctx)) throw new ActionError(ctx.support ? "Read-only support session. Action blocked and logged." : "Your role is read-only.");

    const req = await requestInScope(ctx, String(form.get("requestId") || ""));
    if (!req) throw new ActionError("Request not found.");
    const intent = String(form.get("intent"));
    const body = String(form.get("body") || "").trim().slice(0, 4000);

    const AUDITOR_ONLY = ["accept", "rework", "finding", "internal"];
    if (AUDITOR_ONLY.includes(intent) && req.side !== "auditor") throw new ActionError("Only the auditor can do that.");
    if (intent === "submit" && req.side === "auditor") throw new ActionError("Auditors review; the client submits.");

    const status =
      intent === "submit" ? "submitted" : intent === "accept" ? "accepted" : intent === "rework" ? "needs_rework" : null;
    const defaults: Record<string, string> = {
      submit: req.side === "provider" ? `Submitted on behalf of ${req.loaded.org.name}.` : "Evidence submitted for review.",
      accept: "Evidence accepted.",
      rework: "Evidence incomplete. Please see note above.",
      reply: "",
      internal: "",
      finding: "",
    };
    const text = body || defaults[intent] || "";

    if (intent === "finding") {
      const sev = String(form.get("severity") || "moderate");
      await db.insert(schema.findings).values({
        engagementId: req.engagementId,
        title: body || `Exception on ${req.title.toLowerCase()}`,
        controlRef: req.controlRef,
        severity: (["low", "moderate", "high"].includes(sev) ? sev : "moderate") as "moderate",
        createdBy: ctx.user.id,
      });
    } else {
      if (!text) throw new ActionError("Write a message first.");
      await db.insert(schema.requestMessages).values({
        requestId: req.id,
        authorUserId: ctx.user.id,
        authorTenantId: req.side === "provider" ? ctx.tenant.id : ctx.actingFrom?.id ?? ctx.tenant.id,
        onBehalfOfTenantId: req.side === "provider" || ctx.actingFrom ? req.loaded.org.id : null,
        body: text,
        internal: intent === "internal",
      });
    }
    if (status) {
      await db.update(schema.engagementRequests).set({ status, updatedAt: new Date() }).where(eq(schema.engagementRequests.id, req.id));
    }
    await log(ctx, `room.${intent}`, `${intent} on "${req.title}"`, { engagementId: req.engagementId }, req.loaded.org.id);
    revalidatePath(`/app/rooms/${req.engagementId}`);
    const done: Record<string, string> = {
      submit: `Submitted to ${req.loaded.auditor.name}.`,
      accept: "Accepted.",
      rework: "Sent back to client.",
      finding: `Finding raised on ${req.controlRef}.`,
      internal: "Internal note saved. Only your firm sees it.",
      reply: "Reply posted.",
    };
    return { ok: done[intent] || "Saved." };
  });
}

export async function drawSampleAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await authorize("audit.review");
    const engId = uuid(form.get("engagementId"));
    const loaded = await loadEngagement(engId);
    if (!loaded || loaded.eng.auditorTenantId !== ctx.tenant.id) throw new ActionError("Engagement not found.");
    const population = Math.max(1, Math.min(100000, parseInt(String(form.get("population") || "0"), 10) || 0));
    const size = Math.max(1, Math.min(60, parseInt(String(form.get("size") || "25"), 10) || 25));
    if (size > population) throw new ActionError("Sample cannot exceed population.");
    const prefix = String(form.get("prefix") || "ITEM").replace(/[^A-Z0-9-]/gi, "").slice(0, 10) || "ITEM";
    const controlRef = String(form.get("controlRef") || "CC8.1").slice(0, 20);
    const seed = (parseInt(randomToken(4).replace(/\D/g, "").slice(0, 6), 10) || 7) % 2147483647;
    // Seeded LCG so the draw is reproducible from the recorded seed.
    let x = seed;
    const out = new Set<number>();
    while (out.size < size) {
      x = (x * 1103515245 + 12345) % 2147483648;
      out.add(1 + (x % population));
    }
    const items = [...out].sort((a, b) => a - b).map((n) => `${prefix}-${n}`);
    await db.insert(schema.samples).values({
      engagementId: engId,
      controlRef,
      populationSize: population,
      method: String(form.get("method") || "Random, seeded").slice(0, 40),
      seed,
      items,
      drawnBy: ctx.user.id,
    });
    await log(ctx, "room.sample_drawn", `drew sample of ${size} from ${population} for ${controlRef}`, { engagementId: engId, seed }, loaded.org.id);
    revalidatePath(`/app/rooms/${engId}`);
    return { ok: `${size} items drawn · seed ${seed} · locked.` };
  });
}

export async function setPhaseAction(form: FormData) {
  const ctx = await authorize("audit.review");
  const engId = uuid(form.get("engagementId"));
  const phase = Math.max(0, Math.min(4, parseInt(String(form.get("phase")), 10) || 0));
  await db.update(schema.engagements).set({ phase }).where(and(eq(schema.engagements.id, engId), eq(schema.engagements.auditorTenantId, ctx.tenant.id)));
  await log(ctx, "engagement.phase", `moved engagement to phase ${phase + 1}`, { engagementId: engId });
  revalidatePath(`/app/rooms/${engId}`);
}

export async function findingResponseAction(form: FormData) {
  const ctx = await authorize("workspace.write");
  const id = uuid(form.get("findingId"));
  const response = String(form.get("response") || "").trim().slice(0, 2000);
  const [f] = await db.select({ f: schema.findings, eng: schema.engagements }).from(schema.findings).innerJoin(schema.engagements, eq(schema.engagements.id, schema.findings.engagementId)).where(eq(schema.findings.id, id));
  if (!f || f.eng.orgTenantId !== ctx.tenant.id || !response) throw new ActionError("Not allowed.");
  await db.update(schema.findings).set({ managementResponse: response, status: "Response received" }).where(eq(schema.findings.id, id));
  await log(ctx, "finding.response", "responded to a finding");
  revalidatePath(`/app/rooms/${f.eng.id}`);
}

export async function signWorkpaperAction(form: FormData) {
  const ctx = await authorize("audit.review");
  const id = uuid(form.get("id"));
  const [wp] = await db.select().from(schema.workpapers).where(and(eq(schema.workpapers.id, id), eq(schema.workpapers.auditorTenantId, ctx.tenant.id)));
  if (!wp) return;
  const signing = !wp.signedOffAt;
  await db
    .update(schema.workpapers)
    .set(signing ? { signedOffBy: ctx.user.id, signedOffAt: new Date() } : { signedOffBy: null, signedOffAt: null })
    .where(eq(schema.workpapers.id, id));
  await log(ctx, signing ? "workpaper.signed" : "workpaper.unsigned", `${signing ? "signed off" : "removed sign-off on"} ${wp.ref}`);
  revalidatePath("/app/workpapers");
}

// ============================================================ security (self)
export async function changePasswordAction(_: FormState, form: FormData) {
  return guard(async () => {
    const auth = await getSession();
    if (!auth) throw new ActionError("Sign in again.");
    const current = String(form.get("current") || "");
    const next = passwordSchema.safeParse(form.get("password"));
    if (!next.success) throw new ActionError(next.error.issues[0].message);
    if (auth.user.passwordHash && !(await verifyPassword(auth.user.passwordHash, current))) throw new ActionError("Current password is wrong.");
    await db.update(schema.users).set({ passwordHash: await hashPassword(next.data), updatedAt: new Date() }).where(eq(schema.users.id, auth.user.id));
    await destroyAllSessions(auth.user.id, true);
    await audit({ actorUserId: auth.user.id, actorLabel: auth.user.name, action: "auth.password_changed", summary: "changed password; other sessions signed out" });
    return { ok: "Password updated. Other devices were signed out." };
  });
}

export async function startMfaSetupAction() {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  if (auth.user.mfaEnabledAt) redirect("/account/security");
  const secret = newTotpSecret();
  await db.update(schema.users).set({ mfaSecret: sealSecret(secret) }).where(eq(schema.users.id, auth.user.id));
  redirect("/account/security?setup=1");
}

export async function confirmMfaAction(_: FormState, form: FormData) {
  return guard(async () => {
    const auth = await getSession();
    if (!auth) throw new ActionError("Sign in again.");
    const secret = openSecret(auth.user.mfaSecret);
    if (!secret) throw new ActionError("Start setup again.");
    if (!checkTotp(secret, String(form.get("code") || ""))) throw new ActionError("Code does not match. Check the time on your phone.");
    await db.update(schema.users).set({ mfaEnabledAt: new Date() }).where(eq(schema.users.id, auth.user.id));
    await updateSession({ mfaVerified: true });
    await audit({ actorUserId: auth.user.id, actorLabel: auth.user.name, action: "auth.mfa_enabled", summary: "turned on two-step verification" });
    redirect("/account/security");
  });
}

export async function disableMfaAction(_: FormState, form: FormData) {
  return guard(async () => {
    const auth = await getSession();
    if (!auth) throw new ActionError("Sign in again.");
    const secret = openSecret(auth.user.mfaSecret);
    if (!secret || !checkTotp(secret, String(form.get("code") || ""))) throw new ActionError("Enter a current code to turn this off.");
    const [req] = await db.select().from(schema.platformSettings).where(eq(schema.platformSettings.key, "require_mfa"));
    if (req?.enabled || auth.user.isSuperAdmin) throw new ActionError("Two-step verification is required for your account.");
    await db.update(schema.users).set({ mfaEnabledAt: null, mfaSecret: null }).where(eq(schema.users.id, auth.user.id));
    await audit({ actorUserId: auth.user.id, actorLabel: auth.user.name, action: "auth.mfa_disabled", summary: "turned off two-step verification" });
    return { ok: "Two-step verification turned off." };
  });
}

export async function signOutOthersAction() {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  await destroyAllSessions(auth.user.id, true);
  await audit({ actorUserId: auth.user.id, actorLabel: auth.user.name, action: "auth.sessions_revoked", summary: "signed out other sessions" });
  revalidatePath("/account/security");
}

export async function updateProfileAction(_: FormState, form: FormData) {
  return guard(async () => {
    const auth = await getSession();
    if (!auth) throw new ActionError("Sign in again.");
    const name = String(form.get("name") || "").trim().slice(0, 120);
    if (!name) throw new ActionError("Name is required.");
    await db.update(schema.users).set({ name, updatedAt: new Date() }).where(eq(schema.users.id, auth.user.id));
    revalidatePath("/app", "layout");
    return { ok: "Profile saved." };
  });
}

export async function updateWorkspaceAction(_: FormState, form: FormData) {
  return guard(async () => {
    const ctx = await authorize("workspace.settings");
    if (ctx.actingFrom) throw new ActionError("Providers cannot change client settings.");
    const name = String(form.get("name") || "").trim().slice(0, 120);
    if (!name) throw new ActionError("Name is required.");
    await db
      .update(schema.tenants)
      .set({
        name,
        location: String(form.get("location") || "").slice(0, 120) || null,
        blurb: String(form.get("blurb") || "").slice(0, 600) || null,
        timeline: String(form.get("timeline") || "").slice(0, 200) || null,
        updatedAt: new Date(),
      })
      .where(eq(schema.tenants.id, ctx.tenant.id));
    await log(ctx, "workspace.updated", "updated workspace profile");
    revalidatePath("/app", "layout");
    return { ok: "Workspace saved." };
  });
}
