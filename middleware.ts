import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge gate: only checks that a session cookie exists. The session itself is
 * validated against Neon in server components and actions (lib/context.ts),
 * which run on the Node runtime.
 */
const PROTECTED = ["/app", "/admin", "/account", "/onboarding", "/welcome", "/mfa", "/verify-email"];

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const needsSession = PROTECTED.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (pathname.startsWith("/verify-email/confirm")) return NextResponse.next();
  if (needsSession && !request.cookies.get("am_session")) {
    const url = request.nextUrl.clone();
    url.pathname = "/signin";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|ico|txt)$).*)"],
};
