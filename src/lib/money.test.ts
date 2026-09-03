import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  sumCents,
  loanBalance,
  loanOutstanding,
  allocateByShares,
  allocateDividends,
} from "@/lib/money";

// ── Currency conversion ──────────────────────────────────────────────────────

describe("toCents / fromCents", () => {
  it("converts whole shillings", () => {
    expect(toCents(2000)).toBe(200000);
    expect(fromCents(200000)).toBe(2000);
  });

  it("converts and preserves 2 decimal places", () => {
    expect(toCents(12.34)).toBe(1234);
    expect(fromCents(1234)).toBe(12.34);
  });

  it("rounds half away from zero at the cent boundary", () => {
    // classic float trap: 1.005 * 100 === 100.49999999999999
    expect(toCents(1.005)).toBe(101);
    expect(toCents(2.675)).toBe(268);
  });

  it("accepts numeric strings coming from the DB (NUMERIC columns)", () => {
    expect(toCents("1500.50")).toBe(150050);
  });

  it("guards NaN / Infinity to 0", () => {
    expect(toCents(NaN)).toBe(0);
    expect(toCents(Infinity)).toBe(0);
    expect(toCents("not-a-number")).toBe(0);
  });
});

describe("sumCents", () => {
  it("adds amounts with no float drift", () => {
    // 0.1 + 0.2 !== 0.3 in float; in cents it is exact
    expect(sumCents([0.1, 0.2])).toBe(30);
    expect(fromCents(sumCents([0.1, 0.2]))).toBe(0.3);
  });

  it("sums many contributions exactly", () => {
    const contribs = Array.from({ length: 1000 }, () => 33.33);
    expect(sumCents(contribs)).toBe(3333000);
  });
});

// ── Canonical loan formula (flat rate) ───────────────────────────────────────

describe("loanBalance (canonical flat-rate)", () => {
  it("10% flat on 10,000 => 1,000 interest, 11,000 due", () => {
    const b = loanBalance(10000, 10, 0);
    expect(b.interestCents).toBe(100000);
    expect(b.totalDueCents).toBe(1100000);
    expect(b.outstandingCents).toBe(1100000);
  });

  it("subtracts repayments from total due", () => {
    const b = loanBalance(10000, 10, 4000);
    expect(fromCents(b.outstandingCents)).toBe(7000);
  });

  it("never goes negative when over-repaid", () => {
    const b = loanBalance(5000, 10, 6000);
    expect(b.outstandingCents).toBe(0);
  });

  it("handles decimal interest rate", () => {
    const b = loanBalance(20000, 7.5, 0);
    expect(fromCents(b.interestCents)).toBe(1500);
    expect(fromCents(b.totalDueCents)).toBe(21500);
  });

  it("zero rate => principal only", () => {
    expect(loanOutstanding(7500, 0, 0)).toBe(7500);
  });
});

// ── Exact payout allocation (largest remainder) ──────────────────────────────

describe("allocateByShares", () => {
  it("splits equal shares evenly", () => {
    const members = [{ id: "a", units: 10 }, { id: "b", units: 10 }, { id: "c", units: 10 }];
    const alloc = allocateByShares(toCents(3000), members, (m) => m.units);
    expect(alloc.map((a) => a.amountCents)).toEqual([100000, 100000, 100000]);
  });

  it("splits proportionally to weights", () => {
    const members = [{ id: "a", units: 20 }, { id: "b", units: 10 }, { id: "c", units: 10 }];
    const alloc = allocateByShares(toCents(2000), members, (m) => m.units);
    const by = Object.fromEntries(alloc.map((a) => [a.item.id, a.amountCents]));
    expect(by.a).toBe(100000); // 50%
    expect(by.b).toBe(50000); // 25%
    expect(by.c).toBe(50000); // 25%
  });

  it("distributes the rounding remainder so parts sum EXACTLY to the total (no pennies lost)", () => {
    const members = [{ id: "a", units: 1 }, { id: "b", units: 1 }, { id: "c", units: 1 }];
    const total = toCents(100); // 10000 cents / 3 = 3333.33 each
    const alloc = allocateByShares(total, members, (m) => m.units);
    const cents = alloc.map((a) => a.amountCents).sort((x, y) => x - y);
    expect(cents).toEqual([3333, 3333, 3334]); // one member gets the extra cent
    expect(alloc.reduce((s, a) => s + a.amountCents, 0)).toBe(total); // exact
  });

  it("falls back to an even split when all weights are zero", () => {
    const members = [{ id: "a", units: 0 }, { id: "b", units: 0 }];
    const alloc = allocateByShares(toCents(1000), members, (m) => m.units);
    expect(alloc.map((a) => a.amountCents)).toEqual([50000, 50000]);
    expect(alloc.reduce((s, a) => s + a.amountCents, 0)).toBe(toCents(1000));
  });

  it("handles a negative total (loss distribution) exactly", () => {
    const members = [{ id: "a", units: 1 }, { id: "b", units: 1 }, { id: "c", units: 1 }];
    const alloc = allocateByShares(toCents(-100), members, (m) => m.units);
    expect(alloc.reduce((s, a) => s + a.amountCents, 0)).toBe(toCents(-100));
  });

  it("returns empty for no members", () => {
    expect(allocateByShares(1000, [], () => 1)).toEqual([]);
  });

  it("large distribution stays exact across many members", () => {
    const members = Array.from({ length: 37 }, (_, i) => ({ id: String(i), units: i + 1 }));
    const total = toCents(1_000_000.01);
    const alloc = allocateByShares(total, members, (m) => m.units);
    expect(alloc.reduce((s, a) => s + a.amountCents, 0)).toBe(total);
  });
});

// ── Canonical dividend allocation (route uses this on both GET and POST) ──────

describe("allocateDividends (canonical payout)", () => {
  const members = [
    { id: "m1", share_units: 3 },
    { id: "m2", share_units: 1 },
    { id: "m3", share_units: 1 },
  ];

  it("splits by share_units and sums EXACTLY to the profit (no penny lost)", () => {
    const profit = 10000; // KES; 5 units total => 6000 / 2000 / 2000
    const alloc = allocateDividends(profit, members);
    const byId = Object.fromEntries(alloc.map((a) => [a.memberId, a.amountKes]));
    expect(byId.m1).toBe(6000);
    expect(byId.m2).toBe(2000);
    expect(byId.m3).toBe(2000);
    const sumCentsExact = alloc.reduce((s, a) => s + a.amountCents, 0);
    expect(sumCentsExact).toBe(toCents(profit));
  });

  it("distributes an indivisible remainder without losing or minting a cent", () => {
    const profit = 100; // 10000 cents across 5 units => 2000/6666.67... check exact sum
    const odd = [
      { id: "a", share_units: 1 },
      { id: "b", share_units: 1 },
      { id: "c", share_units: 1 },
    ];
    const alloc = allocateDividends(profit, odd);
    expect(alloc.reduce((s, a) => s + a.amountCents, 0)).toBe(toCents(profit));
    // parts differ by at most one cent
    const cents = alloc.map((a) => a.amountCents);
    expect(Math.max(...cents) - Math.min(...cents)).toBeLessThanOrEqual(1);
  });

  it("accepts numeric-string share_units from the DB", () => {
    const alloc = allocateDividends(300, [
      { id: "a", share_units: "1" },
      { id: "b", share_units: "2" },
    ]);
    const byId = Object.fromEntries(alloc.map((a) => [a.memberId, a.amountKes]));
    expect(byId.a).toBe(100);
    expect(byId.b).toBe(200);
  });

  it("splits evenly when no member has share_units", () => {
    const alloc = allocateDividends(90, [
      { id: "a", share_units: 0 },
      { id: "b", share_units: 0 },
      { id: "c", share_units: 0 },
    ]);
    expect(alloc.map((a) => a.amountKes)).toEqual([30, 30, 30]);
  });
});

// ── Compound Interest, Penalties, and Waterfall Tests ────────────────────────

import {
  compoundInterestCents,
  calculateLatePenaltyCents,
  applyPaymentWaterfall,
} from "@/lib/money";

describe("compoundInterestCents", () => {
  it("calculates compound interest on principal", () => {
    // 10,000 KES at 12% annual rate compounded monthly for 12 periods (1 year)
    // A = 10000 * (1 + 0.01)^12 = 10000 * 1.12682503 = 11,268.25 KES
    const res = compoundInterestCents(10000, 12, 12, 12);
    expect(res.interestCents).toBe(126825);
    expect(res.totalDueCents).toBe(1126825);
  });

  it("handles zero periods or zero rate", () => {
    const resZeroPeriods = compoundInterestCents(5000, 10, 0);
    expect(resZeroPeriods.interestCents).toBe(0);
    expect(resZeroPeriods.totalDueCents).toBe(toCents(5000));

    const resZeroRate = compoundInterestCents(5000, 0, 12);
    expect(resZeroRate.interestCents).toBe(0);
    expect(resZeroRate.totalDueCents).toBe(toCents(5000));
  });
});

describe("calculateLatePenaltyCents", () => {
  it("calculates flat late fee", () => {
    const fee = calculateLatePenaltyCents(2000, {
      type: "flat",
      value: 200,
      daysOverdue: 10,
      graceDays: 5,
    });
    expect(fee).toBe(toCents(200));
  });

  it("returns 0 when within grace period", () => {
    const fee = calculateLatePenaltyCents(2000, {
      type: "flat",
      value: 200,
      daysOverdue: 3,
      graceDays: 5,
    });
    expect(fee).toBe(0);
  });

  it("calculates percentage fee", () => {
    const fee = calculateLatePenaltyCents(5000, {
      type: "percentage",
      value: 10, // 10%
      daysOverdue: 5,
      graceDays: 0,
    });
    expect(fee).toBe(toCents(500));
  });

  it("calculates daily accrual fee", () => {
    // 0.2%/day for 10 effective days (15 overdue - 5 grace) on 10,000 KES
    // 10 days * 0.2% = 2% on 10,000 = 200 KES
    const fee = calculateLatePenaltyCents(10000, {
      type: "daily",
      value: 0.2,
      daysOverdue: 15,
      graceDays: 5,
    });
    expect(fee).toBe(toCents(200));
  });
});

describe("applyPaymentWaterfall", () => {
  it("settles penalties first, then interest, then principal", () => {
    // Obligations: 500 penalties, 1,000 interest, 10,000 principal (Total 11,500)
    // Partial payment: 1,200 KES
    // Pays: 500 penalties (0 remaining), 700 interest (300 remaining), 0 principal (10,000 remaining)
    const result = applyPaymentWaterfall(1200, {
      penaltiesKes: 500,
      interestKes: 1000,
      principalKes: 10000,
    });

    expect(result.paidPenaltiesCents).toBe(toCents(500));
    expect(result.paidInterestCents).toBe(toCents(700));
    expect(result.paidPrincipalCents).toBe(0);
    expect(result.remainingPenaltiesCents).toBe(0);
    expect(result.remainingInterestCents).toBe(toCents(300));
    expect(result.remainingPrincipalCents).toBe(toCents(10000));
    expect(result.remainingPaymentCents).toBe(0);
    expect(result.totalRemainingDueCents).toBe(toCents(10300));
  });

  it("handles overpayment by returning surplus in remainingPaymentCents", () => {
    // Total obligation = 500 + 1000 + 5000 = 6,500 KES
    // Payment = 7,000 KES
    const result = applyPaymentWaterfall(7000, {
      penaltiesKes: 500,
      interestKes: 1000,
      principalKes: 5000,
    });

    expect(result.paidPenaltiesCents).toBe(toCents(500));
    expect(result.paidInterestCents).toBe(toCents(1000));
    expect(result.paidPrincipalCents).toBe(toCents(5000));
    expect(result.totalRemainingDueCents).toBe(0);
    expect(result.remainingPaymentCents).toBe(toCents(500));
  });
});
