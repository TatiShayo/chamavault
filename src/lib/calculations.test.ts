import { describe, it, expect } from "vitest";
import {
  calcTreasuryBalance,
  calcLoan,
  calcMaxLoan,
  calcDividends,
  calcContributionStatus,
  calcContributionTotals,
  calcCombinedPaid,
  getMonthsFromFounding,
  calcMemberContributionBalances,
  calcUnpaidFinesTotal,
  calcMonthlyExpenseTotal,
} from "@/lib/calculations";

// ── Treasury Balance ──

describe("calcTreasuryBalance", () => {
  it("returns zeros when there is no data", () => {
    const result = calcTreasuryBalance([], [], [], []);
    expect(result).toEqual({
      balance: 0,
      totalContributions: 0,
      totalExpenses: 0,
      totalLoansDisbursed: 0,
      totalLoanRepayments: 0,
    });
  });

  it("balance = contributions + repayments - loans - expenses", () => {
    const result = calcTreasuryBalance(
      [{ amount_paid: 1000 }, { amount_paid: 2000 }],
      [{ amount: 300 }, { amount: 200 }],
      [{ amount: 1500 }],
      [{ amount: 400 }, { amount: 100 }]
    );
    expect(result.totalContributions).toBe(3000);
    expect(result.totalLoanRepayments).toBe(500);
    expect(result.totalLoansDisbursed).toBe(1500);
    expect(result.totalExpenses).toBe(500);
    expect(result.balance).toBe(3000 + 500 - 1500 - 500); // 1500
  });

  it("produces negative balance when expenses and loans exceed income", () => {
    const result = calcTreasuryBalance(
      [{ amount_paid: 500 }],
      [],
      [{ amount: 2000 }],
      [{ amount: 300 }]
    );
    expect(result.balance).toBe(-1800);
  });

  it("handles large KES amounts correctly", () => {
    const result = calcTreasuryBalance(
      [{ amount_paid: 500000 }, { amount_paid: 250000 }],
      [{ amount: 100000 }],
      [{ amount: 200000 }, { amount: 100000 }],
      [{ amount: 50000 }]
    );
    expect(result.totalContributions).toBe(750000);
    expect(result.balance).toBe(750000 + 100000 - 300000 - 50000); // 500000
  });
});

// ── Loan Calculations ──

describe("calcLoan", () => {
  it("calculates interest and total due from amount and rate", () => {
    const result = calcLoan(10000, 10, 0);
    expect(result.interest).toBe(1000);
    expect(result.totalDue).toBe(11000);
    expect(result.outstanding).toBe(11000);
  });

  it("calculates outstanding after partial repayment", () => {
    const result = calcLoan(10000, 5, 3000);
    expect(result.interest).toBe(500);
    expect(result.totalDue).toBe(10500);
    expect(result.outstanding).toBe(7500);
  });

  it("outstanding is zero when fully repaid", () => {
    const result = calcLoan(5000, 10, 5500);
    expect(result.outstanding).toBe(0);
  });

  it("outstanding is zero when over-repaid", () => {
    const result = calcLoan(5000, 0, 10000);
    expect(result.outstanding).toBe(0);
  });

  it("zero interest rate produces total equal to principal", () => {
    const result = calcLoan(7500, 0, 0);
    expect(result.interest).toBe(0);
    expect(result.totalDue).toBe(7500);
    expect(result.outstanding).toBe(7500);
  });

  it("integer-only amounts work correctly", () => {
    const result = calcLoan(100, 10, 0);
    expect(result.interest).toBe(10);
    expect(result.totalDue).toBe(110);
  });

  it("handles decimal interest rates", () => {
    const result = calcLoan(20000, 7.5, 1000);
    expect(result.interest).toBe(1500);
    expect(result.totalDue).toBe(21500);
    expect(result.outstanding).toBe(20500);
  });
});

describe("calcMaxLoan", () => {
  it("returns 3× total contributions", () => {
    expect(calcMaxLoan(5000)).toBe(15000);
  });

  it("returns zero when contributions are zero", () => {
    expect(calcMaxLoan(0)).toBe(0);
  });

  it("handles large contributions", () => {
    expect(calcMaxLoan(100000)).toBe(300000);
  });
});

// ── Dividend Distribution ──

describe("calcDividends", () => {
  it("splits profit equally when all members have equal share units", () => {
    const members = [
      { id: "m1", share_units: 10 },
      { id: "m2", share_units: 10 },
      { id: "m3", share_units: 10 },
    ];
    const contributions = [{ amount_paid: 3000 }];
    const result = calcDividends(contributions, [], [], members);
    expect(result.distributableProfit).toBe(3000);
    expect(result.totalUnits).toBe(30);
    result.shares.forEach((s) => {
      expect(s.dividendAmount).toBe(1000);
    });
  });

  it("splits profit proportionally based on share units", () => {
    const members = [
      { id: "m1", share_units: 20 },
      { id: "m2", share_units: 10 },
      { id: "m3", share_units: 10 },
    ];
    const contributions = [{ amount_paid: 2000 }];
    const result = calcDividends(contributions, [], [], members);
    expect(result.totalUnits).toBe(40);
    const m1 = result.shares.find((s) => s.memberId === "m1")!;
    const m2 = result.shares.find((s) => s.memberId === "m2")!;
    expect(m1.dividendAmount).toBe(1000); // 20/40 = 50% of 2000
    expect(m2.dividendAmount).toBe(500);  // 10/40 = 25% of 2000
  });

  it("falls back to equal split when total share units is zero", () => {
    const members = [
      { id: "m1", share_units: 0 },
      { id: "m2", share_units: 0 },
    ];
    const contributions = [{ amount_paid: 1000 }];
    const result = calcDividends(contributions, [], [], members);
    expect(result.totalUnits).toBe(0);
    result.shares.forEach((s) => {
      expect(s.dividendAmount).toBe(500);
    });
  });

  it("returns zero shares when there are no members", () => {
    const result = calcDividends([{ amount_paid: 500 }], [], [], []);
    expect(result.shares).toEqual([]);
    expect(result.distributableProfit).toBe(500);
  });

  it("negative profit results in negative dividends", () => {
    const members = [{ id: "m1", share_units: 10 }];
    const contributions = [{ amount_paid: 100 }];
    const expenses = [{ amount: 500 }];
    const result = calcDividends(contributions, [], expenses, members);
    expect(result.distributableProfit).toBe(-400);
    expect(result.shares[0].dividendAmount).toBe(-400);
  });

  it("includes loan repayments in distributable profit", () => {
    const members = [{ id: "m1", share_units: 10 }];
    const contributions = [{ amount_paid: 500 }];
    const repayments = [{ amount: 200 }];
    const expenses = [{ amount: 100 }];
    const result = calcDividends(contributions, repayments, expenses, members);
    expect(result.distributableProfit).toBe(600);
    expect(result.shares[0].dividendAmount).toBe(600);
  });

  it("rounds dividend amounts to 2 decimal places", () => {
    const members = [
      { id: "m1", share_units: 1 },
      { id: "m2", share_units: 1 },
      { id: "m3", share_units: 1 },
    ];
    const contributions = [{ amount_paid: 100 }];
    // 100 / 3 = 33.333... → two get 33.33, one gets 33.34 after remainder distribution
    const result = calcDividends(contributions, [], [], members);
    const sum = result.shares.reduce((s, sh) => s + sh.dividendAmount, 0);
    expect(sum).toBeCloseTo(100, 2);
    result.shares.forEach((s) => {
      expect(s.dividendAmount).toBeGreaterThanOrEqual(33.33);
      expect(s.dividendAmount).toBeLessThanOrEqual(33.34);
    });
  });
});

// ── Contribution Status ──

describe("calcContributionStatus", () => {
  it('returns "paid" when amountPaid >= amountDue', () => {
    expect(calcContributionStatus(100, 100, "2025-01")).toBe("paid");
    expect(calcContributionStatus(150, 100, "2025-01")).toBe("paid");
  });

  it('returns "partial" when amountPaid > 0 but < amountDue', () => {
    expect(calcContributionStatus(50, 100, "2025-01")).toBe("partial");
    expect(calcContributionStatus(99, 100, "2025-01")).toBe("partial");
  });

  it('returns "overdue" for past months with no payment', () => {
    const past = "2024-06";
    const status = calcContributionStatus(0, 100, past);
    expect(status).toBe("overdue");
  });

  it('returns "pending" for current/future months with no payment', () => {
    const future = "2099-12";
    const status = calcContributionStatus(0, 100, future);
    expect(status).toBe("pending");
  });

  it("respects custom reference date for overdue check", () => {
    // June 2025 is past relative to July 2025
    const refDate = new Date("2025-07-15");
    expect(calcContributionStatus(0, 100, "2025-06", refDate)).toBe("overdue");
    // July 2025 is current (not past) relative to July 2025
    expect(calcContributionStatus(0, 100, "2025-07", refDate)).toBe("pending");
  });

  it("partial payment in past month still shows as partial, not overdue", () => {
    const past = "2024-06";
    const status = calcContributionStatus(30, 100, past);
    expect(status).toBe("partial");
  });

  it("handles zero amount_due", () => {
    // paid >= due (0 >= 0) → paid
    expect(calcContributionStatus(0, 0, "2025-01")).toBe("paid");
  });
});

// ── Contribution Totals ──

describe("calcContributionTotals", () => {
  it("sums paid and due across all contributions", () => {
    const contribs = [
      { amount_paid: 100, amount_due: 100 },
      { amount_paid: 50, amount_due: 100 },
      { amount_paid: 200, amount_due: 200 },
    ];
    const { totalPaid, totalDue } = calcContributionTotals(contribs);
    expect(totalPaid).toBe(350);
    expect(totalDue).toBe(400);
  });

  it("returns zeros for empty array", () => {
    const { totalPaid, totalDue } = calcContributionTotals([]);
    expect(totalPaid).toBe(0);
    expect(totalDue).toBe(0);
  });
});

// ── Combined Paid Accumulation ──

describe("calcCombinedPaid", () => {
  it("adds new payment to existing paid amount", () => {
    expect(calcCombinedPaid(500, 200)).toBe(700);
  });

  it("works with zero existing", () => {
    expect(calcCombinedPaid(0, 150)).toBe(150);
  });

  it("works with zero new amount", () => {
    expect(calcCombinedPaid(500, 0)).toBe(500);
  });
});

// ── Months from Founding ──

describe("getMonthsFromFounding", () => {
  it("generates 12 months starting from January 2025", () => {
    const months = getMonthsFromFounding("2025-01-15", 12);
    expect(months).toHaveLength(12);
    expect(months[0]).toBe("2025-01");
    expect(months[11]).toBe("2025-12");
  });

  it("crosses year boundaries correctly", () => {
    const months = getMonthsFromFounding("2024-10-01", 5);
    expect(months).toEqual(["2024-10", "2024-11", "2024-12", "2025-01", "2025-02"]);
  });

  it("returns single month for count of 1", () => {
    const months = getMonthsFromFounding("2025-06-01", 1);
    expect(months).toEqual(["2025-06"]);
  });

  it("returns empty array for count of 0", () => {
    const months = getMonthsFromFounding("2025-01-01", 0);
    expect(months).toEqual([]);
  });

  it("handles different days-of-month in starting date", () => {
    // Feb 28 → Mar 28 (clamped to 28 in March) — JS Date handles this
    const months = getMonthsFromFounding("2025-01-31", 3);
    expect(months[0]).toBe("2025-01");
    // Jan 31 + 1 month = Feb 28/29, then Mar 28/29 — JS normalizes
    expect(months[2]).toMatch(/^2025-03/);
  });
});

// ── Member Contribution Balances ──

describe("calcMemberContributionBalances", () => {
  it("calculates per-member totals and outstanding balance", () => {
    const memberIds = ["m1", "m2"];
    const contributions = [
      { member_id: "m1", amount_paid: 300, amount_due: 300 },
      { member_id: "m1", amount_paid: 200, amount_due: 300 },
      { member_id: "m2", amount_paid: 500, amount_due: 500 },
    ];
    const rows = calcMemberContributionBalances(memberIds, contributions);
    const m1 = rows.find((r) => r.memberId === "m1")!;
    const m2 = rows.find((r) => r.memberId === "m2")!;
    expect(m1.paid).toBe(500);
    expect(m1.due).toBe(600);
    expect(m1.balance).toBe(100); // underpaid
    expect(m2.paid).toBe(500);
    expect(m2.due).toBe(500);
    expect(m2.balance).toBe(0);
  });

  it("returns zero for members with no contributions", () => {
    const rows = calcMemberContributionBalances(["m1", "m2"], []);
    expect(rows).toHaveLength(2);
    rows.forEach((r) => {
      expect(r.paid).toBe(0);
      expect(r.due).toBe(0);
      expect(r.balance).toBe(0);
    });
  });

  it("negative balance means overpaid", () => {
    const rows = calcMemberContributionBalances(["m1"], [
      { member_id: "m1", amount_paid: 500, amount_due: 300 },
    ]);
    expect(rows[0].balance).toBe(-200);
  });
});

// ── Fines Total ──

describe("calcUnpaidFinesTotal", () => {
  it("sums all fine amounts", () => {
    expect(calcUnpaidFinesTotal([{ amount: 100 }, { amount: 200 }, { amount: 50 }])).toBe(350);
  });

  it("returns zero for empty array", () => {
    expect(calcUnpaidFinesTotal([])).toBe(0);
  });
});

// ── Monthly Expense Total ──

describe("calcMonthlyExpenseTotal", () => {
  it("sums all expense amounts", () => {
    expect(calcMonthlyExpenseTotal([{ amount: 500 }, { amount: 300 }])).toBe(800);
  });

  it("returns zero for empty array", () => {
    expect(calcMonthlyExpenseTotal([])).toBe(0);
  });
});
