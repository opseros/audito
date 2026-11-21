import Link from "next/link";
import { SignUpForm } from "@/components/auth/forms";
import { OAuthButtons } from "@/components/auth/oauth-buttons";

export const metadata = { title: "Create your workspace" };

export default async function SignUpPage({ searchParams }: { searchParams: Promise<{ as?: string }> }) {
  const { as } = await searchParams;
  const kind = as === "auditor" || as === "provider" ? as : "organization";
  return (
    <section className="mx-auto mb-16 mt-8 max-w-[560px] px-6">
      <div className="card flex flex-col gap-[18px] p-7">
        <h1 className="text-[26px] font-bold">Create your workspace</h1>
        <OAuthButtons next="/welcome" />
        <SignUpForm initialKind={kind} />
        <span className="text-[13px] text-muted">
          Already have an account?{" "}
          <Link href="/signin" className="font-semibold text-org hover:underline">
            Sign in
          </Link>
        </span>
      </div>
    </section>
  );
}
