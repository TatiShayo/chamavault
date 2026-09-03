import { describe, it, expect } from "vitest";
import {
  calculatePenalty,
  calculateMemberCumulativeArrears,
  DEFAULT_CHAMA_PENALTY_POLICIES,
  type PenaltyPolicy,
} from "./penalties";
import { toCents } from "./money";

describe("Late Contribution & Arrears Penalties", () => {
  describe("Flat Fine Policies", () => {
    const flatPolicy: PenaltyPolicy = {
      model: "flat",
      flatFeeKes: 200,
      graceDays: 5,
    };

    it("charges 0 fine when within grace period", () => {
      const res = calculatePenalty(2000, 3, flatPolicy);
      expect(res.penaltyAmountCents).toBe(0);
      expect(res.totalDueWithPenaltyCents).toBe(toCents(2000));
    });

    it("charges exact 0 fine on exact grace boundary day", () => {
      const res = calculatePenalty(2000, 5, flatPolicy);
      expect(res.penaltyAmountCents).toBe(0);
    });

    it("charges full flat fine once grace period is exceeded", () => {
      const res = calculatePenalty(2000, 6, flatPolicy);
      expect(res.penaltyAmountCents).toBe(toCents(200));
      expect(res.totalDueWithPenaltyCents).toBe(toCents(2200));
    });
  });

  describe("Percentage-Based Penalties", () => {
    const pctPolicy: PenaltyPolicy = {
      model: "percentage",
      percentageRate: 5, // 5%
      graceDays: 0,
    };

    it("calculates exact 5% penalty in integer cents", () => {
      const res = calculatePenalty(5000, 10, pctPolicy);
      // 5% of 5000 = 250 KES
      expect(res.penaltyAmountCents).toBe(toCents(250));
      expect(res.totalDueWithPenaltyCents).toBe(toCents(5250));
    });

    it("rounds half-cents correctly without float drift", () => {
      // 5% of 33.33 = 1.6665 -> 1.67 KES (167 cents)
      const res = calculatePenalty(33.33, 10, pctPolicy);
      expect(res.penaltyAmountCents).toBe(167);
    });
  });

  describe("Daily Accrual Penalties", () => {
    const dailyPolicy: PenaltyPolicy = {
      model: "daily_rate",
      dailyRatePct: 0.1, // 0.1% per day
      graceDays: 3,
      maxPenaltyCapKes: 500,
    };

    it("calculates daily penalty for effective overdue days", () => {
      // 13 days overdue - 3 grace days = 10 effective days.
      // 0.1%/day * 10 days = 1% on 10,000 KES = 100 KES.
      const res = calculatePenalty(10000, 13, dailyPolicy);
      expect(res.penaltyAmountCents).toBe(toCents(100));
      expect(res.totalDueWithPenaltyCents).toBe(toCents(10100));
    });

    it("enforces maximum penalty cap", () => {
      // 1000 effective days -> uncapped penalty would be 10,000 KES.
      // Capped at 500 KES.
      const res = calculatePenalty(10000, 1003, dailyPolicy);
      expect(res.penaltyAmountCents).toBe(toCents(500));
      expect(res.totalDueWithPenaltyCents).toBe(toCents(10500));
      expect(res.breakdown).toContain("capped at KES 500");
    });
  });

  describe("Tiered Delinquency Policy", () => {
    const tieredPolicy = DEFAULT_CHAMA_PENALTY_POLICIES.tiered_delinquency;

    it("applies tier 1 flat fee for 4-14 days overdue", () => {
      const res = calculatePenalty(3000, 10, tieredPolicy);
      expect(res.penaltyAmountCents).toBe(toCents(100));
      expect(res.breakdown).toContain("Tier 4-14d");
    });

    it("applies tier 2 (5%) for 15-30 days overdue", () => {
      const res = calculatePenalty(3000, 20, tieredPolicy);
      // 5% of 3000 = 150 KES
      expect(res.penaltyAmountCents).toBe(toCents(150));
      expect(res.breakdown).toContain("Tier 15-30d");
    });

    it("applies tier 3 (10%) for 31-60 days overdue", () => {
      const res = calculatePenalty(3000, 45, tieredPolicy);
      // 10% of 3000 = 300 KES
      expect(res.penaltyAmountCents).toBe(toCents(300));
    });

    it("applies tier 4 (20%) for >60 days overdue", () => {
      const res = calculatePenalty(3000, 90, tieredPolicy);
      // 20% of 3000 = 600 KES
      expect(res.penaltyAmountCents).toBe(toCents(600));
    });
  });

  describe("Monthly Compounding Arrears", () => {
    const compoundingPolicy: PenaltyPolicy = {
      model: "monthly_compounding",
      monthlyCompoundingRatePct: 2, // 2% per month
      graceDays: 0,
    };

    it("compounds over multiple months accurately", () => {
      // 10,000 KES overdue for 60 days (2 months) at 2%/mo
      // A = 10000 * (1 + 0.02)^2 = 10000 * 1.0404 = 10,404 KES
      // Penalty = 404 KES (40,400 cents)
      const res = calculatePenalty(10000, 60, compoundingPolicy);
      expect(res.penaltyAmountCents).toBe(40400);
      expect(res.totalDueWithPenaltyCents).toBe(1040400);
    });
  });

  describe("Edge & Zero Handling", () => {
    it("handles zero amount or negative overdue gracefully", () => {
      const resZero = calculatePenalty(0, 10, DEFAULT_CHAMA_PENALTY_POLICIES.standard_flat);
      expect(resZero.penaltyAmountCents).toBe(0);

      const resNegDays = calculatePenalty(1000, -5, DEFAULT_CHAMA_PENALTY_POLICIES.standard_flat);
      expect(resNegDays.penaltyAmountCents).toBe(0);
    });
  });

  describe("Cumulative Multi-Period Arrears Calculation", () => {
    it("aggregates itemized and grand total arrears accurately", () => {
      const items = [
        { period: "2026-01", amountDueKes: 2000, daysOverdue: 60 }, // flat 200
        { period: "2026-02", amountDueKes: 2000, daysOverdue: 30 }, // flat 200
        { period: "2026-03", amountDueKes: 2000, daysOverdue: 2 },  // 0 (within 7d grace)
      ];

      const summary = calculateMemberCumulativeArrears(
        items,
        DEFAULT_CHAMA_PENALTY_POLICIES.standard_flat
      );

      expect(summary.totalPrincipalDueCents).toBe(toCents(6000));
      expect(summary.totalPenaltiesCents).toBe(toCents(400));
      expect(summary.grandTotalDueCents).toBe(toCents(6400));
      expect(summary.itemizedResults).toHaveLength(3);
      expect(summary.itemizedResults[2].penaltyCents).toBe(0);
    });
  });
});
