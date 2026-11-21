# End-to-end checks. Needs: seeded DB (SEED_DEMO_PASSWORD="Demo-pass-2026!"), server on :3100
# with stdout in /tmp/am.log (email links are read from it), ALLOW_ADMIN_WITHOUT_MFA=true, `pip install playwright`.
import re, sys, subprocess
from playwright.sync_api import sync_playwright, expect

BASE = "http://localhost:3100"
PW = "Demo-pass-2026!"
results = []

def check(name, cond):
    results.append((name, bool(cond)))
    print(("PASS " if cond else "FAIL ") + name, flush=True)

def wait_text(page, text, timeout=15000):
    try:
        page.wait_for_selector(f"text={text}", timeout=timeout)
    except Exception:
        pass
    return text in page.content()

def signin(page, email, pw=PW):
    page.goto(BASE + "/signin")
    page.fill("input[name=email]", email)
    page.fill("input[name=password]", pw)
    page.click("button:has-text('Continue')")
    page.wait_for_load_state("networkidle")

def signout(page):
    page.click("button:has-text('Sign out')")
    page.wait_for_load_state("networkidle")

def log_link(pattern):
    txt = open("/tmp/am.log").read()
    m = re.findall(pattern, txt)
    return m[-1] if m else None

with sync_playwright() as p:
    b = p.chromium.launch(channel="chrome", headless=True)
    ctx = b.new_context(viewport={"width": 1360, "height": 900})
    page = ctx.new_page()
    errors = []
    page.on("pageerror", lambda e: errors.append(str(e)))

    # 1. landing
    page.goto(BASE)
    check("landing renders", page.locator("h1").inner_text().startswith("Run every audit"))
    page.screenshot(path="/home/claude/shots/01-landing.png", full_page=True)

    # 2. sign up new organization
    page.click("a:has-text('Start as organization')")
    page.fill("input[name=orgName]", "Acme Inc")
    page.fill("input[name=fullName]", "Alex Doe")
    page.fill("input[name=email]", "alex@acme.test")
    page.fill("input[name=password]", "weakpassword")
    page.click("button:has-text('Continue')")
    check("weak password rejected", wait_text(page, "Use at least three"))
    page.fill("input[name=password]", "Str0ng-Password!")
    page.click("button:has-text('Continue')")
    page.wait_for_url("**/onboarding", timeout=15000)
    check("signup -> onboarding", "/onboarding" in page.url)
    page.screenshot(path="/home/claude/shots/02-onboarding.png", full_page=True)
    page.click("button:has-text('Create workspace')")
    page.wait_for_url("**/verify-email", timeout=15000)
    check("unverified email gated", "/verify-email" in page.url)
    link = log_link(r"(http://localhost:3100/verify-email/confirm\?token=[\w-]+)")
    check("verification email logged", link)
    page.goto(link)
    page.wait_for_url("**/app/overview", timeout=15000)
    check("verified -> overview", "/app/overview" in page.url)
    check("readiness cards present", page.locator("text=controls passing").count() >= 2)
    signout(page)

    # 3. rate limit + generic error
    for i in range(6):
        signin(page, "priya@northwind.test", "wrong-password")
    check("rate limit after repeated failures", "Too many attempts" in page.content())

    # use different user for normal flows (priya now rate-limited for 15 min)
    signin(page, "dev@northwind.test")
    check("member signs in", "/app/overview" in page.url)
    page.screenshot(path="/home/claude/shots/03-org-overview.png", full_page=True)
    page.goto(BASE + "/app/controls")
    check("controls list", page.locator("table tbody tr").count() >= 8)
    page.screenshot(path="/home/claude/shots/04-controls.png", full_page=True)
    page.locator("table tbody tr a").first.click()
    page.wait_for_load_state("networkidle")
    page.select_option("select[name=status]", "passing")
    page.click("button:has-text('Save control')")
    check("member updates control", wait_text(page, "Control updated"))
    page.set_input_files("input[type=file]", files=[{"name": "mfa-proof.txt", "mimeType": "text/plain", "buffer": b"all users have mfa"}])
    page.click("button:has-text('Upload evidence')")
    check("member uploads evidence", wait_text(page, "uploaded"))
    page.goto(BASE + "/app/settings/team")
    check("member cannot invite", page.locator("text=Invite a teammate").count() == 0)
    page.goto(BASE + "/app/marketplace")
    check("marketplace lists verified firms", page.locator("text=Ledgerline CPA").count() >= 1 and page.locator("text=Meridian 3PAO").count() == 0)
    page.screenshot(path="/home/claude/shots/05-marketplace.png", full_page=True)
    page.goto(BASE + "/app/audits")
    page.click("a:has-text('Open room')")
    page.wait_for_load_state("networkidle")
    room_url = page.url.split("?")[0]
    check("org does not see internal note", "If 2+ of 25" not in page.content())
    page.screenshot(path="/home/claude/shots/06-room-org.png", full_page=True)
    page.goto(BASE + "/admin")
    check("member blocked from admin", "/admin" not in page.url)
    signout(page)

    # 4. auditor
    signin(page, "riya@ledgerline.test")
    check("auditor lands on engagements", "/app/engagements" in page.url)
    page.screenshot(path="/home/claude/shots/07-engagements.png", full_page=True)
    page.goto(room_url)
    page.click("a:has-text('Change tickets sample')")
    page.wait_for_selector("h2:has-text('Change tickets sample')", timeout=15000)
    check("auditor sees internal note", "If 2+ of 25" in page.content())
    page.fill("textarea[name=body]", "Thanks, approvals received.")
    page.click("button:has-text('Accept evidence')")
    try:
        page.wait_for_selector("[role=status]:has-text('Accepted.')", timeout=15000)
    except Exception:
        pass
    check("auditor accepts", "Accepted." in page.content())
    page.goto(room_url + "?tab=sampling")
    page.click("button:has-text('Draw sample')")
    check("sample drawn", wait_text(page, "locked") and "CHG-" in page.content())
    page.screenshot(path="/home/claude/shots/08-sampling.png", full_page=True)
    page.goto(BASE + "/app/workpapers")
    check("workpapers visible", page.locator("text=WP-1").count() >= 1)
    page.goto(BASE + "/app/overview")
    try:
        page.wait_for_url("**/app/engagements", timeout=15000)
    except Exception:
        pass
    check("auditor kept out of org pages", "/app/overview" not in page.url)
    signout(page)

    # 5. provider acting as client
    signin(page, "asha@brightgate.test")
    check("provider portfolio", "/app/portfolio" in page.url and "Northwind Labs" in page.content())
    page.click("button:has-text('Enter')")
    page.wait_for_url("**/app/overview", timeout=15000)
    page.wait_for_selector("text=acting inside", timeout=10000)
    check("acting banner", "acting inside" in page.content())
    page.screenshot(path="/home/claude/shots/09-acting.png", full_page=True)
    page.goto(BASE + "/app/settings/team")
    check("provider cannot manage client team", page.locator("text=Invite a teammate").count() == 0)
    page.click("button:has-text('Back to portfolio')")
    page.wait_for_url("**/app/portfolio", timeout=15000)
    page.click("a:has-text('Audit room')")
    page.wait_for_url("**/app/rooms/**", timeout=15000)
    page.wait_for_selector("text=Engagement room", timeout=10000)
    check("provider room access", "Engagement room" in page.content() and "If 2+ of 25" not in page.content())
    signout(page)

    # 6. super admin
    signin(page, "admin@auditops.test")
    page.goto(BASE + "/admin/verification")
    page.click("button:has-text('Approve')")
    try:
        page.wait_for_selector("span.pill:has-text('Approved')", timeout=10000)
    except Exception:
        pass
    check("admin approves verification", page.locator("span.pill:has-text('Approved')").count() >= 1)
    page.goto(BASE + "/admin/tenants")
    page.screenshot(path="/home/claude/shots/10-admin-tenants.png", full_page=True)
    page.locator("tr:has-text('Northwind Labs') a:has-text('Details')").click()
    page.wait_for_load_state("networkidle")
    page.click("button:has-text('Start support session')")
    check("support needs reason", wait_text(page, "Enter a reason"))
    page.fill("textarea[name=reason]", "Ticket 4411 readiness question")
    page.click("button:has-text('Start support session')")
    page.wait_for_url("**/app/**", timeout=15000)
    check("support banner", "support session" in page.content())
    page.goto(BASE + "/app/controls")
    page.locator("table tbody tr a").first.click()
    page.wait_for_load_state("networkidle")
    check("support read-only (no save button)", page.locator("button:has-text('Save control')").count() == 0)
    page.click("button:has-text('End session')")
    page.wait_for_load_state("networkidle")
    page.goto(BASE + "/admin/audit-log")
    check("audit log records support", "started read-only support session" in page.content())
    page.screenshot(path="/home/claude/shots/11-audit-log.png", full_page=True)
    signout(page)

    # 7. forgot/reset
    page.goto(BASE + "/forgot-password")
    page.fill("input[name=email]", "alex@acme.test")
    page.click("button:has-text('Send reset link')")
    wait_text(page, "reset link is on its way")
    rl = log_link(r"(http://localhost:3100/reset-password\?token=[\w-]+)")
    check("reset link issued", rl)
    page.goto(rl)
    page.fill("input[name=password]", "N3w-Password-2026")
    page.fill("input[name=confirm]", "N3w-Password-2026")
    page.click("button:has-text('Set password')")
    page.wait_for_url("**/signin?reset=1", timeout=15000)
    signin(page, "alex@acme.test", "N3w-Password-2026")
    check("sign in with new password", "/app/overview" in page.url)
    page.goto(rl)
    page.fill("input[name=password]", "An0ther-Pass-2026")
    page.fill("input[name=confirm]", "An0ther-Pass-2026")
    page.click("button:has-text('Set password')")
    check("reset link single-use", wait_text(page, "invalid or has expired"))

    # 8. MFA enrol + challenge
    page.goto(BASE + "/account/security")
    page.click("button:has-text('Set up')")
    page.wait_for_load_state("networkidle")
    secret = page.locator("code").inner_text().strip()
    import hmac, hashlib, struct, time, base64
    def totp(s):
        key = base64.b32decode(s + "=" * ((8 - len(s) % 8) % 8))
        c = struct.pack(">Q", int(time.time()) // 30)
        h = hmac.new(key, c, hashlib.sha1).digest()
        o = h[-1] & 15
        return "%06d" % ((struct.unpack(">I", h[o:o+4])[0] & 0x7fffffff) % 1000000)
    page.fill("input[name=code]", totp(secret))
    page.click("button:has-text('Turn on')")
    check("mfa enabled", wait_text(page, "On since"))
    signout(page)
    signin(page, "alex@acme.test", "N3w-Password-2026")
    check("mfa challenge shown", "/mfa" in page.url)
    page.goto(BASE + "/app/overview")
    check("app blocked until mfa", "/mfa" in page.url)
    page.fill("input[name=code]", totp(secret))
    page.click("button:has-text('Verify')")
    page.wait_for_url("**/app/**", timeout=15000)
    check("mfa passes", "/app/" in page.url)

    # 9. cross-tenant isolation (alex is in Acme, not Northwind)
    # With a loading boundary the page streams, so notFound() renders the 404 UI with HTTP 200.
    page.goto(room_url)
    page.wait_for_selector("text=could not be found", timeout=15000)
    check("other tenant room shows not found", "Engagement room" not in page.content())
    ev_id = subprocess.check_output(["psql", "-h", "localhost", "-p", "5433", "-U", "postgres", "-d", "auditmesh", "-tAc",
        "select e.id from evidence e join tenants t on t.id=e.tenant_id where t.slug='northwind-labs' limit 1"]).decode().strip()
    r = page.goto(BASE + "/api/evidence/" + ev_id)
    check("other tenant evidence is 404", r.status == 404)
    r = page.request.get(BASE + "/admin/overview", max_redirects=0)
    check("non-admin /admin redirects", r.status in (302, 303, 307))

    check("no client-side errors", not errors)
    if errors: print(errors[:3])
    b.close()

failed = [n for n, ok in results if not ok]
print(f"\n{len(results) - len(failed)}/{len(results)} passed")

# Progressive enhancement: with JavaScript off, sign-in must POST (never put the password in the URL).
with sync_playwright() as p2:
    b2 = p2.chromium.launch(channel="chrome", headless=True)
    pg = b2.new_context(java_script_enabled=False).new_page()
    pg.goto(BASE + "/signin")
    pg.fill("input[name=email]", "dev@northwind.test")
    pg.fill("input[name=password]", PW)
    pg.click("button:has-text('Continue')")
    pg.wait_for_load_state("load")
    ok = "password=" not in pg.url
    print(("PASS " if ok else "FAIL ") + "no password in URL without JS", pg.url)
    b2.close()
    if not ok:
        sys.exit(1)
