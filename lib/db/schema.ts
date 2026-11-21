import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

const created = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updated = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------- enums
export const userStatus = pgEnum("user_status", ["active", "suspended", "disabled"]);
export const tenantType = pgEnum("tenant_type", ["organization", "auditor", "provider"]);
export const tenantStatus = pgEnum("tenant_status", ["active", "pending_verification", "suspended"]);
export const memberRole = pgEnum("member_role", ["owner", "admin", "member", "viewer"]);
export const tokenKind = pgEnum("token_kind", ["email_verify", "password_reset"]);
export const controlStatus = pgEnum("control_status", ["passing", "failing", "needs_evidence"]);
export const requestStatus = pgEnum("request_status", ["open", "submitted", "needs_rework", "accepted"]);
export const severity = pgEnum("severity", ["low", "moderate", "high"]);
export const verificationStatus = pgEnum("verification_status", ["pending", "approved", "rejected"]);

// ---------------------------------------------------------------- identity
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    status: userStatus("status").notNull().default("active"),
    // Granted only by scripts/create-super-admin.ts, never through sign-up.
    isSuperAdmin: boolean("is_super_admin").notNull().default(false),
    mfaSecret: text("mfa_secret"), // AES-GCM encrypted
    mfaEnabledAt: timestamp("mfa_enabled_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`)]
);

export const oauthAccounts = pgTable(
  "oauth_accounts",
  {
    provider: text("provider").notNull(), // google | microsoft
    providerUserId: text("provider_user_id").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    email: text("email"),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerUserId] }), index("oauth_user_idx").on(t.userId)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256(token), hex
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    mfaVerified: boolean("mfa_verified").notNull().default(false),
    activeTenantId: uuid("active_tenant_id"),
    // Service provider working inside a client organization.
    actingTenantId: uuid("acting_tenant_id"),
    supportSessionId: uuid("support_session_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: created(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)]
);

export const authTokens = pgTable("auth_tokens", {
  id: text("id").primaryKey(), // sha256(token)
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind: tokenKind("kind").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  usedAt: timestamp("used_at", { withTimezone: true }),
  createdAt: created(),
});

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ip: text("ip"),
    success: boolean("success").notNull(),
    createdAt: created(),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.createdAt), index("login_attempts_ip_idx").on(t.ip, t.createdAt)]
);

// ---------------------------------------------------------------- tenancy
export const tenants = pgTable(
  "tenants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    type: tenantType("type").notNull(),
    // org: company size · auditor: firm type · provider: client range
    subtype: text("subtype"),
    status: tenantStatus("status").notNull().default("active"),
    plan: text("plan").notNull().default("Starter"),
    location: text("location"),
    blurb: text("blurb"),
    timeline: text("timeline"),
    frameworks: text("frameworks").array().notNull().default(sql`'{}'::text[]`),
    listed: boolean("listed").notNull().default(false), // marketplace
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("tenants_slug_uq").on(t.slug), index("tenants_type_idx").on(t.type, t.status)]
);

export const memberships = pgTable(
  "memberships",
  {
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: memberRole("role").notNull().default("member"),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.userId] }), index("memberships_user_idx").on(t.userId)]
);

export const invitations = pgTable("invitations", {
  id: text("id").primaryKey(), // sha256(token)
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  email: text("email").notNull(),
  role: memberRole("role").notNull(),
  invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  createdAt: created(),
});

/** Service provider granted contributor access to a client organization. */
export const providerAccess = pgTable(
  "provider_access",
  {
    providerTenantId: uuid("provider_tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    orgTenantId: uuid("org_tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    grantedBy: uuid("granted_by").references(() => users.id, { onDelete: "set null" }),
    active: boolean("active").notNull().default(true),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.providerTenantId, t.orgTenantId] })]
);

export const verifications = pgTable("verifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  claim: text("claim").notNull(),
  document: text("document"),
  status: verificationStatus("status").notNull().default("pending"),
  decidedBy: uuid("decided_by").references(() => users.id, { onDelete: "set null" }),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  reason: text("reason"),
  createdAt: created(),
});

// ---------------------------------------------------------------- compliance
export const frameworks = pgTable("frameworks", {
  code: text("code").primaryKey(), // SOC2, ISO27001, PCI, FEDRAMP, HIPAA, DPDP...
  name: text("name").notNull(),
  shortName: text("short_name").notNull(),
  version: text("version").notNull(),
  requirements: text("requirements").notNull(),
  published: boolean("published").notNull().default(false),
  updatedAt: updated(),
});

export const tenantFrameworks = pgTable(
  "tenant_frameworks",
  {
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    frameworkCode: text("framework_code").notNull().references(() => frameworks.code),
    milestone: text("milestone"),
    createdAt: created(),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.frameworkCode] })]
);

export const controls = pgTable(
  "controls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    ownerName: text("owner_name"),
    status: controlStatus("status").notNull().default("needs_evidence"),
    testDescription: text("test_description"),
    testResult: text("test_result"),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [uniqueIndex("controls_tenant_code_uq").on(t.tenantId, t.code)]
);

export const controlMappings = pgTable(
  "control_mappings",
  {
    controlId: uuid("control_id").notNull().references(() => controls.id, { onDelete: "cascade" }),
    frameworkCode: text("framework_code").notNull().references(() => frameworks.code),
    ref: text("ref").notNull(),
  },
  (t) => [primaryKey({ columns: [t.controlId, t.frameworkCode] })]
);

export const evidence = pgTable(
  "evidence",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    controlId: uuid("control_id").references(() => controls.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    source: text("source").notNull(),
    mime: text("mime"),
    size: integer("size"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    // Provider uploading on behalf of the client.
    onBehalfOfTenantId: uuid("on_behalf_of_tenant_id"),
    sharedWith: text("shared_with").array().notNull().default(sql`'{}'::text[]`),
    createdAt: created(),
  },
  (t) => [index("evidence_tenant_idx").on(t.tenantId, t.createdAt)]
);

/** File bytes kept apart so list queries never load them. */
export const evidenceBlobs = pgTable("evidence_blobs", {
  evidenceId: uuid("evidence_id").primaryKey().references(() => evidence.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});

// ---------------------------------------------------------------- engagements
export const engagements = pgTable(
  "engagements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgTenantId: uuid("org_tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    auditorTenantId: uuid("auditor_tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    providerTenantId: uuid("provider_tenant_id").references(() => tenants.id, { onDelete: "set null" }),
    frameworkCode: text("framework_code").references(() => frameworks.code),
    title: text("title").notNull(),
    window: text("window"),
    phase: integer("phase").notNull().default(0), // 0 Scoping .. 4 Report
    source: text("source").notNull().default("Direct"), // Direct | Marketplace | provider name
    createdAt: created(),
  },
  (t) => [index("eng_org_idx").on(t.orgTenantId), index("eng_auditor_idx").on(t.auditorTenantId)]
);

export const engagementRequests = pgTable(
  "engagement_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    engagementId: uuid("engagement_id").notNull().references(() => engagements.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    controlRef: text("control_ref"),
    ownerName: text("owner_name"),
    ask: text("ask").notNull(),
    status: requestStatus("status").notNull().default("open"),
    position: integer("position").notNull().default(0),
    createdAt: created(),
    updatedAt: updated(),
  },
  (t) => [index("req_eng_idx").on(t.engagementId, t.position)]
);

export const requestEvidence = pgTable(
  "request_evidence",
  {
    requestId: uuid("request_id").notNull().references(() => engagementRequests.id, { onDelete: "cascade" }),
    evidenceId: uuid("evidence_id").notNull().references(() => evidence.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.requestId, t.evidenceId] })]
);

export const requestMessages = pgTable(
  "request_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: uuid("request_id").notNull().references(() => engagementRequests.id, { onDelete: "cascade" }),
    authorUserId: uuid("author_user_id").references(() => users.id, { onDelete: "set null" }),
    authorTenantId: uuid("author_tenant_id").notNull().references(() => tenants.id),
    onBehalfOfTenantId: uuid("on_behalf_of_tenant_id"),
    body: text("body").notNull(),
    // Visible only to the auditor firm.
    internal: boolean("internal").notNull().default(false),
    createdAt: created(),
  },
  (t) => [index("msg_req_idx").on(t.requestId, t.createdAt)]
);

export const samples = pgTable("samples", {
  id: uuid("id").primaryKey().defaultRandom(),
  engagementId: uuid("engagement_id").notNull().references(() => engagements.id, { onDelete: "cascade" }),
  controlRef: text("control_ref").notNull(),
  populationSize: integer("population_size").notNull(),
  method: text("method").notNull(),
  seed: integer("seed").notNull(),
  items: text("items").array().notNull(),
  drawnBy: uuid("drawn_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: created(),
});

export const findings = pgTable(
  "findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    engagementId: uuid("engagement_id").notNull().references(() => engagements.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    controlRef: text("control_ref"),
    severity: severity("severity").notNull().default("moderate"),
    status: text("status").notNull().default("Awaiting response"),
    managementResponse: text("management_response"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: created(),
  },
  (t) => [index("findings_eng_idx").on(t.engagementId)]
);

export const workpapers = pgTable("workpapers", {
  id: uuid("id").primaryKey().defaultRandom(),
  auditorTenantId: uuid("auditor_tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  engagementId: uuid("engagement_id").references(() => engagements.id, { onDelete: "cascade" }),
  ref: text("ref").notNull(),
  name: text("name").notNull(),
  preparer: text("preparer"),
  signedOffBy: uuid("signed_off_by").references(() => users.id, { onDelete: "set null" }),
  signedOffAt: timestamp("signed_off_at", { withTimezone: true }),
  createdAt: created(),
});

export const proposalRequests = pgTable("proposal_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgTenantId: uuid("org_tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  firmTenantId: uuid("firm_tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  frameworkLabel: text("framework_label").notNull(),
  targetStart: text("target_start"),
  shareReadiness: boolean("share_readiness").notNull().default(true),
  status: text("status").notNull().default("Requested"), // Requested | Proposal sent | Accepted | Declined
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: created(),
});

// ---------------------------------------------------------------- platform
export const supportSessions = pgTable("support_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  adminUserId: uuid("admin_user_id").notNull().references(() => users.id),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  reason: text("reason").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const platformSettings = pgTable("platform_settings", {
  key: text("key").primaryKey(),
  enabled: boolean("enabled").notNull(),
  updatedAt: updated(),
});

/** Append-only (enforced by trigger in drizzle/0001_audit_log_append_only.sql). */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
    actorUserId: uuid("actor_user_id"),
    actorLabel: text("actor_label").notNull(),
    actorTenantId: uuid("actor_tenant_id"),
    tenantId: uuid("tenant_id"),
    action: text("action").notNull(),
    summary: text("summary").notNull(),
    detail: jsonb("detail"),
    ip: text("ip"),
  },
  (t) => [index("audit_tenant_idx").on(t.tenantId, t.at), index("audit_at_idx").on(t.at)]
);

export type User = typeof users.$inferSelect;
export type Tenant = typeof tenants.$inferSelect;
export type MemberRole = (typeof memberRole.enumValues)[number];
export type TenantType = (typeof tenantType.enumValues)[number];
