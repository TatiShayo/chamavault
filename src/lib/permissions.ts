/**
 * Role-Based Access Control (RBAC) & Authorization Matrix for ChamaVault
 *
 * Implements:
 * 1. Strict hierarchical role permissions (Chairperson, Treasurer, Secretary, Member, Auditor, Guest)
 * 2. IDOR / BOLA prevention helpers for tenant and resource isolation
 * 3. Officer privilege boundaries and role promotion/demotion governance rules
 * 4. Comprehensive permission assertion guards
 */

export type ChamaRole =
  | "chairperson"
  | "treasurer"
  | "secretary"
  | "member"
  | "auditor"
  | "guest";

export type ChamaAction =
  // Chama profile & settings
  | "chama:view"
  | "chama:edit_profile"
  | "chama:manage_settings"
  | "chama:delete"
  | "chama:export_data"
  // Member management
  | "members:view_list"
  | "members:invite"
  | "members:change_role"
  | "members:remove"
  | "members:view_details"
  // Contributions
  | "contributions:view_own"
  | "contributions:view_all"
  | "contributions:record"
  | "contributions:adjust"
  // Loans
  | "loans:apply"
  | "loans:view_own"
  | "loans:view_all"
  | "loans:approve"
  | "loans:reject"
  | "loans:disburse"
  | "loans:record_repayment"
  | "loans:mark_repaid"
  // Dividends
  | "dividends:preview"
  | "dividends:distribute"
  | "dividends:view_all"
  | "dividends:view_own"
  // Expenses
  | "expenses:view"
  | "expenses:create"
  | "expenses:delete"
  // Fines
  | "fines:view_own"
  | "fines:view_all"
  | "fines:issue"
  | "fines:mark_paid"
  | "fines:waive"
  // Meetings & Minutes
  | "meetings:view"
  | "meetings:create"
  | "meetings:edit_minutes"
  | "meetings:mark_attendance"
  | "meetings:generate_pdf"
  | "ai:generate_minutes"
  // Voting & Resolutions
  | "votes:view"
  | "votes:create_resolution"
  | "votes:cast_vote"
  | "votes:close"
  // Board Members
  | "board:view"
  | "board:appoint"
  | "board:update"
  | "board:remove"
  // Constitution
  | "constitution:view"
  | "constitution:upload"
  | "constitution:delete"
  // Multi-Sig & ROSCA
  | "multisig:create_proposal"
  | "multisig:sign"
  | "multisig:execute"
  | "rosca:create_cycle"
  | "rosca:record_payment"
  | "rosca:disburse_pot"
  | "rosca:handle_default";

/**
 * Authorization Matrix mapping Role -> Allowed Actions
 */
const ROLE_PERMISSIONS: Record<ChamaRole, Set<ChamaAction>> = {
  chairperson: new Set<ChamaAction>([
    "chama:view",
    "chama:edit_profile",
    "chama:manage_settings",
    "chama:delete",
    "chama:export_data",
    "members:view_list",
    "members:invite",
    "members:change_role",
    "members:remove",
    "members:view_details",
    "contributions:view_own",
    "contributions:view_all",
    "contributions:record",
    "contributions:adjust",
    "loans:apply",
    "loans:view_own",
    "loans:view_all",
    "loans:approve",
    "loans:reject",
    "loans:disburse",
    "loans:record_repayment",
    "loans:mark_repaid",
    "dividends:preview",
    "dividends:distribute",
    "dividends:view_all",
    "dividends:view_own",
    "expenses:view",
    "expenses:create",
    "expenses:delete",
    "fines:view_own",
    "fines:view_all",
    "fines:issue",
    "fines:mark_paid",
    "fines:waive",
    "meetings:view",
    "meetings:create",
    "meetings:edit_minutes",
    "meetings:mark_attendance",
    "meetings:generate_pdf",
    "ai:generate_minutes",
    "votes:view",
    "votes:create_resolution",
    "votes:cast_vote",
    "votes:close",
    "board:view",
    "board:appoint",
    "board:update",
    "board:remove",
    "constitution:view",
    "constitution:upload",
    "constitution:delete",
    "multisig:create_proposal",
    "multisig:sign",
    "multisig:execute",
    "rosca:create_cycle",
    "rosca:record_payment",
    "rosca:disburse_pot",
    "rosca:handle_default",
  ]),

  treasurer: new Set<ChamaAction>([
    "chama:view",
    "chama:edit_profile",
    "chama:export_data",
    "members:view_list",
    "members:invite",
    "members:view_details",
    "contributions:view_own",
    "contributions:view_all",
    "contributions:record",
    "contributions:adjust",
    "loans:apply",
    "loans:view_own",
    "loans:view_all",
    "loans:approve",
    "loans:reject",
    "loans:disburse",
    "loans:record_repayment",
    "loans:mark_repaid",
    "dividends:preview",
    "dividends:distribute",
    "dividends:view_all",
    "dividends:view_own",
    "expenses:view",
    "expenses:create",
    "expenses:delete",
    "fines:view_own",
    "fines:view_all",
    "fines:issue",
    "fines:mark_paid",
    "meetings:view",
    "meetings:generate_pdf",
    "votes:view",
    "votes:cast_vote",
    "board:view",
    "constitution:view",
    "multisig:create_proposal",
    "multisig:sign",
    "multisig:execute",
    "rosca:create_cycle",
    "rosca:record_payment",
    "rosca:disburse_pot",
    "rosca:handle_default",
  ]),

  secretary: new Set<ChamaAction>([
    "chama:view",
    "chama:edit_profile",
    "chama:export_data",
    "members:view_list",
    "members:invite",
    "members:view_details",
    "contributions:view_own",
    "contributions:view_all",
    "loans:apply",
    "loans:view_own",
    "loans:view_all",
    "dividends:view_all",
    "dividends:view_own",
    "expenses:view",
    "fines:view_own",
    "fines:view_all",
    "fines:issue",
    "meetings:view",
    "meetings:create",
    "meetings:edit_minutes",
    "meetings:mark_attendance",
    "meetings:generate_pdf",
    "ai:generate_minutes",
    "votes:view",
    "votes:create_resolution",
    "votes:cast_vote",
    "votes:close",
    "board:view",
    "constitution:view",
    "constitution:upload",
    "multisig:create_proposal",
    "multisig:sign",
  ]),

  member: new Set<ChamaAction>([
    "chama:view",
    "members:view_list",
    "contributions:view_own",
    "loans:apply",
    "loans:view_own",
    "dividends:view_own",
    "expenses:view",
    "fines:view_own",
    "meetings:view",
    "votes:view",
    "votes:cast_vote",
    "board:view",
    "constitution:view",
  ]),

  auditor: new Set<ChamaAction>([
    "chama:view",
    "chama:export_data",
    "members:view_list",
    "members:view_details",
    "contributions:view_all",
    "loans:view_all",
    "dividends:view_all",
    "expenses:view",
    "fines:view_all",
    "meetings:view",
    "meetings:generate_pdf",
    "votes:view",
    "board:view",
    "constitution:view",
  ]),

  guest: new Set<ChamaAction>([
    "chama:view",
  ]),
};

/**
 * Checks if a given role is allowed to perform an action.
 */
export function hasPermission(
  role: ChamaRole | string | undefined | null,
  action: ChamaAction
): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase() as ChamaRole;
  const permissions = ROLE_PERMISSIONS[normalized];
  if (!permissions) return false;
  return permissions.has(action);
}

/**
 * Asserts that a given role has the requested permission, throwing a 403 Forbidden error if not.
 */
export function assertPermission(
  role: ChamaRole | string | undefined | null,
  action: ChamaAction
): void {
  if (!hasPermission(role, action)) {
    throw new Error(`Forbidden: Role '${role || "unknown"}' lacks permission for '${action}'`);
  }
}

/**
 * Returns true if the role is an officer role (chairperson, treasurer, secretary).
 */
export function isOfficer(role: ChamaRole | string | undefined | null): boolean {
  if (!role) return false;
  const normalized = role.toLowerCase();
  return ["chairperson", "treasurer", "secretary"].includes(normalized);
}

/**
 * Validates role changes, enforcing governance rules:
 * - Only Chairperson can appoint new Chairperson or Treasurer
 * - Cannot change own role
 * - Cannot demote last remaining Chairperson
 */
export function canChangeMemberRole(params: {
  actorId: string;
  actorRole: ChamaRole | string;
  targetId: string;
  targetCurrentRole: ChamaRole | string;
  targetNewRole: ChamaRole | string;
  totalChairpersonsInChama: number;
}): { allowed: boolean; error?: string } {
  const actorRole = params.actorRole.toLowerCase() as ChamaRole;
  const targetCurrent = params.targetCurrentRole.toLowerCase() as ChamaRole;
  const targetNew = params.targetNewRole.toLowerCase() as ChamaRole;

  if (!isOfficer(actorRole)) {
    return { allowed: false, error: "Only officers can change member roles" };
  }

  // Prevent officers from changing their own role
  if (params.actorId === params.targetId) {
    return { allowed: false, error: "Officers cannot change their own role" };
  }

  // Only Chairperson can promote someone to Chairperson or Treasurer
  if (
    (targetNew === "chairperson" || targetNew === "treasurer") &&
    actorRole !== "chairperson"
  ) {
    return {
      allowed: false,
      error: "Only the Chairperson can assign Chairperson or Treasurer roles",
    };
  }

  // Prevent demoting the only Chairperson
  if (
    targetCurrent === "chairperson" &&
    targetNew !== "chairperson" &&
    params.totalChairpersonsInChama <= 1
  ) {
    return {
      allowed: false,
      error: "Cannot demote the only Chairperson. Appoint a new Chairperson first.",
    };
  }

  return { allowed: true };
}

/**
 * IDOR / BOLA Prevention helper:
 * Verifies that the actor either owns the resource or has officer permissions to access it.
 */
export function verifyResourceAccess(params: {
  actorMembershipId: string;
  actorRole: ChamaRole | string;
  resourceOwnerMemberId: string;
  officerAction: ChamaAction;
  ownAction: ChamaAction;
}): { allowed: boolean; reason?: string } {
  const isOwner = params.actorMembershipId === params.resourceOwnerMemberId;
  if (isOwner && hasPermission(params.actorRole, params.ownAction)) {
    return { allowed: true };
  }

  if (isOfficer(params.actorRole) && hasPermission(params.actorRole, params.officerAction)) {
    return { allowed: true };
  }

  return {
    allowed: false,
    reason: isOwner
      ? `Member lacks permission '${params.ownAction}'`
      : `Cannot access resources of another member without '${params.officerAction}' privilege`,
  };
}
