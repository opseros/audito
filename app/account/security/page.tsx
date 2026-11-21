import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireAccount } from "@/lib/context";
import { base32, openSecret, totpUri } from "@/lib/auth/mfa";
import { providersEnabled } from "@/lib/env";
import { signOutOthersAction, startMfaSetupAction } from "@/app/app/actions";
import { Card, PageTitle } from "@/components/ui";
import { MfaConfirmForm, MfaDisableForm, PasswordForm, ProfileForm } from "@/components/app/forms";

export const metadata = { title: "Security" };

export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ setup?: string; mfa?: string }> }) {
  const ctx = await requireAccount();
  const sp = await searchParams;
  const u = ctx.user;
  const linked = await db.select().from(schema.oauthAccounts).where(eq(schema.oauthAccounts.userId, u.id));
  const sessions = await db.select().from(schema.sessions).where(eq(schema.sessions.userId, u.id)).orderBy(desc(schema.sessions.createdAt));
  const pendingSecret = !u.mfaEnabledAt && sp.setup ? openSecret(u.mfaSecret) : null;

  return (
    <>
      <PageTitle title="Security" />
      {sp.mfa === "required" && (
        <div className="rounded-lg border border-warn/20 bg-warn-tint p-3 text-sm text-warn">Turn on two-step verification to continue.</div>
      )}

      <Card className="max-w-2xl">
        <h2 className="mb-3 text-base font-bold">Profile</h2>
        <ProfileForm name={u.name} />
        <p className="mb-0 mt-3 text-xs text-muted">Email: {u.email}</p>
      </Card>

      <Card className="flex max-w-2xl flex-col gap-3">
        <h2 className="text-base font-bold">Two-step verification</h2>
        {u.mfaEnabledAt ? (
          <>
            <p className="m-0 text-sm text-auditor-ink">On since {u.mfaEnabledAt.toLocaleDateString("en-GB")}.</p>
            <MfaDisableForm />
          </>
        ) : pendingSecret ? (
          <>
            <p className="m-0 text-sm text-muted">Add this key to Google Authenticator, 1Password, Authy or similar, then enter the 6-digit code.</p>
            <code className="select-all break-all rounded-lg bg-hair p-3 text-sm">{base32(pendingSecret)}</code>
            <a href={totpUri(u.email, pendingSecret)} className="text-sm font-semibold text-org hover:underline">Open in authenticator app</a>
            <MfaConfirmForm />
          </>
        ) : (
          <>
            <p className="m-0 text-sm text-muted">Protect your account with a code from an authenticator app at sign-in.</p>
            <form action={startMfaSetupAction}><button className="btnp">Set up</button></form>
          </>
        )}
      </Card>

      <Card className="flex max-w-2xl flex-col gap-3">
        <h2 className="text-base font-bold">Password</h2>
        {!u.passwordHash && <p className="m-0 text-sm text-muted">You sign in with {linked.map((l) => l.provider).join(" / ") || "a provider"}. You can also set a password.</p>}
        <PasswordForm hasPassword={Boolean(u.passwordHash)} />
      </Card>

      <Card className="flex max-w-2xl flex-col gap-2">
        <h2 className="text-base font-bold">Connected sign-in</h2>
        {(["google", "microsoft"] as const).map((p) => {
          const l = linked.find((x) => x.provider === p);
          return (
            <div key={p} className="flex items-center justify-between border-b border-hair py-2 text-sm">
              <span className="font-semibold capitalize">{p}</span>
              {l ? (
                <span className="text-muted">Linked · {l.email}</span>
              ) : providersEnabled[p] ? (
                <a href={`/api/auth/oauth/${p}/start?next=/account/security`} className="btn btn-sm">Link</a>
              ) : (
                <span className="text-muted">Not enabled</span>
              )}
            </div>
          );
        })}
        <span className="text-xs text-muted">Linking works when the provider account uses the same verified email.</span>
      </Card>

      <Card className="flex max-w-2xl flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Sessions</h2>
          <form action={signOutOthersAction}><button className="btn btn-sm">Sign out other sessions</button></form>
        </div>
        {sessions.map((s) => (
          <div key={s.id} className="flex flex-wrap justify-between gap-2 border-b border-hair py-2 text-[13px]">
            <span className="max-w-[420px] truncate">{s.userAgent || "Unknown device"}</span>
            <span className="text-muted">{s.ip || ""} · {s.createdAt.toLocaleDateString("en-GB")}{s.id === ctx.sessionId ? " · this device" : ""}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
