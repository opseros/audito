import Link from "next/link";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/forms";
import { OAuthButtons } from "@/components/auth/oauth-buttons";
import { getSession } from "@/lib/auth/session";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  oauth: "Sign-in with that provider failed. Try again.",
  cancelled: "Sign-in was cancelled.",
  provider: "That sign-in method is not enabled.",
  email_missing: "Your provider did not share an email address.",
  unverified_link: "An account with this email exists. Sign in with your password first, then link the provider in Security settings.",
  suspended: "This account is suspended.",
  server: "Sign-in could not be completed because of a server problem. Try again shortly.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const auth = await getSession();
  if (auth?.session.mfaVerified) redirect(safeNext(sp.next));
  const notice = sp.reset ? "Password updated. Sign in with your new password." : sp.error ? undefined : undefined;

  return (
    <section className="mx-auto my-10 flex max-w-[460px] flex-col gap-5 px-6">
      <div className="card flex flex-col gap-4 p-7">
        <h1 className="text-[26px] font-bold">Sign in</h1>
        {sp.error && (
          <div role="alert" className="rounded-lg border border-danger/20 bg-danger-tint p-3 text-sm text-danger">
            {ERRORS[sp.error] || "Sign-in failed."}
          </div>
        )}
        <OAuthButtons next={sp.next} />
        <SignInForm next={sp.next} notice={notice} />
        <span className="text-[13px] text-muted">
          New to AuditOps?{" "}
          <Link href="/signup" className="font-semibold text-org hover:underline">
            Create a workspace
          </Link>
        </span>
      </div>
      <p className="text-center text-xs text-muted">Super admin accounts are created by AuditOps only, never through sign-up.</p>
    </section>
  );
}
