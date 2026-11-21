# Deploying AuditMesh (Vercel + Neon)

## 1. Neon database

1. Create a project at neon.tech. Pick the region closest to your Vercel region; for India use `aws-ap-south-1`
   (Mumbai).
2. Copy both connection strings from **Connect**:
   - **Pooled** (host contains `-pooler`) → `DATABASE_URL`
   - **Direct** → `DATABASE_URL_UNPOOLED`
3. Optional: create a `preview` branch in Neon for Vercel preview deployments.

## 2. Repository

```bash
git init && git add -A && git commit -m "AuditMesh"
git remote add origin git@github.com:<you>/auditmesh.git
git push -u origin main
```

## 3. Run migrations

From your machine, against Neon:

```bash
DATABASE_URL_UNPOOLED='postgresql://…direct…' npm run db:migrate
```

This creates all tables, the append-only audit-log trigger, the framework catalog and the default platform settings.
Do **not** run `db:seed` on production.

## 4. First super admin

```bash
DATABASE_URL_UNPOOLED='…' npm run admin:create -- you@yourco.com "Your Name"
```

Sign in with the printed temporary password, change it, then turn on 2-step verification under **Account security**.
`/admin` requires 2-step in production.

## 5. Vercel project

Import the repo (framework: Next.js). Add these environment variables for Production, and Preview if you use it:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Neon pooled string |
| `DATABASE_URL_UNPOOLED` | Neon direct string |
| `APP_URL` | `https://your-domain` (no trailing slash) |
| `AUTH_SECRET` | `openssl rand -base64 32`. Keep it stable: changing it invalidates 2-step secrets |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` | from Cloudflare |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | from Google Cloud |
| `MICROSOFT_CLIENT_ID`, `MICROSOFT_CLIENT_SECRET`, `MICROSOFT_TENANT_ID` | from Entra |
| `RESEND_API_KEY`, `EMAIL_FROM` | from Resend (verified sending domain) |

Then deploy. `NEXT_PUBLIC_*` values are build-time, so redeploy after changing them.

## 6. Google sign-in

Google Cloud Console → APIs & Services:

1. **OAuth consent screen:** External, app name AuditMesh, scopes `openid email profile`.
2. **Credentials → Create OAuth client ID → Web application:**
   - Authorized JavaScript origin: `https://your-domain`
   - Authorized redirect URI: `https://your-domain/api/auth/oauth/google/callback`
3. Copy the client ID and secret into Vercel.

## 7. Microsoft sign-in (Entra ID)

Entra admin center → App registrations → **New registration**:

1. **Supported account types:**
   - Any org directory: set `MICROSOFT_TENANT_ID=organizations`.
   - Work and personal accounts: set `common`.
   - Your company only: set your tenant ID.
2. **Redirect URI (Web):** `https://your-domain/api/auth/oauth/microsoft/callback`
3. **Certificates & secrets → New client secret.** Copy the *Value*, and note its expiry.
4. **Token configuration → Add optional claim → ID token:** `email` and `xms_edov`. Without `xms_edov`, Microsoft
   accounts cannot be linked to existing email/password accounts; that check is a safeguard against email spoofing.
5. **API permissions:** `openid`, `email`, `profile` (Microsoft Graph, delegated).

## 8. Cloudflare Turnstile

Cloudflare dashboard → Turnstile → **Add widget**:

1. Add your domain and any preview hostnames. Mode: *Managed*.
2. Copy the site key and secret key into Vercel.

The CSP already allows `challenges.cloudflare.com`.

## 9. Email (Resend)

1. Add and verify your sending domain in Resend (DNS records).
2. Set `RESEND_API_KEY` and `EMAIL_FROM="AuditMesh <no-reply@your-domain>"`.

## 10. Smoke test after deploy

- [ ] Sign up as an organization → confirm the email link → choose frameworks → the overview shows readiness
- [ ] Sign out, sign in with Google and with Microsoft (same email links to the same account)
- [ ] Turn on 2-step → sign out → sign in asks for a code
- [ ] Sign up a second user as an auditor → Admin → Firm verification → Approve → firm shows in the marketplace
- [ ] Organization requests a proposal → auditor opens an engagement from it → room works for both sides
- [ ] Forgot password → reset → old sessions signed out
- [ ] Admin → Audit log shows all of the above

## Operations

- **Schema changes:** edit `lib/db/schema.ts`, run `npm run db:generate`, commit the SQL, then run `db:migrate` before
  deploying code that needs it.
- **Backups:** Neon keeps point-in-time restore according to your plan. Use a branch to test risky migrations.
- **Evidence files** are stored in Postgres (`evidence_blobs`, 10 MB per file). For large volumes, move them to object
  storage (S3 or R2); only `uploadEvidenceAction` and `/api/evidence/[id]` need to change.
- **Rotate secrets:** OAuth client secrets expire (Microsoft defaults to 6–24 months). Rotating `AUTH_SECRET`
  invalidates 2-step secrets, so users must re-enroll.

## Performance

Each page makes a few sequential database round trips, so **the distance between Vercel functions and Neon dominates
page time**.

1. **Same region.** `vercel.json` pins functions to `sin1` (Singapore), to match a Neon project in
   `aws-ap-southeast-1`. If your Neon project is in Mumbai (`aws-ap-south-1`), change it to `bom1`. Check under Vercel →
   Settings → Functions → Region, and in the Neon console. A US default region (`iad1`) next to a Singapore database
   adds roughly 200 ms per round trip.
2. **Pooled URL.** `DATABASE_URL` must be the `-pooler` host.
3. **Neon autosuspend.** On the free plan the compute sleeps after 5 idle minutes, and the first request then waits
   for a cold start (around 0.5–1 s). On paid plans you can turn autosuspend off for production.
4. **Fluid compute** (Vercel → Settings → Functions) keeps instances warm, so the connection pool is reused across
   requests.
