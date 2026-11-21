"use client";

import Link from "next/link";
import { useState } from "react";
import {
  acceptInviteNewUserAction,
  createWorkspaceAction,
  forgotPasswordAction,
  mfaAction,
  resendVerificationAction,
  resetPasswordAction,
  signInAction,
  signUpAction,
} from "@/app/(auth)/actions";
import { FormMessage, SubmitButton, useServerForm } from "@/components/forms";
import { Turnstile } from "@/components/auth/turnstile";
import { cx } from "@/components/ui";
import { PASSWORD_MIN, SIGNUP_COPY } from "@/lib/validation";

const KIND_COLOR = { organization: "#2B4ACB", auditor: "#0F6B5C", provider: "#B4500F" } as const;
type Kind = keyof typeof KIND_COLOR;

export function SignInForm({ next, notice }: { next?: string; notice?: string }) {
  const { state, pending, onSubmit, ref } = useServerForm(signInAction);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next || ""} />
      {notice && !state && <FormMessage state={{ ok: notice }} />}
      <label className="lbl">
        Work email
        <input className="input" type="email" name="email" required autoComplete="email" placeholder="you@company.com" />
      </label>
      <label className="lbl">
        <span className="flex justify-between">
          Password
          <Link href="/forgot-password" className="text-xs font-semibold text-org hover:underline">
            Forgot password?
          </Link>
        </span>
        <input className="input" type="password" name="password" required autoComplete="current-password" />
      </label>
      <Turnstile action="signin" resetKey={state} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Signing in…">Continue</SubmitButton>
    </form>
  );
}

export function SignUpForm({ initialKind }: { initialKind: Kind }) {
  const [kind, setKind] = useState<Kind>(initialKind);
  const { state, pending, onSubmit, ref } = useServerForm(signUpAction);
  const copy = SIGNUP_COPY[kind];
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-[18px]">
      <div className="flex flex-col gap-2">
        <span className="text-[13px] font-semibold text-label">I am joining as</span>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(SIGNUP_COPY) as Kind[]).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              aria-pressed={kind === k}
              className={cx(
                "min-h-10 rounded-full border px-4 text-sm font-semibold",
                kind === k ? "border-transparent text-white" : "border-field bg-white text-label"
              )}
              style={kind === k ? { background: KIND_COLOR[k] } : undefined}
            >
              {SIGNUP_COPY[k].label}
            </button>
          ))}
        </div>
      </div>
      <input type="hidden" name="kind" value={kind} />
      <label className="lbl">
        {copy.nameLabel}
        <input className="input" name="orgName" required placeholder={copy.namePh} />
      </label>
      <label className="lbl">
        {copy.extraLabel}
        <select className="input" name="extra" key={kind} defaultValue={copy.extraOpts[0]}>
          {copy.extraOpts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <label className="lbl">
        Your name
        <input className="input" name="fullName" required autoComplete="name" />
      </label>
      <label className="lbl">
        Work email
        <input className="input" type="email" name="email" required autoComplete="email" placeholder="you@company.com" />
      </label>
      <label className="lbl">
        Password
        <input className="input" type="password" name="password" required minLength={PASSWORD_MIN} autoComplete="new-password" />
        <span className="text-xs font-normal text-muted">
          {PASSWORD_MIN}+ characters with three of: lowercase, uppercase, number, symbol.
        </span>
      </label>
      <Turnstile action="signup" resetKey={state} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} color={KIND_COLOR[kind]} pendingText="Creating workspace…">
        Continue
      </SubmitButton>
    </form>
  );
}

export function WelcomeForm() {
  const [kind, setKind] = useState<Kind>("organization");
  const { state, pending, onSubmit, ref } = useServerForm(createWorkspaceAction);
  const copy = SIGNUP_COPY[kind];
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(SIGNUP_COPY) as Kind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind(k)}
            className={cx("min-h-10 rounded-full border px-4 text-sm font-semibold", kind === k ? "border-transparent text-white" : "border-field bg-white text-label")}
            style={kind === k ? { background: KIND_COLOR[k] } : undefined}
          >
            {SIGNUP_COPY[k].label}
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={kind} />
      <label className="lbl">
        {copy.nameLabel}
        <input className="input" name="orgName" required placeholder={copy.namePh} />
      </label>
      <label className="lbl">
        {copy.extraLabel}
        <select className="input" name="extra" key={kind} defaultValue={copy.extraOpts[0]}>
          {copy.extraOpts.map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      </label>
      <FormMessage state={state} />
      <SubmitButton pending={pending} color={KIND_COLOR[kind]}>Create workspace</SubmitButton>
    </form>
  );
}

export function ForgotForm() {
  const { state, pending, onSubmit, ref } = useServerForm(forgotPasswordAction);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="lbl">
        Work email
        <input className="input" type="email" name="email" required autoComplete="email" />
      </label>
      <Turnstile action="forgot" resetKey={state} />
      <FormMessage state={state} />
      <SubmitButton pending={pending} pendingText="Sending…">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetForm({ token }: { token: string }) {
  const { state, pending, onSubmit, ref } = useServerForm(resetPasswordAction);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="lbl">
        New password
        <input className="input" type="password" name="password" required minLength={PASSWORD_MIN} autoComplete="new-password" />
      </label>
      <label className="lbl">
        Confirm password
        <input className="input" type="password" name="confirm" required autoComplete="new-password" />
      </label>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Set password</SubmitButton>
    </form>
  );
}

export function MfaForm({ next }: { next: string }) {
  const { state, pending, onSubmit, ref } = useServerForm(mfaAction);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next} />
      <label className="lbl">
        6-digit code
        <input className="input text-lg tracking-[0.3em]" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required autoFocus />
      </label>
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Verify</SubmitButton>
    </form>
  );
}

export function ResendVerification() {
  const { state, pending, onSubmit, ref } = useServerForm(resendVerificationAction);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <SubmitButton pending={pending} variant="secondary">Resend email</SubmitButton>
    </form>
  );
}

export function InviteSignupForm({ token, email }: { token: string; email: string }) {
  const { state, pending, onSubmit, ref } = useServerForm(acceptInviteNewUserAction);
  return (
    <form ref={ref} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      <label className="lbl">
        Email
        <input className="input bg-hair" value={email} readOnly />
      </label>
      <label className="lbl">
        Your name
        <input className="input" name="fullName" required autoComplete="name" />
      </label>
      <label className="lbl">
        Password
        <input className="input" type="password" name="password" required minLength={PASSWORD_MIN} autoComplete="new-password" />
      </label>
      <Turnstile action="invite" resetKey={state} />
      <FormMessage state={state} />
      <SubmitButton pending={pending}>Create account and join</SubmitButton>
    </form>
  );
}
