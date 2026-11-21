import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/context";

const HOME = { organization: "/app/overview", auditor: "/app/engagements", provider: "/app/portfolio" } as const;

export default async function AppHome() {
  const ctx = await requireWorkspace();
  redirect(HOME[ctx.tenant.type]);
}
