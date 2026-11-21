import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { decrypt, encrypt, randomToken } from "@/lib/crypto";
import { env, providersEnabled } from "@/lib/env";

export type OAuthProvider = "google" | "microsoft";
export const OAUTH_PROVIDERS: OAuthProvider[] = ["google", "microsoft"];
const STATE_COOKIE = "am_oauth";

type ProviderConfig = {
  authorizeUrl: string;
  tokenUrl: string;
  clientId: string;
  clientSecret: string;
  scopes: string;
};

function config(provider: OAuthProvider): ProviderConfig {
  if (provider === "google") {
    return {
      authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenUrl: "https://oauth2.googleapis.com/token",
      clientId: env.google.clientId,
      clientSecret: env.google.clientSecret,
      scopes: "openid email profile",
    };
  }
  const tenant = encodeURIComponent(env.microsoft.tenant);
  return {
    authorizeUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
    tokenUrl: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    clientId: env.microsoft.clientId,
    clientSecret: env.microsoft.clientSecret,
    scopes: "openid email profile",
  };
}

export function isProvider(value: string): value is OAuthProvider {
  return (OAUTH_PROVIDERS as string[]).includes(value);
}

export function providerEnabled(provider: OAuthProvider) {
  return providersEnabled[provider];
}

function redirectUri(provider: OAuthProvider) {
  return `${env.appUrl}/api/auth/oauth/${provider}/callback`;
}

type StatePayload = {
  provider: OAuthProvider;
  state: string;
  verifier: string;
  nonce: string;
  next: string;
  exp: number;
};

/** Builds the provider URL and stores state + PKCE verifier + nonce in an encrypted cookie. */
export async function startOAuth(provider: OAuthProvider, next: string) {
  const c = config(provider);
  const payload: StatePayload = {
    provider,
    state: randomToken(24),
    verifier: randomToken(48),
    nonce: randomToken(24),
    next,
    exp: Date.now() + 10 * 60 * 1000,
  };
  (await cookies()).set(STATE_COOKIE, encrypt(JSON.stringify(payload), "oauth-state"), {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax",
    path: "/api/auth/oauth",
    maxAge: 600,
  });

  const challenge = createHash("sha256").update(payload.verifier).digest("base64url");
  const url = new URL(c.authorizeUrl);
  url.searchParams.set("client_id", c.clientId);
  url.searchParams.set("redirect_uri", redirectUri(provider));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", c.scopes);
  url.searchParams.set("state", payload.state);
  url.searchParams.set("nonce", payload.nonce);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("prompt", "select_account");
  return url.toString();
}

export type OAuthIdentity = {
  provider: OAuthProvider;
  subject: string;
  email: string;
  emailVerified: boolean;
  name: string;
  next: string;
};

function decodeJwtPayload(jwt: string): Record<string, unknown> {
  const part = jwt.split(".")[1];
  if (!part) throw new Error("Malformed id_token");
  return JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
}

/**
 * Exchanges the code and validates the ID token claims. The token comes
 * straight from the provider's token endpoint over TLS with client
 * authentication, so per OIDC Core 3.1.3.7 the TLS channel authenticates
 * the issuer; iss/aud/exp/nonce are still checked.
 */
export async function finishOAuth(provider: OAuthProvider, code: string, state: string): Promise<OAuthIdentity> {
  const store = await cookies();
  const sealed = store.get(STATE_COOKIE)?.value;
  store.delete({ name: STATE_COOKIE, path: "/api/auth/oauth" });
  const raw = sealed ? decrypt(sealed, "oauth-state") : null;
  if (!raw) throw new Error("state_missing");
  const saved = JSON.parse(raw.toString("utf8")) as StatePayload;
  if (saved.provider !== provider || saved.state !== state || saved.exp < Date.now()) throw new Error("state_mismatch");

  const c = config(provider);
  const res = await fetch(c.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri(provider),
      client_id: c.clientId,
      client_secret: c.clientSecret,
      code_verifier: saved.verifier,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const tokens = (await res.json()) as { id_token?: string; error?: string };
  if (!res.ok || !tokens.id_token) throw new Error(tokens.error || "token_exchange_failed");

  const claims = decodeJwtPayload(tokens.id_token);
  const now = Math.floor(Date.now() / 1000);
  if (claims.aud !== c.clientId) throw new Error("bad_audience");
  if (typeof claims.exp !== "number" || claims.exp < now - 60) throw new Error("expired");
  if (claims.nonce !== saved.nonce) throw new Error("bad_nonce");

  if (provider === "google") {
    if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") throw new Error("bad_issuer");
  } else {
    const iss = String(claims.iss || "");
    if (!/^https:\/\/login\.microsoftonline\.com\/[0-9a-f-]{36}\/v2\.0$/.test(iss)) throw new Error("bad_issuer");
    if (env.microsoft.tenant !== "common" && env.microsoft.tenant !== "organizations" && env.microsoft.tenant !== "consumers") {
      if (claims.tid !== env.microsoft.tenant) throw new Error("bad_tenant");
    }
  }

  const email = String(claims.email || (provider === "microsoft" ? claims.preferred_username : "") || "")
    .trim()
    .toLowerCase();
  if (!email || !email.includes("@")) throw new Error("email_missing");

  // Google: email_verified. Microsoft: xms_edov optional claim (domain owner verified).
  const emailVerified =
    provider === "google" ? claims.email_verified === true : claims.xms_edov === true || claims.xms_edov === "1";

  return {
    provider,
    subject: String(claims.sub),
    email,
    emailVerified,
    name: String(claims.name || email.split("@")[0]),
    next: saved.next,
  };
}
