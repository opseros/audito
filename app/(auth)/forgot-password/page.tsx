import Link from "next/link";
import { ForgotForm } from "@/components/auth/forms";

export const metadata = { title: "Reset password" };

export default function ForgotPage() {
  return (
    <section className="mx-auto my-10 max-w-[460px] px-6">
      <div className="card flex flex-col gap-4 p-7">
        <Link href="/signin" className="text-sm font-semibold text-org hover:underline">← Back to sign in</Link>
        <h1 className="text-[26px] font-bold">Reset your password</h1>
        <p className="m-0 text-sm text-muted">We will email you a link that works for one hour.</p>
        <ForgotForm />
        <p className="m-0 text-xs text-muted">Signed up with Google or Microsoft? Use that button on the sign-in page instead.</p>
      </div>
    </section>
  );
}
