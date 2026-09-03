import { describe, it, expect } from "vitest";
import {
  calculateLatePenalty,
  allocateRepaymentWaterfall,
  type PenaltyPolicy,
} from "./penalties";
import { toCents } from "./money";

describe("ChamaVault Late Fee Compounding & Pot Conservation Invariants", () => {
  it("enforces zero penalty when payment is made within grace period", () => {
    const policy: PenaltyPolicy = {
      model: "monthly_compounding",
      monthlyCompoundingRatePct: 2.5,
      graceDays: 7,
      maxPenaltyCapKes: 5000,
    };

    const result = calculateLatePenalty(10000, 5, policy); // 5 days overdue <= 7 grace days
    expect(result.penaltyAmountCents).toBe(0);
    expect(result.totalDueWithPenaltyCents).toBe(toCents(10000));
  });

  it("strictly bounds compounding penalties under maximum penalty cap", () => {
    const policy: PenaltyPolicy = {
      model: "monthly_compounding",
      monthlyCompoundingRatePct: 10, // aggressive 10% monthly
      graceDays: 0,
      maxPenaltyCapKes: 2000, // strict 2,000 KES cap
    };

    // Simulate 365 days overdue (12 months)
    const result = calculateLatePenalty(10000, 365, policy);
    expect(result.penaltyAmountCents).toBeLessThanOrEqual(toCents(2000));
    expect(result.penaltyAmountCents).toBe(toCents(2000));
    expect(result.totalDueWithPenaltyCents).toBe(toCents(12000));
  });

  it("preserves money conservation in repayment waterfall allocation", () => {
    const totalPaymentCents = toCents(3500); // 3,500 KES paid
    const penaltyOwedCents = toCents(500);   // 500 KES penalty
    const interestOwedCents = toCents(1000); // 1,000 KES interest
    const principalOwedCents = toCents(5000);// 5,000 KES principal

    const allocation = allocateRepaymentWaterfall(
      totalPaymentCents,
      penaltyOwedCents,
      interestOwedCents,
      principalOwedCents
    );

    // Repayment must extinguish: 500 penalty, 1000 interest, 2000 principal
    expect(allocation.allocatedToPenaltyCents).toBe(toCents(500));
    expect(allocation.allocatedToInterestCents).toBe(toCents(1000));
    expect(allocation.allocatedToPrincipalCents).toBe(toCents(2000));
    expect(allocation.unallocatedSurplusCents).toBe(0);

    // Invariant: sum of allocations equals original payment
    const totalAllocated =
      allocation.allocatedToPenaltyCents +
      allocation.allocatedToInterestCents +
      allocation.allocatedToPrincipalCents +
      allocation.unallocatedSurplusCents;
    expect(totalAllocated).toBe(totalPaymentCents);
  });
});
