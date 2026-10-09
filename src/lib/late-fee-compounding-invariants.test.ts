import { describe, it, expect } from "vitest";
// `penalties.ts` never exported `calculateLatePenalty` or
// `allocateRepaymentWaterfall`; the real names are `calculatePenalty` and
// `applyPaymentWaterfall` (the latter lives in money.ts alongside the other
// integer-cents money helpers). This test referenced the wrong names and failed
// to compile, taking the whole suite down with it.
import { calculatePenalty, DEFAULT_CHAMA_PENALTY_POLICIES, type PenaltyPolicy } from "./penalties";
import { applyPaymentWaterfall, toCents } from "./money";

describe("ChamaVault Late Fee Compounding & Pot Conservation Invariants", () => {
  it("enforces zero penalty when payment is made within grace period", () => {
    const policy: PenaltyPolicy = {
      model: "monthly_compounding",
      monthlyCompoundingRatePct: 2.5,
      graceDays: 7,
      maxPenaltyCapKes: 5000,
    };

    // 5 days overdue, within the 7-day grace period.
    const result = calculatePenalty(10000, 5, policy);
    expect(result.penaltyAmountCents).toBe(0);
    expect(result.totalDueWithPenaltyCents).toBe(toCents(10000));
    expect(result.graceDaysApplied).toBeGreaterThan(0);
  });

  it("strictly bounds compounding penalties under maximum penalty cap", () => {
    const policy: PenaltyPolicy = {
      model: "monthly_compounding",
      monthlyCompoundingRatePct: 10, // aggressive 10% monthly
      graceDays: 0,
      maxPenaltyCapKes: 2000, // strict 2,000 KES cap
    };

    // Simulate 365 days overdue (12 months) of aggressive 10% monthly compounding.
    const result = calculatePenalty(10000, 365, policy);
    // The cap is a hard ceiling, never exceeded by unbounded compounding.
    expect(result.penaltyAmountCents).toBeLessThanOrEqual(toCents(2000));
    expect(result.penaltyAmountCents).toBe(toCents(2000));
    expect(result.totalDueWithPenaltyCents).toBe(toCents(12000));
  });

  it("preserves money conservation in repayment waterfall allocation", () => {
    const totalPaymentCents = toCents(3500); // 3,500 KES paid
    const penaltyOwedCents = toCents(500);   // 500 KES penalty
    const interestOwedCents = toCents(1000); // 1,000 KES interest
    const principalOwedCents = toCents(5000);// 5,000 KES principal

    // applyPaymentWaterfall takes KES amounts, not cents.
    const allocation = applyPaymentWaterfall(3500, {
      penaltiesKes: 500,
      interestKes: 1000,
      principalKes: 5000,
    });

    // Repayment must extinguish: 500 penalty, 1000 interest, 2000 principal.
    expect(allocation.paidPenaltiesCents).toBe(toCents(500));
    expect(allocation.paidInterestCents).toBe(toCents(1000));
    expect(allocation.paidPrincipalCents).toBe(toCents(2000));
    expect(allocation.remainingPaymentCents).toBe(0);

    // Invariant: every cent paid is allocated exactly once, and the remaining
    // obligations reflect what is genuinely still owed.
    const totalAllocated =
      allocation.paidPenaltiesCents +
      allocation.paidInterestCents +
      allocation.paidPrincipalCents +
      allocation.remainingPaymentCents;
    expect(totalAllocated).toBe(totalPaymentCents);

    const stillOwed =
      allocation.remainingPenaltiesCents +
      allocation.remainingInterestCents +
      allocation.remainingPrincipalCents;
    expect(stillOwed).toBe(allocation.totalRemainingDueCents);
    expect(allocation.remainingPrincipalCents).toBe(toCents(3000));
  });
});
