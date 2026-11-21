"use client";

import { useFormStatus } from "react-dom";
import { startTransition, useActionState, useEffect, useRef, type FormEvent, type ReactNode } from "react";
import { cx } from "@/components/ui";

export type FormState = { error?: string; ok?: string } | undefined;

/**
 * React 19 resets a <form action={fn}> after every submission, wiping what
 * the user typed when the server returns a validation error. This hook
 * submits through onSubmit instead, so fields survive errors, and resets
 * the form only on success when asked.
 */
export function useServerForm(
  action: (state: FormState, form: FormData) => Promise<FormState>,
  opts: { resetOnOk?: boolean } = {}
) {
  const [state, dispatch, pending] = useActionState(action, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (opts.resetOnOk && state?.ok) ref.current?.reset();
  }, [state, opts.resetOnOk]);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };
  // `action` keeps the form working before hydration (progressive enhancement,
  // and no GET fallback that would put field values in the URL). After
  // hydration onSubmit runs first and prevents the reset-on-submit behaviour.
  return { state, pending, onSubmit, ref, action: dispatch };
}

export function SubmitButton({
  children,
  pendingText,
  className,
  variant = "primary",
  color,
  disabled,
  name,
  value,
  pending: pendingProp,
}: {
  children: ReactNode;
  pendingText?: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
  color?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <button
      type="submit"
      name={name}
      value={value}
      disabled={pending || disabled}
      className={cx(variant === "primary" ? "btnp" : variant === "danger" ? "btnp bg-danger" : "btn", className)}
      style={variant === "primary" && color ? { background: color } : undefined}
    >
      {pending ? pendingText || "Working…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state?.error && !state?.ok) return null;
  return (
    <div
      role={state.error ? "alert" : "status"}
      className={cx(
        "rounded-lg border p-3 text-sm",
        state.error ? "border-danger/20 bg-danger-tint text-danger" : "border-auditor/20 bg-auditor-tint text-auditor-ink"
      )}
    >
      {state.error || state.ok}
    </div>
  );
}
