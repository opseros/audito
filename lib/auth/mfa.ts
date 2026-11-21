import "server-only";
import { randomBytes } from "node:crypto";
import { createTOTPKeyURI, verifyTOTPWithGracePeriod } from "@oslojs/otp";
import { decrypt, encrypt } from "@/lib/crypto";

export function newTotpSecret() {
  return randomBytes(20);
}

export function totpUri(email: string, secret: Uint8Array) {
  return createTOTPKeyURI("AuditMesh", email, secret, 30, 6);
}

export function sealSecret(secret: Uint8Array) {
  return encrypt(Buffer.from(secret), "totp");
}

export function openSecret(sealed: string | null) {
  return sealed ? decrypt(sealed, "totp") : null;
}

export function checkTotp(secret: Uint8Array, code: string) {
  const clean = code.replace(/\s/g, "");
  if (!/^\d{6}$/.test(clean)) return false;
  return verifyTOTPWithGracePeriod(secret, 30, 6, clean, 30);
}

/** RFC 4648 base32 for manual entry in authenticator apps. */
export function base32(bytes: Uint8Array) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = 0;
  let value = 0;
  let out = "";
  for (const b of bytes) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += alphabet[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += alphabet[(value << (5 - bits)) & 31];
  return out;
}
