/**
 * Creates or promotes an AuditMesh super admin. Super admins are never
 * created through sign-up.
 *
 *   npm run admin:create -- admin@yourco.com "Full Name"
 *
 * A random temporary password is printed; sign in, change it, and turn on
 * two-step verification (required for /admin in production).
 */
import { randomBytes } from "node:crypto";
import { hash } from "@node-rs/argon2";
import { sql } from "drizzle-orm";
import { db, pool, schema } from "./db";

async function main() {
  const [email, ...nameParts] = process.argv.slice(2);
  if (!email || !email.includes("@")) throw new Error('Usage: npm run admin:create -- email@domain.com "Full Name"');
  const name = nameParts.join(" ") || email.split("@")[0];
  const lower = email.toLowerCase();
  const [existing] = await db.select().from(schema.users).where(sql`lower(${schema.users.email}) = ${lower}`);
  if (existing) {
    await db.update(schema.users).set({ isSuperAdmin: true }).where(sql`id = ${existing.id}`);
    console.log(`${lower} is now a super admin.`);
  } else {
    const temp = randomBytes(12).toString("base64url") + "!A1";
    await db.insert(schema.users).values({
      email: lower,
      name,
      passwordHash: await hash(temp, { memoryCost: 19456, timeCost: 2, parallelism: 1 }),
      emailVerifiedAt: new Date(),
      isSuperAdmin: true,
    });
    console.log(`Created super admin ${lower}\nTemporary password: ${temp}\nChange it after first sign-in and turn on two-step verification.`);
  }
  await db.insert(schema.auditLog).values({ actorLabel: "CLI", action: "admin.created", summary: `granted super admin to ${lower}` });
  await pool.end();
}

main().catch(async (e) => {
  console.error(e.message || e);
  await pool.end();
  process.exit(1);
});
