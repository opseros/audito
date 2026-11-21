import "server-only";
import { env } from "@/lib/env";

/** Sends through Resend when configured; otherwise logs the message (dev). */
export async function sendEmail(to: string, subject: string, text: string) {
  if (!env.resendKey) {
    console.info(`[email] to=${to} subject="${subject}"\n${text}`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.resendKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: env.emailFrom, to, subject, text }),
  });
  if (!res.ok) console.error("Email send failed:", res.status, await res.text());
}
