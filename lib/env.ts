import "server-only";

export const env = {
  appUrl: (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, ""),
  isProd: process.env.NODE_ENV === "production",
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
  },
  microsoft: {
    clientId: process.env.MICROSOFT_CLIENT_ID || "",
    clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "",
    tenant: process.env.MICROSOFT_TENANT_ID || "common",
  },
  turnstileSecret: process.env.TURNSTILE_SECRET_KEY || "",
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "",
  resendKey: process.env.RESEND_API_KEY || "",
  emailFrom: process.env.EMAIL_FROM || "AuditMesh <no-reply@example.com>",
};

export const providersEnabled = {
  google: Boolean(env.google.clientId && env.google.clientSecret),
  microsoft: Boolean(env.microsoft.clientId && env.microsoft.clientSecret),
};

export function authSecret(): Buffer {
  const raw = process.env.AUTH_SECRET;
  if (!raw || raw.length < 32) {
    if (env.isProd) throw new Error("AUTH_SECRET must be set (32+ chars) in production.");
    return Buffer.from("dev-only-insecure-secret-change-me-0000000000", "utf8");
  }
  return Buffer.from(raw, "utf8");
}
