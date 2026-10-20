// Fixed Role-Permission Matrix based on SRS Section 12.2 and Section 12.3

export type OrganizationRole =
  | "Owner"
  | "Admin"
  | "EventManager"
  | "FinanceManager"
  | "VendorCoordinator"
  | "Staff"
  | "Client"
  | "Vendor";

// FR-07: Built-in platform roles and organization roles
export type PlatformRole = "SaaS Super Admin" | "Platform Support Admin";

export type Role =
  | OrganizationRole
  | "Event Manager"
  | "Finance Manager"
  | "Vendor Coordinator"
  | "External Vendor"
  | PlatformRole;

export type Permission =
  | "org:settings:view"
  | "org:settings:edit"
  | "org:delete"
  | "org:billing:manage"
  | "member:view"
  | "member:invite"
  | "member:update_role"
  | "member:suspend"
  | "member:remove"
  | "event:view"
  | "event:create"
  | "event:edit"
  | "event:delete"
  | "event:transition_status"
  | "task:manage"
  | "vendor:view"
  | "vendor:manage"
  | "client:view"
  | "client:manage"
  | "finance:view"
  | "finance:manage"
  | "document:view"
  | "document:manage"
  | "document:share_client"
  | "message:view"
  | "message:post"
  | "attendee:manage"
  | "audit:view"
  | "platform:manage";

export const ROLE_DEFINITIONS: Record<string, { name: string; description: string; boundaries: string }> = {
  Owner: {
    name: "Organization Owner",
    description: "Account owner with unconditional operational & billing authority",
    boundaries: "Can manage billing, delete workspace, invite and manage all members. At least one owner always exists.",
  },
  Admin: {
    name: "Organization Administrator",
    description: "Operations lead managing team members, templates, settings",
    boundaries: "Full operational access. Cannot modify subscription billing or remove/demote the owner.",
  },
  EventManager: {
    name: "Event Manager",
    description: "Creates and runs events, run-sheets, tasks, client/vendor assignments, and team invitations",
    boundaries: "Full event operations and team invitations; no workspace billing/organization settings.",
  },
  "Event Manager": {
    name: "Event Manager",
    description: "Creates and runs events, run-sheets, tasks, client/vendor assignments, and team invitations",
    boundaries: "Full event operations and team invitations; no workspace billing/organization settings.",
  },
  FinanceManager: {
    name: "Finance Manager",
    description: "Controls event budgets, actual expenses, invoices, and payment milestones",
    boundaries: "Access to financial ledgers and reports; limited edit access to event timelines.",
  },
  "Finance Manager": {
    name: "Finance Manager",
    description: "Controls event budgets, actual expenses, invoices, and payment milestones",
    boundaries: "Access to financial ledgers and reports; limited edit access to event timelines.",
  },
  VendorCoordinator: {
    name: "Vendor Coordinator",
    description: "Manages vendor CRM directory, quotations, bookings, and double-booking checks",
    boundaries: "Vendor management and vendor-linked event bookings; no client financial data.",
  },
  "Vendor Coordinator": {
    name: "Vendor Coordinator",
    description: "Manages vendor CRM directory, quotations, bookings, and double-booking checks",
    boundaries: "Vendor management and vendor-linked event bookings; no client financial data.",
  },
  Staff: {
    name: "Team Member / Staff",
    description: "Executes assigned tasks, reviews event schedules and run sheets",
    boundaries: "Access restricted strictly to assigned tasks and assigned event items.",
  },
  Client: {
    name: "Client / Event Stakeholder",
    description: "External customer reviewing progress, approving items, and communicating",
    boundaries: "Only items explicitly marked as shared for their specific event. Internal notes & margins hidden.",
  },
  Vendor: {
    name: "External Vendor",
    description: "External service provider confirming bookings and submitting quotations",
    boundaries: "Only their own vendor profile, confirmed bookings, and shared documents.",
  },
  "External Vendor": {
    name: "External Vendor",
    description: "External service provider confirming bookings and submitting quotations",
    boundaries: "Only their own vendor profile, confirmed bookings, and shared documents.",
  },
  "SaaS Super Admin": {
    name: "SaaS Super Admin",
    description: "Platform-level operations, system metrics, and tenant lifecycle maintenance",
    boundaries: "Zero default visibility into tenant business data (tenant events, tasks, budgets).",
  },
  "Platform Support Admin": {
    name: "Platform Support Admin",
    description: "Platform-level diagnostics, audit health, and system infrastructure support",
    boundaries: "Zero default visibility into tenant business data without explicit tenant permission.",
  },
};

/**
 * Normalizes role string to canonical key for permission lookup
 */
export function normalizeRole(role: string): OrganizationRole | PlatformRole | string {
  if (!role) return "Staff";
  if (role === "Event Manager") return "EventManager";
  if (role === "Finance Manager") return "FinanceManager";
  if (role === "Vendor Coordinator") return "VendorCoordinator";
  if (role === "External Vendor") return "Vendor";
  return role;
}

/**
 * Returns human-readable display label for any role
 */
export function getRoleDisplayName(role: string | null | undefined): string {
  if (!role) return "Organization Owner";
  switch (role) {
    case "Owner":
      return "Organization Owner";
    case "Admin":
      return "Organization Admin";
    case "EventManager":
    case "Event Manager":
      return "Event & Production Manager";
    case "FinanceManager":
    case "Finance Manager":
      return "Finance & Billing Director";
    case "VendorCoordinator":
    case "Vendor Coordinator":
      return "Vendor Coordinator";
    case "Vendor":
    case "External Vendor":
      return "Vendor & Service Partner";
    case "Staff":
      return "Operations & Crew Staff";
    case "Client":
      return "Client Stakeholder";
    case "SaaS Super Admin":
      return "Platform Super Admin";
    case "Platform Support Admin":
      return "Platform Support Admin";
    default:
      return role;
  }
}

// Explicit Role-Permission Mapping (Deny by default)
export const ROLE_PERMISSIONS: Record<string, readonly Permission[]> = {
  Owner: [
    "org:settings:view",
    "org:settings:edit",
    "org:delete",
    "org:billing:manage",
    "member:view",
    "member:invite",
    "member:update_role",
    "member:suspend",
    "member:remove",
    "event:view",
    "event:create",
    "event:edit",
    "event:delete",
    "event:transition_status",
    "task:manage",
    "vendor:view",
    "vendor:manage",
    "client:view",
    "client:manage",
    "finance:view",
    "finance:manage",
    "document:view",
    "document:manage",
    "document:share_client",
    "message:view",
    "message:post",
    "attendee:manage",
    "audit:view",
  ],
  Admin: [
    "org:settings:view",
    "org:settings:edit",
    "member:view",
    "member:invite",
    "member:update_role",
    "member:suspend",
    "member:remove",
    "event:view",
    "event:create",
    "event:edit",
    "event:delete",
    "event:transition_status",
    "task:manage",
    "vendor:view",
    "vendor:manage",
    "client:view",
    "client:manage",
    "finance:view",
    "finance:manage",
    "document:view",
    "document:manage",
    "document:share_client",
    "message:view",
    "message:post",
    "attendee:manage",
    "audit:view",
  ],
  EventManager: [
    "org:settings:view",
    "member:view",
    "member:invite",
    "event:view",
    "event:create",
    "event:edit",
    "event:transition_status",
    "task:manage",
    "vendor:view",
    "vendor:manage",
    "client:view",
    "client:manage",
    "document:view",
    "document:manage",
    "document:share_client",
    "message:view",
    "message:post",
    "attendee:manage",
  ],
  "Event Manager": [
    "org:settings:view",
    "member:view",
    "member:invite",
    "event:view",
    "event:create",
    "event:edit",
    "event:transition_status",
    "task:manage",
    "vendor:view",
    "vendor:manage",
    "client:view",
    "client:manage",
    "document:view",
    "document:manage",
    "document:share_client",
    "message:view",
    "message:post",
    "attendee:manage",
  ],
  FinanceManager: [
    "org:settings:view",
    "event:view",
    "client:view",
    "finance:view",
    "finance:manage",
    "document:view",
    "message:view",
    "message:post",
  ],
  "Finance Manager": [
    "org:settings:view",
    "event:view",
    "client:view",
    "finance:view",
    "finance:manage",
    "document:view",
    "message:view",
    "message:post",
  ],
  VendorCoordinator: [
    "org:settings:view",
    "event:view",
    "vendor:view",
    "vendor:manage",
    "document:view",
    "message:view",
    "message:post",
  ],
  "Vendor Coordinator": [
    "org:settings:view",
    "event:view",
    "vendor:view",
    "vendor:manage",
    "document:view",
    "message:view",
    "message:post",
  ],
  Staff: [
    "event:view",
    "task:manage",
    "document:view",
    "message:view",
    "message:post",
    "attendee:manage",
  ],
  Client: [
    "event:view",
    "document:view",
    "message:view",
    "message:post",
  ],
  Vendor: [
    "event:view",
    "vendor:view",
    "document:view",
    "message:view",
    "message:post",
  ],
  "External Vendor": [
    "event:view",
    "vendor:view",
    "document:view",
    "message:view",
    "message:post",
  ],
  // Platform roles have zero default visibility into tenant business data
  "SaaS Super Admin": [
    "platform:manage",
  ],
  "Platform Support Admin": [
    "platform:manage",
  ],
};

/**
 * Evaluates whether a role possesses a permission.
 * Deny by default: If permission is not explicitly listed, false is returned.
 */
export function hasPermission(role: Role | string, permission: Permission): boolean {
  const canonical = normalizeRole(role);
  const allowed = ROLE_PERMISSIONS[canonical] || ROLE_PERMISSIONS[role];
  if (!allowed) return false;
  return allowed.includes(permission);
}
