/**
 * AuditOps access model. Pure functions, safe in any runtime.
 *
 * Platform: super admin (users.is_super_admin). Created by script only.
 * Workspace roles (memberships.role): owner > admin > member > viewer.
 * Cross-tenant roles derived per request:
 *   contributor - a service provider acting inside a client organization
 *                 that granted provider_access
 *   support     - a super admin in a read-only support session
 */

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer" | "contributor" | "support";
export type TenantKind = "organization" | "auditor" | "provider";

export type Action =
  | "workspace.read"
  | "workspace.write" // controls, evidence, replies, tasks
  | "team.manage" // invite, change roles, remove members
  | "workspace.settings" // name, profile, frameworks
  | "engagement.create"
  | "audit.review" // accept / rework / findings / sampling / workpapers (auditor side)
  | "marketplace.request"
  | "provider.access.grant"; // org grants a provider contributor access

const RANK: Record<WorkspaceRole, number> = { owner: 4, admin: 3, member: 2, contributor: 2, viewer: 1, support: 0 };

export const ROLE_LABELS: Record<WorkspaceRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
  viewer: "Viewer (read-only)",
  contributor: "Contributor (provider)",
  support: "Support (read-only)",
};

export const ROLE_HELP: Record<"owner" | "admin" | "member" | "viewer", string> = {
  owner: "Everything, including deleting the workspace and transferring ownership.",
  admin: "Manages team, roles and settings, plus all member actions.",
  member: "Works on controls, evidence, requests and tasks.",
  viewer: "Read-only access to the workspace.",
};

export function can(role: WorkspaceRole | null | undefined, kind: TenantKind | null | undefined, action: Action): boolean {
  if (!role || !kind) return false;
  if (role === "support") return action === "workspace.read";
  const r = RANK[role];

  switch (action) {
    case "workspace.read":
      return r >= 1;
    case "workspace.write":
      return r >= 2;
    case "team.manage":
    case "workspace.settings":
      return role === "owner" || role === "admin";
    case "engagement.create":
      return kind === "auditor" && r >= 3;
    case "audit.review":
      return kind === "auditor" && r >= 2 && role !== "contributor";
    case "marketplace.request":
      return kind === "organization" && r >= 3 && role !== "contributor";
    case "provider.access.grant":
      return kind === "organization" && (role === "owner" || role === "admin");
  }
}

export const ASSIGNABLE_ROLES = ["admin", "member", "viewer"] as const;

/** Who may assign which role. Owners may assign anything below owner; admins may not create admins. */
export function canAssign(actor: WorkspaceRole, target: (typeof ASSIGNABLE_ROLES)[number]) {
  if (actor === "owner") return true;
  if (actor === "admin") return target !== "admin";
  return false;
}
