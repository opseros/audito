import { NextResponse } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { sha256 } from "@/lib/crypto";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") || "";
  const [row] = await db
    .select()
    .from(schema.authTokens)
    .where(
      and(
        eq(schema.authTokens.id, sha256(token)),
        eq(schema.authTokens.kind, "email_verify"),
        isNull(schema.authTokens.usedAt),
        gt(schema.authTokens.expiresAt, new Date())
      )
    );
  if (!row) return NextResponse.redirect(new URL("/verify-email?expired=1", url.origin));
  await db.update(schema.authTokens).set({ usedAt: new Date() }).where(eq(schema.authTokens.id, row.id));
  await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, row.userId));
  await audit({ actorUserId: row.userId, actorLabel: "User", action: "auth.email_verified", summary: "confirmed email address" });
  return NextResponse.redirect(new URL("/app", url.origin));
}
