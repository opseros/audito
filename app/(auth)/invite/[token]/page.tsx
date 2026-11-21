import Link from "next/link";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { getSession } from "@/lib/auth/session";
import { acceptInviteAction, signOutAction } from "@/app/(auth)/actions";
import { SubmitButton } from "@/components/forms";
import { InviteSignupForm } from "@/components/auth/forms";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { ROLE_LABELS } from "@/lib/permissions";

export const metadata = { title: "Invitation" };

export default async function InvitePage({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> }) {
  const { token } = await params;
  const { error } = await searchParams;
  const [inv] = await db
    .select({ inv: schema.invitations, tenant: schema.tenants })
    .from(schema.invitations)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.invitations.tenantId))
    .where(and(eq(schema.invitations.id, sha256(token)), isNull(schema.invitations.acceptedAt), gt(schema.invitations.expiresAt, new Date())));
  const auth = await getSession();
  const next = encodeURIComponent(`/invite/${token}`);

  return (
    <section className="mx-auto my-10 max-w-[480px] px-6">
      <div className="card flex flex-col gap-4 p-7">
        {!inv ? (
          <>
            <h1 className="text-[26px] font-bold">Invitation not valid</h1>
            <p className="m-0 text-sm text-muted">It may have expired or been used. Ask for a new one.</p>
          </>
        ) : (
          <>
            <h1 className="text-[26px] font-bold">Join {inv.tenant.name}</h1>
            <p className="m-0 text-sm text-muted">
              You were invited as <strong className="text-ink">{ROLE_LABELS[inv.inv.role]}</strong> using {inv.inv.email}.
            </p>
            {error && <p className="m-0 text-sm text-danger">Sign in as {inv.inv.email} to accept.</p>}
            {!auth ? (
              <>
                <OAuthButtons next={`/invite/${token}`} />
                <InviteSignupForm token={token} email={inv.inv.email} />
                <span className="text-[13px] text-muted">
                  Already have an account? <Link className="font-semibold text-org hover:underline" href={`/signin?next=${next}`}>Sign in to accept</Link>
                </span>
              </>
            ) : auth.user.email.toLowerCase() !== inv.inv.email.toLowerCase() ? (
              <>
                <p className="m-0 text-sm text-danger">You are signed in as {auth.user.email}. Switch accounts to accept.</p>
                <form action={signOutAction}><button className="btn">Sign out</button></form>
              </>
            ) : (
              <form action={acceptInviteAction}>
                <input type="hidden" name="token" value={token} />
                <SubmitButton>Accept invitation</SubmitButton>
              </form>
            )}
          </>
        )}
      </div>
    </section>
  );
}
