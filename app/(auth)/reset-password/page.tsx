import { ResetForm } from "@/components/auth/forms";

export const metadata = { title: "Choose a new password" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <section className="mx-auto my-10 max-w-[460px] px-6">
      <div className="card flex flex-col gap-4 p-7">
        <h1 className="text-[26px] font-bold">Choose a new password</h1>
        {token ? <ResetForm token={token} /> : <p className="text-sm text-danger">This link is incomplete. Request a new one.</p>}
        <p className="m-0 text-xs text-muted">Every device signed in to your account will be signed out.</p>
      </div>
    </section>
  );
}
