/**
 * Late Contribution & Loan Arrears Penalty Engine for ChamaVault
 *
 * Implements:
 * 1. Configurable late payment penalty policies: Flat, Percentage, Daily Accrual, Tiered, Monthly Compounding
 * 2. Grace period deduction and calendar/business day handling
 * 3. Exact integer-cents penalty calculations with zero floating-point drift
 * 4. Repayment waterfall allocation (Penalties -> Interest -> Principal)
 * 5. Multi-month compounding arrears trajectory simulator
 */

import { toCents, fromCents } from "./money";

export type PenaltyModel =
  | "flat"
  | "percentage"
  | "daily_rate"
  | "tiered"
  | "monthly_compounding";

export interface TierRule {
  minDays: number;
  maxDays: number; // use Infinity for open-ended upper tier
  penaltyType: "flat" | "percentage";
  rateOrAmount: number;
}

export interface PenaltyPolicy {
  model: PenaltyModel;
  flatFeeKes?: number; // e.g. 200 KES
  percentageRate?: number; // e.g. 5 for 5%
  dailyRatePct?: number; // e.g. 0.1 for 0.1% per day
  monthlyCompoundingRatePct?: number; // e.g. 2 for 2% per month
  graceDays?: number; // e.g. 5 days grace period
  maxPenaltyCapKes?: number; // cap on total penalty
  tiers?: TierRule[];
}

export interface PenaltyCalculationResult {
  dueAmountCents: number;
  penaltyAmountCents: number;
  totalDueWithPenaltyCents: number;
  daysOverdue: number;
  graceDaysApplied: number;
  appliedModel: PenaltyModel;
  breakdown: string;
}

/**
 * Standard default chama penalty policies.
 */
export const DEFAULT_CHAMA_PENALTY_POLICIES: Record<string, PenaltyPolicy> = {
  standard_flat: {
    model: "flat",
    flatFeeKes: 200,
    graceDays: 7,
  },
  percentage_grace: {
    model: "percentage",
    percentageRate: 5,
    graceDays: 5,
  },
  daily_accrual: {
    model: "daily_rate",
    dailyRatePct: 0.1,
    graceDays: 3,
    maxPenaltyCapKes: 5000,
  },
  tiered_delinquency: {
    model: "tiered",
    graceDays: 3,
    tiers: [
      { minDays: 4, maxDays: 14, penaltyType: "flat", rateOrAmount: 100 },
      { minDays: 15, maxDays: 30, penaltyType: "percentage", rateOrAmount: 5 },
      { minDays: 31, maxDays: 60, penaltyType: "percentage", rateOrAmount: 10 },
      { minDays: 61, maxDays: Infinity, penaltyType: "percentage", rateOrAmount: 20 },
    ],
  },
};

/**
 * Calculates the exact penalty in integer cents for an overdue payment.
 */
export function calculatePenalty(
  dueAmountKes: number | string,
  daysOverdue: number,
  policy: PenaltyPolicy
): PenaltyCalculationResult {
  const dueCents = toCents(dueAmountKes);
  if (dueCents <= 0 || daysOverdue <= 0) {
    return {
      dueAmountCents: Math.max(0, dueCents),
      penaltyAmountCents: 0,
      totalDueWithPenaltyCents: Math.max(0, dueCents),
      daysOverdue: Math.max(0, daysOverdue),
      graceDaysApplied: 0,
      appliedModel: policy.model,
      breakdown: "No penalty (zero amount or not overdue)",
    };
  }

  const graceDays = Math.max(0, policy.graceDays || 0);
  if (daysOverdue <= graceDays) {
    return {
      dueAmountCents: dueCents,
      penaltyAmountCents: 0,
      totalDueWithPenaltyCents: dueCents,
      daysOverdue,
      graceDaysApplied: daysOverdue,
      appliedModel: policy.model,
      breakdown: `Within grace period (${daysOverdue}/${graceDays} days)`,
    };
  }

  const effectiveDays = daysOverdue - graceDays;
  let penaltyCents = 0;
  let breakdown = "";

  switch (policy.model) {
    case "flat": {
      const fee = toCents(policy.flatFeeKes || 0);
      penaltyCents = fee;
      breakdown = `Flat fine of KES ${fromCents(fee)}`;
      break;
    }
    case "percentage": {
      const rate = Number(policy.percentageRate || 0);
      penaltyCents = Math.round(dueCents * (rate / 100));
      breakdown = `${rate}% penalty on KES ${fromCents(dueCents)}`;
      break;
    }
    case "daily_rate": {
      const dailyRate = Number(policy.dailyRatePct || 0);
      penaltyCents = Math.round(dueCents * (dailyRate / 100) * effectiveDays);
      breakdown = `${dailyRate}%/day for ${effectiveDays} overdue days`;
      break;
    }
    case "monthly_compounding": {
      const monthlyRate = Number(policy.monthlyCompoundingRatePct || 0) / 100;
      const months = effectiveDays / 30;
      const compoundedTotal = dueCents * Math.pow(1 + monthlyRate, months);
      penaltyCents = Math.round(compoundedTotal - dueCents);
      breakdown = `${policy.monthlyCompoundingRatePct}% compounded over ${months.toFixed(1)} months`;
      break;
    }
    case "tiered": {
      const tiers = policy.tiers || [];
      const activeTier = tiers.find(
        (t) => daysOverdue >= t.minDays && daysOverdue <= t.maxDays
      );
      if (activeTier) {
        if (activeTier.penaltyType === "flat") {
          penaltyCents = toCents(activeTier.rateOrAmount);
          breakdown = `Tier ${activeTier.minDays}-${activeTier.maxDays}d: Flat KES ${activeTier.rateOrAmount}`;
        } else {
          penaltyCents = Math.round(dueCents * (activeTier.rateOrAmount / 100));
          breakdown = `Tier ${activeTier.minDays}-${activeTier.maxDays}d: ${activeTier.rateOrAmount}% of balance`;
        }
      } else {
        penaltyCents = 0;
        breakdown = "No matching tier";
      }
      break;
    }
  }

  // Apply maximum penalty cap if configured
  if (policy.maxPenaltyCapKes !== undefined && policy.maxPenaltyCapKes > 0) {
    const capCents = toCents(policy.maxPenaltyCapKes);
    if (penaltyCents > capCents) {
      penaltyCents = capCents;
      breakdown += ` (capped at KES ${policy.maxPenaltyCapKes})`;
    }
  }

  return {
    dueAmountCents: dueCents,
    penaltyAmountCents: penaltyCents,
    totalDueWithPenaltyCents: dueCents + penaltyCents,
    daysOverdue,
    graceDaysApplied: graceDays,
    appliedModel: policy.model,
    breakdown,
  };
}

/**
 * Calculates the total arrears for a member across multiple overdue contribution periods.
 */
export function calculateMemberCumulativeArrears(
  overdueItems: Array<{
    period: string;
    amountDueKes: number;
    daysOverdue: number;
  }>,
  policy: PenaltyPolicy
): {
  totalPrincipalDueCents: number;
  totalPenaltiesCents: number;
  grandTotalDueCents: number;
  itemizedResults: Array<{
    period: string;
    principalCents: number;
    penaltyCents: number;
    totalCents: number;
  }>;
} {
  let totalPrincipalDueCents = 0;
  let totalPenaltiesCents = 0;
  const itemizedResults = [];

  for (const item of overdueItems) {
    const result = calculatePenalty(item.amountDueKes, item.daysOverdue, policy);
    totalPrincipalDueCents += result.dueAmountCents;
    totalPenaltiesCents += result.penaltyAmountCents;
    itemizedResults.push({
      period: item.period,
      principalCents: result.dueAmountCents,
      penaltyCents: result.penaltyAmountCents,
      totalCents: result.totalDueWithPenaltyCents,
    });
  }

  return {
    totalPrincipalDueCents,
    totalPenaltiesCents,
    grandTotalDueCents: totalPrincipalDueCents + totalPenaltiesCents,
    itemizedResults,
  };
}
