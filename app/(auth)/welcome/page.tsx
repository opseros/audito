import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { WelcomeForm } from "@/components/auth/forms";
import { signOutAction } from "@/app/(auth)/actions";

export const metadata = { title: "Welcome" };

export default async function WelcomePage() {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  const [m] = await db.select().from(schema.memberships).where(eq(schema.memberships.userId, auth.user.id)).limit(1);
  if (m) redirect("/app");
  return (
    <section className="mx-auto mb-16 mt-8 max-w-[560px] px-6">
      <div className="card flex flex-col gap-4 p-7">
        <h1 className="text-[26px] font-bold">Welcome, {auth.user.name.split(" ")[0]}</h1>
        <p className="m-0 text-sm leading-relaxed text-muted">
          You are not in a workspace yet. If a colleague invited you, open the link in their email. Or create your own:
        </p>
        <WelcomeForm />
        <form action={signOutAction}>
          <button className="lnk text-muted">Sign out</button>
        </form>
      </div>
    </section>
  );
}
