import "server-only";
import { hash, verify } from "@node-rs/argon2";

// OWASP 2024 argon2id baseline: m=19 MiB, t=2, p=1.
const OPTIONS = { memoryCost: 19456, timeCost: 2, parallelism: 1, outputLen: 32 } as const;

// Verified against when the account does not exist, so response time does
// not reveal whether an email is registered.
let dummyHash: Promise<string> | null = null;

export async function hashPassword(password: string) {
  return hash(password, OPTIONS);
}

export async function verifyPassword(passwordHash: string | null | undefined, password: string) {
  try {
    if (!passwordHash) {
      dummyHash ??= hash("not-a-real-password", OPTIONS);
      await verify(await dummyHash, password);
      return false;
    }
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
