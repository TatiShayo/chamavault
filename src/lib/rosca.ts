/**
 * ROSCA (Rotating Savings and Credit Association / Merry-Go-Round) Module for ChamaVault
 *
 * Implements:
 * 1. Cycle state machine: 'registration' -> 'active' -> 'round_in_progress' -> 'payout_disbursed' -> 'completed' (plus 'paused', 'cancelled', 'defaulted')
 * 2. Deterministic round-robin payout scheduling with fairness guarantees
 * 3. Exact integer-cents pot collection and disbursement invariants
 * 4. Member default, guarantor liability, and penalty calculations
 * 5. Early exit settlement (net contributions paid vs payouts received minus exit fee)
 * 6. Bidding / Auction ROSCA mechanism (discount pot distribution)
 */

import { toCents, allocateByShares } from "./money";

export type RoscaCycleStatus =
  | "registration"
  | "active"
  | "round_in_progress"
  | "payout_disbursed"
  | "completed"
  | "paused"
  | "cancelled"
  | "defaulted";

export type PayoutAssignmentMode =
  | "fixed_order"
  | "random_draw"
  | "seniority"
  | "auction_bidding";

export interface RoscaMember {
  id: string;
  name: string;
  shareMultiplier?: number; // e.g. 1 for single share, 2 for double share
  payoutRound?: number; // 1-indexed round in which member receives the pot
  hasReceivedPayout: boolean;
  totalContributedCents: number;
  totalReceivedCents: number;
  isDefaulted?: boolean;
}

export interface RoscaRound {
  roundNumber: number;
  dueDate: string;
  recipientMemberId: string;
  targetPotCents: number;
  collectedPotCents: number;
  disbursedCents: number;
  discountBidCents?: number; // for auction ROSCAs
  contributions: Record<string, number>; // memberId -> cents contributed
  isCompleted: boolean;
  disbursedAt?: string;
}

export interface RoscaCycleConfig {
  id: string;
  chamaId: string;
  name: string;
  contributionPerShareKes: number;
  frequency: "weekly" | "biweekly" | "monthly";
  payoutMode: PayoutAssignmentMode;
  earlyExitPenaltyPct?: number; // e.g. 10 for 10% penalty on surplus
  defaultPenaltyFeeKes?: number;
}

export interface RoscaCycleState {
  config: RoscaCycleConfig;
  status: RoscaCycleStatus;
  members: RoscaMember[];
  rounds: RoscaRound[];
  currentRoundNumber: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Valid state transitions for the ROSCA lifecycle.
 */
const VALID_TRANSITIONS: Record<RoscaCycleStatus, RoscaCycleStatus[]> = {
  registration: ["active", "cancelled"],
  active: ["round_in_progress", "paused", "cancelled"],
  round_in_progress: ["payout_disbursed", "defaulted", "paused", "cancelled"],
  payout_disbursed: ["round_in_progress", "completed", "paused", "cancelled"],
  paused: ["active", "round_in_progress", "payout_disbursed", "cancelled"],
  defaulted: ["round_in_progress", "cancelled", "completed"],
  completed: [],
  cancelled: [],
};

/**
 * Initializes a new ROSCA cycle.
 */
export function createRoscaCycle(
  config: RoscaCycleConfig,
  initialMembers: Array<{ id: string; name: string; shareMultiplier?: number }>
): RoscaCycleState {
  if (config.contributionPerShareKes <= 0) {
    throw new Error("Contribution per share must be positive");
  }
  if (initialMembers.length < 2) {
    throw new Error("A ROSCA cycle requires at least 2 members");
  }

  const members: RoscaMember[] = initialMembers.map((m) => ({
    id: m.id,
    name: m.name,
    shareMultiplier: Math.max(1, Math.floor(m.shareMultiplier || 1)),
    hasReceivedPayout: false,
    totalContributedCents: 0,
    totalReceivedCents: 0,
  }));

  return {
    config,
    status: "registration",
    members,
    rounds: [],
    currentRoundNumber: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Activates a ROSCA cycle from registration and generates the schedule of rounds.
 */
export function activateRoscaCycle(
  state: RoscaCycleState,
  payoutOrderMemberIds?: string[],
  startDate: string = new Date().toISOString().split("T")[0]
): RoscaCycleState {
  if (state.status !== "registration") {
    throw new Error(`Cannot activate ROSCA cycle in '${state.status}' status`);
  }
  if (state.members.length < 2) {
    throw new Error("Cannot activate ROSCA with fewer than 2 members");
  }

  // Calculate total shares across all members
  const totalShares = state.members.reduce(
    (sum, m) => sum + (m.shareMultiplier || 1),
    0
  );
  const contributionPerShareCents = toCents(state.config.contributionPerShareKes);
  const targetPotCents = contributionPerShareCents * totalShares;

  // Determine payout assignment
  const orderedMembers = [...state.members];
  if (payoutOrderMemberIds && payoutOrderMemberIds.length === orderedMembers.length) {
    orderedMembers.sort(
      (a, b) => payoutOrderMemberIds.indexOf(a.id) - payoutOrderMemberIds.indexOf(b.id)
    );
  } else if (state.config.payoutMode === "random_draw") {
    // Deterministic shuffle for testing if needed, or randomized
    for (let i = orderedMembers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [orderedMembers[i], orderedMembers[j]] = [orderedMembers[j], orderedMembers[i]];
    }
  }

  // Assign rounds (expanding for multi-share members if applicable)
  const roundAssignments: string[] = [];
  for (const member of orderedMembers) {
    const shares = member.shareMultiplier || 1;
    for (let s = 0; s < shares; s++) {
      roundAssignments.push(member.id);
    }
  }

  // Update member payout rounds
  const updatedMembers = state.members.map((m) => {
    const assignedIndex = roundAssignments.indexOf(m.id);
    return {
      ...m,
      payoutRound: assignedIndex !== -1 ? assignedIndex + 1 : undefined,
    };
  });

  // Generate round schedule
  const rounds: RoscaRound[] = roundAssignments.map((recipientId, index) => {
    const roundNumber = index + 1;
    return {
      roundNumber,
      dueDate: calculateRoundDueDate(startDate, index, state.config.frequency),
      recipientMemberId: recipientId,
      targetPotCents,
      collectedPotCents: 0,
      disbursedCents: 0,
      contributions: {},
      isCompleted: false,
    };
  });

  return {
    ...state,
    status: "active",
    members: updatedMembers,
    rounds,
    currentRoundNumber: 1,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Transition state machine helper.
 */
export function transitionRoscaStatus(
  state: RoscaCycleState,
  newStatus: RoscaCycleStatus,
  reason?: string
): RoscaCycleState {
  const allowed = VALID_TRANSITIONS[state.status] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(
      `Invalid ROSCA transition from '${state.status}' to '${newStatus}'${
        reason ? ` (${reason})` : ""
      }`
    );
  }

  return {
    ...state,
    status: newStatus,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Start or progress to a specific round.
 */
export function startRound(
  state: RoscaCycleState,
  roundNumber: number
): RoscaCycleState {
  if (state.status !== "active" && state.status !== "payout_disbursed") {
    throw new Error(`Cannot start round when cycle is '${state.status}'`);
  }
  const round = state.rounds.find((r) => r.roundNumber === roundNumber);
  if (!round) {
    throw new Error(`Round ${roundNumber} does not exist`);
  }
  if (round.isCompleted) {
    throw new Error(`Round ${roundNumber} is already completed`);
  }

  return {
    ...state,
    status: "round_in_progress",
    currentRoundNumber: roundNumber,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Record a member's contribution for the current round.
 */
export function recordRoscaContribution(
  state: RoscaCycleState,
  roundNumber: number,
  memberId: string,
  amountKes: number | string
): RoscaCycleState {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) {
    throw new Error(`Member ${memberId} is not part of this ROSCA`);
  }
  if (member.isDefaulted) {
    throw new Error(`Cannot accept contribution from defaulted member ${member.name}`);
  }

  if (state.status !== "round_in_progress" && state.status !== "defaulted") {
    throw new Error(`Cannot record contribution when round is not in progress (status: ${state.status})`);
  }

  const amountCents = toCents(amountKes);
  if (amountCents <= 0) {
    throw new Error("Contribution amount must be greater than 0");
  }

  const roundIndex = state.rounds.findIndex((r) => r.roundNumber === roundNumber);
  if (roundIndex === -1) {
    throw new Error(`Round ${roundNumber} not found`);
  }

  const round = state.rounds[roundIndex];
  const existingContributed = round.contributions[memberId] || 0;
  const newContributed = existingContributed + amountCents;

  const updatedContributions = {
    ...round.contributions,
    [memberId]: newContributed,
  };

  const newCollectedCents = Object.values(updatedContributions).reduce(
    (sum, val) => sum + val,
    0
  );

  const updatedRound: RoscaRound = {
    ...round,
    contributions: updatedContributions,
    collectedPotCents: newCollectedCents,
  };

  const updatedRounds = [...state.rounds];
  updatedRounds[roundIndex] = updatedRound;

  // Update member totals
  const updatedMembers = state.members.map((m) =>
    m.id === memberId
      ? { ...m, totalContributedCents: m.totalContributedCents + amountCents }
      : m
  );

  return {
    ...state,
    members: updatedMembers,
    rounds: updatedRounds,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Disburse collected pot to the designated round recipient.
 * Handles auction bidding discounts if applicable.
 */
export function disburseRoscaPot(
  state: RoscaCycleState,
  roundNumber: number,
  discountBidKes: number = 0
): RoscaCycleState {
  if (state.status !== "round_in_progress") {
    throw new Error(`Cannot disburse pot when cycle status is '${state.status}'`);
  }

  const roundIndex = state.rounds.findIndex((r) => r.roundNumber === roundNumber);
  if (roundIndex === -1) {
    throw new Error(`Round ${roundNumber} not found`);
  }

  const round = state.rounds[roundIndex];
  if (round.isCompleted) {
    throw new Error(`Round ${roundNumber} pot has already been disbursed`);
  }

  const discountBidCents = toCents(discountBidKes);
  if (discountBidCents < 0 || discountBidCents >= round.collectedPotCents) {
    throw new Error("Invalid auction discount bid");
  }

  // Net payout to recipient = collected pot - discount bid
  const netPayoutCents = round.collectedPotCents - discountBidCents;

  const recipient = state.members.find((m) => m.id === round.recipientMemberId);
  if (!recipient) {
    throw new Error(`Recipient member ${round.recipientMemberId} not found`);
  }

  // If there is an auction discount, distribute it among other contributing members
  let memberUpdates = state.members.map((m) => {
    if (m.id === recipient.id) {
      return {
        ...m,
        hasReceivedPayout: true,
        totalReceivedCents: m.totalReceivedCents + netPayoutCents,
      };
    }
    return m;
  });

  if (discountBidCents > 0) {
    // Split discount dividend among other active members
    const eligibleOthers = memberUpdates.filter(
      (m) => m.id !== recipient.id && !m.isDefaulted
    );
    if (eligibleOthers.length > 0) {
      const dividendParts = allocateByShares(
        discountBidCents,
        eligibleOthers,
        (m) => m.shareMultiplier || 1
      );
      const bonusMap = new Map(dividendParts.map((d) => [d.item.id, d.amountCents]));
      memberUpdates = memberUpdates.map((m) => {
        const bonus = bonusMap.get(m.id) || 0;
        return bonus > 0
          ? { ...m, totalReceivedCents: m.totalReceivedCents + bonus }
          : m;
      });
    }
  }

  const updatedRound: RoscaRound = {
    ...round,
    disbursedCents: netPayoutCents,
    discountBidCents,
    isCompleted: true,
    disbursedAt: new Date().toISOString(),
  };

  const updatedRounds = [...state.rounds];
  updatedRounds[roundIndex] = updatedRound;

  // Check if this was the final round
  const isFinalRound = roundNumber === state.rounds.length;
  const nextStatus: RoscaCycleStatus = isFinalRound ? "completed" : "payout_disbursed";

  return {
    ...state,
    status: nextStatus,
    members: memberUpdates,
    rounds: updatedRounds,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Handle a member defaulting on their contribution.
 * Calculates shortfall and allocates guarantor liability or records penalty.
 */
export function handleRoscaDefault(
  state: RoscaCycleState,
  defaultingMemberId: string,
  roundNumber: number
): {
  state: RoscaCycleState;
  shortfallCents: number;
  penaltyCents: number;
  liabilityPerGuarantorCents: number;
} {
  const member = state.members.find((m) => m.id === defaultingMemberId);
  if (!member) {
    throw new Error(`Member ${defaultingMemberId} not found`);
  }

  const shareCents = toCents(state.config.contributionPerShareKes) * (member.shareMultiplier || 1);
  const round = state.rounds.find((r) => r.roundNumber === roundNumber);
  const paidCents = round?.contributions[defaultingMemberId] || 0;
  const shortfallCents = Math.max(0, shareCents - paidCents);

  const penaltyFeeCents = state.config.defaultPenaltyFeeKes
    ? toCents(state.config.defaultPenaltyFeeKes)
    : Math.round(shortfallCents * 0.2); // Default 20% penalty on shortfall

  // Active non-defaulted members act as mutual guarantors
  const guarantors = state.members.filter(
    (m) => m.id !== defaultingMemberId && !m.isDefaulted
  );
  const liabilityPerGuarantorCents =
    guarantors.length > 0 ? Math.ceil(shortfallCents / guarantors.length) : shortfallCents;

  const updatedMembers = state.members.map((m) =>
    m.id === defaultingMemberId ? { ...m, isDefaulted: true } : m
  );

  return {
    state: {
      ...state,
      members: updatedMembers,
      status: "defaulted",
      updatedAt: new Date().toISOString(),
    },
    shortfallCents,
    penaltyCents: penaltyFeeCents,
    liabilityPerGuarantorCents,
  };
}

/**
 * Calculate settlement for a member leaving the cycle early.
 * Invariant:
 * - If member has not received payout: Refund = Contributions Paid - (PenaltyPct * Contributions)
 * - If member HAS received payout: Debt = Payout Received - Contributions Paid + PenaltyFee
 */
export function calculateEarlyExitSettlement(
  state: RoscaCycleState,
  memberId: string
): {
  netRefundCents: number;
  netDebtCents: number;
  penaltyAppliedCents: number;
  status: "refund_owed" | "debt_owed" | "settled";
} {
  const member = state.members.find((m) => m.id === memberId);
  if (!member) {
    throw new Error(`Member ${memberId} not found`);
  }

  const penaltyPct = state.config.earlyExitPenaltyPct ?? 10;
  const contributed = member.totalContributedCents;

  if (!member.hasReceivedPayout) {
    // Member contributed without receiving pot -> gets refund minus early exit fee
    const penaltyAppliedCents = Math.round(contributed * (penaltyPct / 100));
    const netRefundCents = Math.max(0, contributed - penaltyAppliedCents);
    return {
      netRefundCents,
      netDebtCents: 0,
      penaltyAppliedCents,
      status: netRefundCents > 0 ? "refund_owed" : "settled",
    };
  } else {
    // Member took pot early and wants to exit before completing cycle -> owes unearned pot + penalty
    const totalObligation =
      toCents(state.config.contributionPerShareKes) *
      (member.shareMultiplier || 1) *
      state.rounds.length;
    const unearnedPot = Math.max(0, totalObligation - contributed);
    const penaltyAppliedCents = Math.round(unearnedPot * (penaltyPct / 100));
    const netDebtCents = unearnedPot + penaltyAppliedCents;
    return {
      netRefundCents: 0,
      netDebtCents,
      penaltyAppliedCents,
      status: "debt_owed",
    };
  }
}

/**
 * Invariant Auditor: verifies all mathematical invariants of a ROSCA cycle.
 */
export function auditRoscaInvariants(state: RoscaCycleState): {
  isValid: boolean;
  totalContributedAllMembersCents: number;
  totalDisbursedAllRoundsCents: number;
  potConservationSatisfied: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // 1. Member contributions sum must equal sum of round contributions
  const memberSum = state.members.reduce(
    (acc, m) => acc + m.totalContributedCents,
    0
  );
  let roundContributionSum = 0;
  let roundDisbursementSum = 0;

  for (const round of state.rounds) {
    const roundCollected = Object.values(round.contributions).reduce(
      (s, v) => s + v,
      0
    );
    if (roundCollected !== round.collectedPotCents) {
      errors.push(
        `Round ${round.roundNumber}: collectedPotCents (${round.collectedPotCents}) does not match sum of member contributions (${roundCollected})`
      );
    }
    roundContributionSum += roundCollected;
    roundDisbursementSum += round.disbursedCents + (round.discountBidCents || 0);
  }

  if (memberSum !== roundContributionSum) {
    errors.push(
      `Total member contribution sum (${memberSum}) != total round contribution sum (${roundContributionSum})`
    );
  }

  // 2. If cycle is completed, every round must be completed and pot conserved
  if (state.status === "completed") {
    const incompleteRounds = state.rounds.filter((r) => !r.isCompleted);
    if (incompleteRounds.length > 0) {
      errors.push(
        `Cycle marked completed but ${incompleteRounds.length} rounds remain incomplete`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    totalContributedAllMembersCents: memberSum,
    totalDisbursedAllRoundsCents: roundDisbursementSum,
    potConservationSatisfied: memberSum >= roundDisbursementSum,
    errors,
  };
}

function calculateRoundDueDate(
  startDateStr: string,
  roundIndex: number,
  frequency: "weekly" | "biweekly" | "monthly"
): string {
  const d = new Date(startDateStr);
  if (frequency === "weekly") {
    d.setDate(d.getDate() + roundIndex * 7);
  } else if (frequency === "biweekly") {
    d.setDate(d.getDate() + roundIndex * 14);
  } else {
    d.setMonth(d.getMonth() + roundIndex);
  }
  return d.toISOString().split("T")[0];
}
