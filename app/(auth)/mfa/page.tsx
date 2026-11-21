import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { MfaForm } from "@/components/auth/forms";
import { signOutAction } from "@/app/(auth)/actions";
import { safeNext } from "@/lib/validation";

export const metadata = { title: "Two-step verification" };

export default async function MfaPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const auth = await getSession();
  if (!auth) redirect("/signin");
  if (auth.session.mfaVerified) redirect(safeNext(next));
  return (
    <section className="mx-auto my-10 max-w-[460px] px-6">
      <div className="card flex flex-col gap-4 p-7">
        <h1 className="text-[26px] font-bold">Two-step verification</h1>
        <p className="m-0 text-sm text-muted">Enter the code from your authenticator app for {auth.user.email}.</p>
        <MfaForm next={safeNext(next)} />
        <form action={signOutAction}>
          <button className="lnk text-muted">Cancel and sign out</button>
        </form>
      </div>
    </section>
  );
}
