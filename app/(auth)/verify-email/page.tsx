import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { ResendVerification } from "@/components/auth/forms";
import { signOutAction } from "@/app/(auth)/actions";

export const metadata = { title: "Confirm your email" };

export default async function VerifyEmailPage() {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  if (auth.user.emailVerifiedAt) redirect("/app");
  return (
    <section className="mx-auto my-10 max-w-[460px] px-6">
      <div className="card flex flex-col gap-4 p-7">
        <h1 className="text-[26px] font-bold">Confirm your email</h1>
        <p className="m-0 text-sm leading-relaxed text-muted">
          We sent a link to <strong className="text-ink">{auth.user.email}</strong>. Open it to finish setting up your
          account. The link works for 24 hours.
        </p>
        <ResendVerification />
        <form action={signOutAction}>
          <button className="lnk text-muted">Use a different account</button>
        </form>
      </div>
    </section>
  );
}
