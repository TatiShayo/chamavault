import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  sumCents,
  loanBalance,
  loanOutstanding,
  allocateByShares,
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
