# AuditOps

One network for everyone in the audit. Organizations get audit-ready, auditors run fieldwork, and consultants manage
every client, all in shared engagement rooms.

**Stack:** Next.js 15 (App Router, Server Actions) · Postgres on **Neon** · Drizzle ORM · Tailwind.
**Auth:** built into the app, with no Supabase, Auth0 or Clerk. It supports email + password (argon2id), Google,
Microsoft (Entra ID), TOTP two-step verification and Cloudflare Turnstile.

## Quick start (local)

```bash
npm ci
cp .env.example .env            # set DATABASE_URL to a Neon branch or local Postgres
npm run db:migrate
SEED_DEMO_PASSWORD='Demo-pass-2026!' npm run db:seed   # optional demo data
npm run dev
```

Demo accounts (password = `SEED_DEMO_PASSWORD`):

| Account | Role |
|---|---|
| `priya@northwind.test` | Owner, Northwind Labs (organization) |
| `dev@northwind.test` | Member, Northwind Labs |
| `riya@ledgerline.test` | Owner, Ledgerline CPA (auditor) |
| `asha@brightgate.test` | Owner, Brightgate Advisory (service provider) |
| `admin@auditops.test` | Super admin (set `ALLOW_ADMIN_WITHOUT_MFA=true` locally, or turn on 2-step first) |

Without `RESEND_API_KEY`, verification, reset and invitation emails are printed to the server log.

## What is real and what is sample data

| Area | Status |
|---|---|
| Sign-up as organization / auditor / provider, onboarding, email verification | Real |
| Password, Google, Microsoft sign-in; Turnstile; TOTP 2-step; password reset; sessions; rate limiting | Real |
| Workspaces, team invitations, roles, workspace switching | Real |
| Frameworks, shared control library, readiness %, control status, evidence upload/download | Real |
| Engagement rooms: requests, threads, internal auditor notes, evidence on requests, accept/rework, findings with management response, seeded sampling, phases, timeline | Real |
| Auditor workpapers with sign-off, leads (proposal requests), new engagements | Real |
| Provider portfolio, contributor access to clients ("act inside client"), provider room access | Real |
| Marketplace of verified firms, proposal requests | Real |
| Super admin: tenants, suspend/reactivate, firm verification, framework publishing, settings, read-only support sessions, append-only audit log | Real |
| Integrations (AWS, GitHub…), control packs, provider task board, partner referrals, marketplace moderation, billing | **UI on sample data**, marked "Sample data" / "Coming soon" |

## Access model

**Platform role.** A super admin is created only by `npm run admin:create`, never through sign-up. Super admins need
2-step verification to open `/admin` in production. Support sessions are read-only, need a reason, and are logged in
the tenant's trail.

**Workspace roles** (`lib/permissions.ts`):

| Action | Owner | Admin | Member | Viewer | Contributor (provider) | Support |
|---|---|---|---|---|---|---|
| Read workspace | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Controls, evidence, replies | ✓ | ✓ | ✓ | | ✓ | |
| Team, roles, settings | ✓ | ✓ (not other admins) | | | | |
| Grant provider access (org) | ✓ | ✓ | | | | |
| Request proposals (org) | ✓ | ✓ | | | | |
| Review, sample, findings, workpapers (auditor) | ✓ | ✓ | ✓ | | | |
| Open engagements (auditor) | ✓ | ✓ | | | | |

**Cross-tenant rules:**
- An engagement room is visible to exactly three parties: the organization, its auditor, and the provider the
  organization granted access to. Every other workspace gets a 404.
- Auditor internal notes and workpapers never leave the auditor firm.
- Evidence always belongs to the organization. Auditors and providers can download only files attached to requests in
  their own engagements.
- Checks run on the server in every action and page (`lib/context.ts`, `lib/engagements.ts`). The edge middleware only
  checks that a session cookie exists.

## Authentication design

- **Passwords:** argon2id (m=19 MiB, t=2). Policy: 10+ characters, three character classes, must not contain the email
  name. A dummy verify runs on unknown emails, so response timing does not reveal which emails exist.
- **Sessions:** a random 256-bit token in an `httpOnly`, `SameSite=Lax`, `Secure` cookie. The database stores only its
  SHA-256 hash. Sessions last 30 days, slide forward with use, and can be revoked per device. A password reset or change
  signs out other sessions.
- **OAuth (Google / Microsoft):** authorization code flow with PKCE, state and nonce, held in an encrypted 10-minute
  cookie. ID token checks: iss, aud, exp and nonce; for single-tenant Microsoft, also tid. An existing account is linked
  only when the provider says the email is verified (Google `email_verified`, Microsoft `xms_edov`).
- **2-step:** TOTP (RFC 6238). Secrets are encrypted at rest with AES-256-GCM, using a key derived from `AUTH_SECRET`.
  Platform setting "Require MFA" enforces it for everyone.
- **Turnstile:** sign-in, sign-up, password reset and invitation sign-up, verified server-side with `siteverify`
  (action-bound, fails closed). Google and Microsoft run their own bot checks.
- **Rate limiting:** 5 failed sign-ins per email or 30 per IP in 15 minutes, plus limits on resets, verification
  resends and 2-step codes.
- **CSRF:** Server Actions check Origin/Host, and cookies are `SameSite=Lax`. Security headers and CSP are in
  `next.config.mjs`.
- **Audit log:** append-only, enforced by a database trigger.

## Scripts

| Command | What |
|---|---|
| `npm run db:generate` | Generate a migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply migrations (uses `DATABASE_URL_UNPOOLED`) |
| `npm run db:seed` | Demo data (refuses with `NODE_ENV=production`) |
| `npm run admin:create -- you@co.com "Name"` | Create or promote a super admin |
| `python3 tests/e2e.py` | 42 end-to-end browser checks (Playwright; needs a seeded DB and server on :3100) |

Deployment: see **[DEPLOY.md](DEPLOY.md)**.
