import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import { finishOnboardingAction } from "@/app/(auth)/actions";
import { FRAMEWORK_LABELS, SIGNUP_COPY } from "@/lib/validation";
import { SubmitButton } from "@/components/forms";

export const metadata = { title: "Set up frameworks" };
const COLOR = { organization: "#2B4ACB", auditor: "#0F6B5C", provider: "#B4500F" } as const;

export default async function OnboardingPage() {
  const auth = await getSession();
  if (!auth) redirect("/signin");
  const [m] = await db
    .select({ tenant: schema.tenants })
    .from(schema.memberships)
    .innerJoin(schema.tenants, eq(schema.tenants.id, schema.memberships.tenantId))
    .where(and(eq(schema.memberships.userId, auth.user.id), eq(schema.memberships.tenantId, auth.session.activeTenantId ?? "")));
  if (!m) redirect("/welcome");
  const copy = SIGNUP_COPY[m.tenant.type];
  const preset = m.tenant.type === "organization" ? ["SOC2", "ISO27001"] : [];

  return (
    <section className="mx-auto mb-16 mt-8 max-w-[720px] px-6">
      <form action={finishOnboardingAction} className="card flex flex-col gap-5 p-7">
        <span className="text-[13px] font-semibold text-muted">Step 2 of 2 · {m.tenant.name}</span>
        <h1 className="text-[26px] font-bold">{copy.obTitle}</h1>
        <span className="text-[15px] text-muted">{copy.obSub}</span>
        <div className="flex flex-wrap gap-2.5">
          {copy.obOpts.map((code) => (
            <label key={code} className="cursor-pointer">
              <input type="checkbox" name="fw" value={code} defaultChecked={preset.includes(code)} className="peer sr-only" />
              <span className="inline-flex min-h-10 items-center rounded-full border border-field bg-white px-4 text-sm font-semibold text-label peer-checked:border-transparent peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2">
                {FRAMEWORK_LABELS[code]}
              </span>
            </label>
          ))}
        </div>
        {!auth.user.emailVerifiedAt && (
          <span className="text-sm text-label">We sent a confirmation link to {auth.user.email}. Confirm it to open your workspace.</span>
        )}
        <div className="flex flex-wrap gap-3">
          <SubmitButton color={COLOR[m.tenant.type]} pendingText="Setting up…">
            Create workspace
          </SubmitButton>
        </div>
      </form>
    </section>
  );
}
