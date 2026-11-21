"use client";

import {
  changePasswordAction,
  confirmMfaAction,
  createEngagementAction,
  disableMfaAction,
  drawSampleAction,
  grantProviderAction,
  inviteMemberAction,
  requestProposalAction,
  roomAction,
  updateControlAction,
  updateProfileAction,
  updateWorkspaceAction,
  uploadEvidenceAction,
} from "@/app/app/actions";
import { startSupportAction } from "@/app/admin/actions";
import { FormMessage, SubmitButton, useServerForm } from "@/components/forms";

export function ControlForm({ c, disabled }: { c: { id: string; status: string; ownerName: string | null; testResult: string | null }; disabled: boolean }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(updateControlAction);
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="controlId" value={c.id} />
      <label className="lbl">
        Status
        <select name="status" className="input" defaultValue={c.status} disabled={disabled}>
          <option value="passing">Passing</option>
          <option value="failing">Failing</option>
          <option value="needs_evidence">Needs evidence</option>
        </select>
      </label>
      <label className="lbl">
        Owner
        <input name="ownerName" className="input" defaultValue={c.ownerName || ""} disabled={disabled} />
      </label>
      <label className="lbl">
        Latest result
        <textarea name="testResult" rows={2} className="input" defaultValue={c.testResult || ""} disabled={disabled} />
      </label>
      <FormMessage state={state} />
      {!disabled && <SubmitButton pending={pending} variant="secondary" className="self-start">Save control</SubmitButton>}
    </form>
  );
}

export function UploadForm({
  controls,
  controlId,
  requestId,
  accent,
}: {
  controls?: { id: string; code: string; name: string }[];
  controlId?: string;
  requestId?: string;
  accent?: string;
}) {
  const { state, pending, onSubmit, ref, action } = useServerForm(uploadEvidenceAction, { resetOnOk: true });
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-col gap-3">
      {requestId && <input type="hidden" name="requestId" value={requestId} />}
      {controlId ? (
        <input type="hidden" name="controlId" value={controlId} />
      ) : controls ? (
        <label className="lbl">
          Control
          <select name="controlId" className="input" defaultValue="">
            <option value="">Not linked</option>
            {controls.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} · {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <input type="file" name="file" required className="text-sm" />
      <FormMessage state={state} />
      <SubmitButton pending={pending} color={accent} pendingText="Uploading…" className="self-start">
        Upload evidence
      </SubmitButton>
    </form>
  );
}

export function ProposalForm({ firmId, frameworks }: { firmId: string; frameworks: string[] }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(requestProposalAction);
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-col gap-3.5">
      <input type="hidden" name="firmId" value={firmId} />
      <label className="lbl">
        Framework
        <select name="framework" className="input">
          {frameworks.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </label>
      <label className="lbl">
        Target start
        <input name="targetStart" type="month" className="input" />
      </label>
      <label className="flex items-center gap-2 text-[13px] font-medium text-label">
        <input type="checkbox" name="share" defaultChecked /> Share readiness summary with firm
      </label>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Request proposal</SubmitButton>
    </form>
  );
}

export function InviteForm({ roles }: { roles: { value: string; label: string }[] }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(inviteMemberAction, { resetOnOk: true });
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="lbl min-w-[240px] flex-1">
        Email
        <input name="email" type="email" required className="input" placeholder="colleague@company.com" />
      </label>
      <label className="lbl">
        Role
        <select name="role" className="input" defaultValue="member">
          {roles.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton pending={pending}>Send invitation</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function GrantProviderForm({ providers }: { providers: { id: string; name: string }[] }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(grantProviderAction, { resetOnOk: true });
  if (!providers.length) return <p className="m-0 text-sm text-muted">No service providers on AuditMesh yet.</p>;
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="lbl min-w-[240px] flex-1">
        Service provider
        <select name="providerId" className="input">
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton pending={pending} variant="secondary">Grant contributor access</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function RoomReplyForm({
  requestId,
  side,
  canWrite,
  accent,
  replyAs,
}: {
  requestId: string;
  side: "org" | "auditor" | "provider";
  canWrite: boolean;
  accent: string;
  replyAs: string;
}) {
  const { state, pending, onSubmit, ref, action } = useServerForm(roomAction, { resetOnOk: true });
  const buttons: [string, string][] =
    side === "auditor"
      ? [["accept", "Accept evidence"], ["rework", "Request rework"], ["finding", "Raise exception"], ["internal", "Internal note"], ["reply", "Reply only"]]
      : side === "provider"
        ? [["submit", "Submit on client behalf"], ["reply", "Reply only"]]
        : [["submit", "Submit evidence"], ["reply", "Reply only"]];
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="requestId" value={requestId} />
      <label className="lbl" htmlFor="reply">
        Reply as {replyAs}
      </label>
      <textarea id="reply" name="body" rows={3} className="input resize-y" disabled={!canWrite} />
      {side === "auditor" && (
        <label className="lbl w-48">
          Finding severity
          <select name="severity" className="input" defaultValue="moderate">
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </label>
      )}
      <FormMessage state={state} />
      {canWrite ? (
        <div className="flex flex-wrap gap-2.5">
          {buttons.map(([intent, label], i) => (
            <SubmitButton pending={pending} key={intent} name="intent" value={intent} variant={i === 0 ? "primary" : "secondary"} color={i === 0 ? accent : undefined}>
              {label}
            </SubmitButton>
          ))}
        </div>
      ) : (
        <span className="text-sm font-semibold text-muted">Read-only access.</span>
      )}
    </form>
  );
}

export function SampleForm({ engagementId }: { engagementId: string }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(drawSampleAction);
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="engagementId" value={engagementId} />
      <div className="flex flex-wrap items-end gap-3">
        <label className="lbl">
          Control
          <input name="controlRef" className="input w-28" defaultValue="CC8.1" />
        </label>
        <label className="lbl">
          Population size
          <input name="population" type="number" min={1} className="input w-32" defaultValue={412} />
        </label>
        <label className="lbl">
          Item prefix
          <input name="prefix" className="input w-28" defaultValue="CHG" />
        </label>
        <label className="lbl">
          Method
          <select name="method" className="input">
            <option>Random, seeded</option>
            <option>Systematic</option>
          </select>
        </label>
        <label className="lbl">
          Sample size
          <input name="size" type="number" min={1} max={60} className="input w-24" defaultValue={25} />
        </label>
        <SubmitButton pending={pending} color="#0F6B5C">Draw sample and send request</SubmitButton>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function NewEngagementForm({ orgs }: { orgs: { id: string; name: string }[] }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(createEngagementAction);
  if (!orgs.length) return <p className="m-0 text-sm text-muted">Clients appear here after they request a proposal from your firm.</p>;
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="lbl">
        Client
        <select name="orgId" className="input">
          {orgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      <label className="lbl">
        Framework
        <select name="framework" className="input">
          <option value="SOC2">SOC 2</option>
          <option value="SOC1">SOC 1</option>
          <option value="ISO27001">ISO 27001</option>
          <option value="PCI">PCI DSS 4.0</option>
          <option value="HIPAA">HIPAA</option>
          <option value="FEDRAMP">FedRAMP 20x</option>
        </select>
      </label>
      <label className="lbl">
        Title
        <input name="title" className="input" placeholder="SOC 2 Type II · FY26" />
      </label>
      <label className="lbl">
        Period
        <input name="window" className="input" placeholder="Jan 1 – Sep 30" />
      </label>
      <SubmitButton pending={pending} color="#0F6B5C">Open engagement</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(changePasswordAction, { resetOnOk: true });
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-col gap-3">
      {hasPassword && (
        <label className="lbl">
          Current password
          <input name="current" type="password" className="input" required autoComplete="current-password" />
        </label>
      )}
      <label className="lbl">
        New password
        <input name="password" type="password" className="input" required autoComplete="new-password" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pending={pending} variant="secondary" className="self-start">{hasPassword ? "Change password" : "Set a password"}</SubmitButton>
    </form>
  );
}

export function MfaConfirmForm() {
  const { state, pending, onSubmit, ref, action } = useServerForm(confirmMfaAction);
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="lbl">
        Code from your app
        <input name="code" inputMode="numeric" maxLength={7} className="input w-40 tracking-[0.3em]" required />
      </label>
      <SubmitButton pending={pending}>Turn on</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function MfaDisableForm() {
  const { state, pending, onSubmit, ref, action } = useServerForm(disableMfaAction);
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="lbl">
        Current code
        <input name="code" inputMode="numeric" maxLength={7} className="input w-40" required />
      </label>
      <SubmitButton pending={pending} variant="secondary">Turn off</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function ProfileForm({ name }: { name: string }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(updateProfileAction);
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <label className="lbl min-w-[240px] flex-1">
        Your name
        <input name="name" className="input" defaultValue={name} required />
      </label>
      <SubmitButton pending={pending} variant="secondary">Save</SubmitButton>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}

export function WorkspaceForm({ t }: { t: { name: string; location: string | null; blurb: string | null; timeline: string | null; type: string } }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(updateWorkspaceAction);
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="lbl">
        Workspace name
        <input name="name" className="input" defaultValue={t.name} required />
      </label>
      {t.type !== "organization" && (
        <>
          <label className="lbl">
            Location
            <input name="location" className="input" defaultValue={t.location || ""} />
          </label>
          <label className="lbl">
            Marketplace description
            <textarea name="blurb" rows={3} className="input" defaultValue={t.blurb || ""} />
          </label>
          <label className="lbl">
            Typical timeline
            <input name="timeline" className="input" defaultValue={t.timeline || ""} />
          </label>
        </>
      )}
      <FormMessage state={state} />
      <SubmitButton pending={pending} variant="secondary" className="self-start">Save workspace</SubmitButton>
    </form>
  );
}

export function SupportForm({ tenantId }: { tenantId: string }) {
  const { state, pending, onSubmit, ref, action } = useServerForm(startSupportAction);
  return (
    <form ref={ref} action={action} onSubmit={onSubmit} className="flex flex-col gap-3">
      <input type="hidden" name="tenantId" value={tenantId} />
      <label className="lbl" htmlFor="support-reason">
        Reason
      </label>
      <textarea id="support-reason" name="reason" rows={3} className="input" placeholder="Ticket #, what you need to check" />
      <FormMessage state={state} />
      <SubmitButton pending={pending} color="#6D28D9">Start support session</SubmitButton>
    </form>
  );
}
