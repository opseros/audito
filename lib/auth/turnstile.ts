import "server-only";
import { env } from "@/lib/env";

export function turnstileEnabled() {
  return Boolean(env.turnstileSiteKey);
}

/** Verifies a Cloudflare Turnstile token. Fails closed when misconfigured. */
export async function verifyTurnstile(token: FormDataEntryValue | null, ip: string | null, action: string) {
  if (!turnstileEnabled()) return true;
  if (typeof token !== "string" || !token || token.length > 2048) return false;
  if (!env.turnstileSecret) {
    console.error("TURNSTILE_SECRET_KEY missing; rejecting.");
    return false;
  }
  const body = new URLSearchParams({ secret: env.turnstileSecret, response: token });
  if (ip) body.set("remoteip", ip);
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as { success: boolean; action?: string };
    return data.success && (!data.action || data.action === action);
  } catch (error) {
    console.error("Turnstile verification failed:", error);
    return false;
  }
}
