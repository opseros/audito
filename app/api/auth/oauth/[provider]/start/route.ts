import { NextResponse } from "next/server";
import { isProvider, providerEnabled, startOAuth } from "@/lib/auth/oauth";
import { safeNext } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const origin = new URL(request.url).origin;
  if (!isProvider(provider) || !providerEnabled(provider)) {
    return NextResponse.redirect(new URL("/signin?error=provider", origin));
  }
  const next = safeNext(new URL(request.url).searchParams.get("next"));
  return NextResponse.redirect(await startOAuth(provider, next));
}
