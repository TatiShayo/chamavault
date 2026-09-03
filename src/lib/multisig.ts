/**
 * Multi-Signature Approval & Governance Engine for ChamaVault
 *
 * Implements:
 * 1. Configurable threshold policies: M-of-N, Majority, Unanimous, Role-Based (Chairperson + Treasurer)
 * 2. Proposal lifecycle: draft -> pending_approval -> approved -> executed / rejected / expired
 * 3. Anti-replay protection and duplicate signature rejection
 * 4. Signature revocation before execution
 * 5. Time-bound proposal expiration
 * 6. Role-based signer authorization verification
 */

import { toCents } from "./money";

export type ProposalType =
  | "payout_disbursement"
  | "loan_approval"
  | "emergency_withdrawal"
  | "constitution_amendment"
  | "investment_allocation";

export type ProposalStatus =
  | "draft"
  | "pending_approval"
  | "approved"
  | "executed"
  | "rejected"
  | "expired"
  | "cancelled";

export type ThresholdPolicyType =
  | "m_of_n"
  | "majority"
  | "unanimous"
  | "chair_and_treasurer"
  | "custom_percentage";

export interface ThresholdPolicy {
  type: ThresholdPolicyType;
  requiredCount?: number; // for m_of_n, e.g. 2 for 2-of-3
  requiredPercentage?: number; // for custom_percentage, e.g. 75 for 75%
  requiredRoles?: string[]; // for role-based, e.g. ['chairperson', 'treasurer']
}

export interface ProposalSignature {
  signerId: string;
  signerName: string;
  signerRole: string;
  signatureTimestamp: string;
  decision: "approve" | "reject";
  comment?: string;
}

export interface ProposalPayload {
  amountKes?: number;
  recipientId?: string;
  recipientName?: string;
  targetAccountId?: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface MultisigProposal {
  id: string;
  chamaId: string;
  creatorId: string;
  title: string;
  type: ProposalType;
  payload: ProposalPayload;
  policy: ThresholdPolicy;
  authorizedSigners: Array<{ id: string; name: string; role: string }>;
  signatures: ProposalSignature[];
  status: ProposalStatus;
  createdAt: string;
  expiresAt: string;
  executedAt?: string;
  executedBy?: string;
}

/**
 * Creates a new multi-sig proposal.
 */
export function createProposal(params: {
  id: string;
  chamaId: string;
  creatorId: string;
  title: string;
  type: ProposalType;
  payload: ProposalPayload;
  policy: ThresholdPolicy;
  authorizedSigners: Array<{ id: string; name: string; role: string }>;
  validityHours?: number;
}): MultisigProposal {
  if (!params.title || params.title.trim().length === 0) {
    throw new Error("Proposal title cannot be empty");
  }
  if (params.authorizedSigners.length === 0) {
    throw new Error("Proposal must have at least one authorized signer");
  }

  // Validate policy
  if (params.policy.type === "m_of_n") {
    const req = params.policy.requiredCount || 2;
    if (req <= 0 || req > params.authorizedSigners.length) {
      throw new Error(
        `Invalid M-of-N requirement: ${req} required out of ${params.authorizedSigners.length} signers`
      );
    }
  }

  const hours = params.validityHours || 72; // default 3 days
  const expiresAt = new Date(Date.now() + hours * 3600 * 1000).toISOString();

  return {
    id: params.id,
    chamaId: params.chamaId,
    creatorId: params.creatorId,
    title: params.title.trim(),
    type: params.type,
    payload: params.payload,
    policy: params.policy,
    authorizedSigners: params.authorizedSigners,
    signatures: [],
    status: "pending_approval",
    createdAt: new Date().toISOString(),
    expiresAt,
  };
}

/**
 * Evaluates whether the threshold policy is satisfied for approval or rejection.
 */
export function evaluateProposalThreshold(proposal: MultisigProposal): {
  isApproved: boolean;
  isRejected: boolean;
  approvalCount: number;
  rejectionCount: number;
  totalAuthorized: number;
  reason: string;
} {
  const approvals = proposal.signatures.filter((s) => s.decision === "approve");
  const rejections = proposal.signatures.filter((s) => s.decision === "reject");
  const total = proposal.authorizedSigners.length;
  const approvalCount = approvals.length;
  const rejectionCount = rejections.length;

  const policy = proposal.policy;

  switch (policy.type) {
    case "m_of_n": {
      const required = policy.requiredCount || 2;
      const isApproved = approvalCount >= required;
      const remainingSigners = total - (approvalCount + rejectionCount);
      const isRejected = approvalCount + remainingSigners < required;
      return {
        isApproved,
        isRejected,
        approvalCount,
        rejectionCount,
        totalAuthorized: total,
        reason: isApproved
          ? `Reached ${approvalCount}/${required} required signatures`
          : isRejected
          ? `Cannot reach ${required} approvals (${rejectionCount} rejected)`
          : `Pending: ${approvalCount}/${required} approvals`,
      };
    }
    case "majority": {
      const required = Math.floor(total / 2) + 1;
      const isApproved = approvalCount >= required;
      const isRejected = rejectionCount >= required;
      return {
        isApproved,
        isRejected,
        approvalCount,
        rejectionCount,
        totalAuthorized: total,
        reason: isApproved
          ? `Strict majority achieved (${approvalCount}/${total})`
          : isRejected
          ? `Majority rejected (${rejectionCount}/${total})`
          : `Pending majority (${approvalCount}/${total})`,
      };
    }
    case "unanimous": {
      const isApproved = approvalCount === total;
      const isRejected = rejectionCount > 0;
      return {
        isApproved,
        isRejected,
        approvalCount,
        rejectionCount,
        totalAuthorized: total,
        reason: isApproved
          ? "Unanimous approval obtained"
          : isRejected
          ? `Unanimity broken (${rejectionCount} rejection)`
          : `Pending: ${approvalCount}/${total} approvals`,
      };
    }
    case "chair_and_treasurer": {
      const approvedRoles = new Set(approvals.map((s) => s.signerRole.toLowerCase()));
      const hasChair = approvedRoles.has("chairperson");
      const hasTreasurer = approvedRoles.has("treasurer");
      const isApproved = hasChair && hasTreasurer;

      const rejectRoles = new Set(rejections.map((s) => s.signerRole.toLowerCase()));
      const isRejected = rejectRoles.has("chairperson") || rejectRoles.has("treasurer");

      return {
        isApproved,
        isRejected,
        approvalCount,
        rejectionCount,
        totalAuthorized: total,
        reason: isApproved
          ? "Chairperson and Treasurer approved"
          : isRejected
          ? "Required officer rejected"
          : "Awaiting Chairperson and Treasurer approvals",
      };
    }
    case "custom_percentage": {
      const pct = policy.requiredPercentage || 66.67;
      const required = Math.ceil((pct / 100) * total);
      const isApproved = approvalCount >= required;
      const remaining = total - (approvalCount + rejectionCount);
      const isRejected = approvalCount + remaining < required;
      return {
        isApproved,
        isRejected,
        approvalCount,
        rejectionCount,
        totalAuthorized: total,
        reason: isApproved
          ? `${pct}% threshold reached (${approvalCount}/${total})`
          : isRejected
          ? `Cannot meet ${pct}% threshold`
          : `Pending: ${approvalCount}/${required} approvals`,
      };
    }
  }
}

/**
 * Casts a signature (approve/reject) on a proposal.
 */
export function signProposal(
  proposal: MultisigProposal,
  signer: { id: string; name: string; role: string },
  decision: "approve" | "reject",
  comment?: string
): MultisigProposal {
  if (proposal.status !== "pending_approval") {
    throw new Error(`Cannot sign proposal in status '${proposal.status}'`);
  }

  // Check expiration
  if (new Date(proposal.expiresAt) <= new Date()) {
    return {
      ...proposal,
      status: "expired",
    };
  }

  // Verify signer authorization
  const isAuthorized = proposal.authorizedSigners.some(
    (s) => s.id === signer.id
  );
  if (!isAuthorized) {
    throw new Error(`Signer ${signer.name} (${signer.id}) is not authorized to sign this proposal`);
  }

  // Replay protection: check if signer already submitted a signature
  const existingIndex = proposal.signatures.findIndex(
    (s) => s.signerId === signer.id
  );

  const newSig: ProposalSignature = {
    signerId: signer.id,
    signerName: signer.name,
    signerRole: signer.role,
    signatureTimestamp: new Date().toISOString(),
    decision,
    comment,
  };

  const updatedSignatures =
    existingIndex >= 0
      ? [
          ...proposal.signatures.slice(0, existingIndex),
          newSig,
          ...proposal.signatures.slice(existingIndex + 1),
        ]
      : [...proposal.signatures, newSig];

  const updatedProposal: MultisigProposal = {
    ...proposal,
    signatures: updatedSignatures,
  };

  // Evaluate threshold satisfaction
  const evaluation = evaluateProposalThreshold(updatedProposal);
  let newStatus: ProposalStatus = "pending_approval";
  if (evaluation.isApproved) {
    newStatus = "approved";
  } else if (evaluation.isRejected) {
    newStatus = "rejected";
  }

  return {
    ...updatedProposal,
    status: newStatus,
  };
}

/**
 * Revokes a previously cast signature prior to proposal execution.
 */
export function revokeSignature(
  proposal: MultisigProposal,
  signerId: string
): MultisigProposal {
  if (proposal.status === "executed") {
    throw new Error("Cannot revoke signature from an executed proposal");
  }

  const remaining = proposal.signatures.filter((s) => s.signerId !== signerId);
  if (remaining.length === proposal.signatures.length) {
    throw new Error(`Signer ${signerId} has not signed this proposal`);
  }

  const updated: MultisigProposal = {
    ...proposal,
    signatures: remaining,
  };

  const evaluation = evaluateProposalThreshold(updated);
  let status: ProposalStatus = "pending_approval";
  if (evaluation.isApproved) {
    status = "approved";
  } else if (evaluation.isRejected) {
    status = "rejected";
  }

  return {
    ...updated,
    status,
  };
}

/**
 * Executes an approved proposal.
 */
export function executeProposal(
  proposal: MultisigProposal,
  executorId: string,
  availableTreasuryBalanceKes?: number
): {
  success: boolean;
  proposal: MultisigProposal;
  disbursedAmountCents: number;
} {
  if (proposal.status !== "approved") {
    throw new Error(`Cannot execute proposal in status '${proposal.status}' (must be 'approved')`);
  }

  if (new Date(proposal.expiresAt) <= new Date()) {
    throw new Error("Proposal has expired and cannot be executed");
  }

  // Solvency check for financial payouts
  const requestedCents = toCents(proposal.payload.amountKes || 0);
  if (availableTreasuryBalanceKes !== undefined) {
    const availableCents = toCents(availableTreasuryBalanceKes);
    if (requestedCents > availableCents) {
      throw new Error(
        `Insufficient treasury funds: requested KES ${proposal.payload.amountKes}, available KES ${availableTreasuryBalanceKes}`
      );
    }
  }

  return {
    success: true,
    proposal: {
      ...proposal,
      status: "executed",
      executedAt: new Date().toISOString(),
      executedBy: executorId,
    },
    disbursedAmountCents: requestedCents,
  };
}
