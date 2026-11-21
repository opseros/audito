import { db, schema } from "@/lib/db";
import { toggleSettingAction } from "@/app/admin/actions";
import { PageTitle } from "@/components/ui";

export const metadata = { title: "Platform settings" };

const META: Record<string, { name: string; desc: string; live: boolean }> = {
  open_signup: { name: "Open sign-up", desc: "Anyone can create an organization, audit firm or provider workspace. Off = invitation only.", live: true },
  require_mfa: { name: "Require MFA for every user", desc: "Users without two-step verification are sent to set it up before using the app.", live: true },
  independence_check: { name: "Independence conflict check", desc: "Block one firm acting as both auditor and consultant on the same scope.", live: false },
  support_consent: { name: "Support access needs tenant consent", desc: "Admins must get approval from a tenant admin before a support session starts.", live: false },
  data_residency: { name: "EU and India data residency", desc: "Store tenant data in region chosen at sign-up.", live: false },
  ai_drafts: { name: "AI-drafted responses (beta)", desc: "Let organizations draft request replies with AI. Auditors always see that a reply was AI-drafted.", live: false },
};

export default async function SettingsPage() {
  const rows = await db.select().from(schema.platformSettings);
  return (
    <>
      <PageTitle title="Platform settings" />
      <div className="flex max-w-[900px] flex-col gap-3">
        {rows.map((s) => {
          const m = META[s.key] || { name: s.key, desc: "", live: false };
          return (
            <div key={s.key} className="card flex flex-wrap items-center gap-4">
              <div className="flex flex-[1_1_380px] flex-col gap-1">
                <span className="font-bold">{m.name}{!m.live && <span className="pill ml-2 bg-hair align-middle text-muted">Coming soon</span>}</span>
                <span className="text-[13px] leading-normal text-muted">{m.desc}</span>
              </div>
              <form action={toggleSettingAction}>
                <input type="hidden" name="key" value={s.key} />
                <button
                  role="switch"
                  aria-checked={s.enabled}
                  aria-label={m.name}
                  disabled={!m.live}
                  className={`flex h-[30px] w-[52px] flex-none rounded-full border-0 p-[3px] disabled:opacity-50 ${s.enabled ? "justify-end bg-admin" : "justify-start bg-slate-400"}`}
                >
                  <span className="block h-6 w-6 rounded-full bg-white" />
                </button>
              </form>
            </div>
          );
        })}
      </div>
    </>
  );
}
