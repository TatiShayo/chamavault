import { describe, it, expect } from "vitest";
import type { DbState } from "@/lib/mockDb";
import {
  calculateTotalSavings,
  calculateMemberSavings,
  calculateActiveLoansTotal,
  calculateSingleLoanBalance,
  checkLoanEligibility,
  calculateDividendSplits,
} from "@/lib/financials";

// Migrated from the former custom tsx test runner (src/lib/testRunner.ts).
// These characterization tests lock the current money behavior of financials.ts
// BEFORE any refactor — see AUDIT_LOG.md money-correctness section.

const CHAMA_A = "test-chama-a";
const MEMBER_1 = "member-1";
const MEMBER_2 = "member-2";
const MEMBER_3 = "member-3";

const createBaseMockDb = (): DbState => ({
  chamas: [
    { id: CHAMA_A, name: "Test Chama A", description: "Testing", created_at: "2026-01-01", currency: "KES", status: "active" },
  ],
  members: [
    { id: MEMBER_1, chama_id: CHAMA_A, name: "Member One", email: "one@test.com", role: "Chairperson", joined_at: "2026-01-01" },
    { id: MEMBER_2, chama_id: CHAMA_A, name: "Member Two", email: "two@test.com", role: "Treasurer", joined_at: "2026-01-01" },
    { id: MEMBER_3, chama_id: CHAMA_A, name: "Member Three", email: "three@test.com", role: "Member", joined_at: "2026-01-01" },
  ],
  contributions: [
    { id: "c1", chama_id: CHAMA_A, member_id: MEMBER_1, amount: 2000, contribution_date: "2026-01", status: "paid", created_at: "2026-01-15" },
    { id: "c2", chama_id: CHAMA_A, member_id: MEMBER_1, amount: 2000, contribution_date: "2026-02", status: "paid", created_at: "2026-02-15" },
    { id: "c3", chama_id: CHAMA_A, member_id: MEMBER_2, amount: 2000, contribution_date: "2026-01", status: "paid", created_at: "2026-01-15" },
    { id: "c4", chama_id: CHAMA_A, member_id: MEMBER_3, amount: 2000, contribution_date: "2026-01", status: "paid", created_at: "2026-01-15" },
    { id: "c5", chama_id: CHAMA_A, member_id: MEMBER_3, amount: 2000, contribution_date: "2026-02", status: "pending", created_at: "2026-02-15" },
    { id: "c6", chama_id: CHAMA_A, member_id: MEMBER_3, amount: 2000, contribution_date: "2026-03", status: "overdue", created_at: "2026-03-15" },
    { id: "c7", chama_id: CHAMA_A, member_id: MEMBER_1, amount: 500, contribution_date: "2026-03", status: "paid", remarks: "Dividend: Distributed", created_at: "2026-03-15" },
  ],
  fines: [],
  loans: [],
  repayments: [],
  expenses: [],
  meetings: [],
  attendance: [],
  votes: [],
  voteRecords: [],
});

describe("Contribution calculations", () => {
  it("sums only paid savings contributions, excluding dividends", () => {
    const db = createBaseMockDb();
    // c1+c2+c3+c4 = 8000; c5 pending, c6 overdue, c7 dividend payout all excluded
    expect(calculateTotalSavings(db, CHAMA_A)).toBe(8000);
  });

  it("calculates individual member savings base (excluding dividends and unpaid)", () => {
    const db = createBaseMockDb();
    expect(calculateMemberSavings(db, CHAMA_A, MEMBER_1)).toBe(4000);
    expect(calculateMemberSavings(db, CHAMA_A, MEMBER_2)).toBe(2000);
    expect(calculateMemberSavings(db, CHAMA_A, MEMBER_3)).toBe(2000);
  });

  it("returns 0 for a member with no contributions", () => {
    const db = createBaseMockDb();
    expect(calculateMemberSavings(db, CHAMA_A, "non-existent-member")).toBe(0);
  });
});

describe("Loan eligibility (3x savings)", () => {
  it("approves loans within 3x savings base", () => {
    const db = createBaseMockDb();
    const under = checkLoanEligibility(db, CHAMA_A, MEMBER_1, 10000);
    expect(under.eligible).toBe(true);
    expect(under.savingsBase).toBe(4000);
    expect(under.maxLimit).toBe(12000);
    expect(checkLoanEligibility(db, CHAMA_A, MEMBER_1, 12000).eligible).toBe(true);
  });

  it("denies loans exceeding 3x savings base", () => {
    const db = createBaseMockDb();
    const over = checkLoanEligibility(db, CHAMA_A, MEMBER_1, 12001);
    expect(over.eligible).toBe(false);
    expect(over.maxLimit).toBe(12000);
  });

  it("limits eligibility to 0 when member has no savings", () => {
    const db = createBaseMockDb();
    const e = checkLoanEligibility(db, CHAMA_A, "non-existent-member", 1);
    expect(e.eligible).toBe(false);
    expect(e.maxLimit).toBe(0);
  });
});

describe("Loan balance tracking", () => {
  it("computes active loan balance incorporating interest", () => {
    const db = createBaseMockDb();
    db.loans.push({
      id: "loan-1", chama_id: CHAMA_A, member_id: MEMBER_2, amount: 10000, interest_rate: 10, term_months: 3,
      status: "active", application_date: "2026-01-01", created_at: "2026-01-01",
    });
    expect(calculateSingleLoanBalance(db, "loan-1")).toBe(11000);
    expect(calculateActiveLoansTotal(db, CHAMA_A)).toBe(11000);

    db.repayments.push({
      id: "rep-1", loan_id: "loan-1", amount: 4000, repayment_date: "2026-02-01", payment_method: "M-Pesa", created_at: "2026-02-01",
    });
    expect(calculateSingleLoanBalance(db, "loan-1")).toBe(7000);
    expect(calculateActiveLoansTotal(db, CHAMA_A)).toBe(7000);
  });

  it("caps a fully/over paid loan at 0", () => {
    const db = createBaseMockDb();
    db.loans.push({
      id: "loan-1", chama_id: CHAMA_A, member_id: MEMBER_2, amount: 10000, interest_rate: 10, term_months: 3,
      status: "active", application_date: "2026-01-01", created_at: "2026-01-01",
    });
    db.repayments.push({
      id: "rep-1", loan_id: "loan-1", amount: 12000, repayment_date: "2026-02-01", payment_method: "M-Pesa", created_at: "2026-02-01",
    });
    expect(calculateSingleLoanBalance(db, "loan-1")).toBe(0);
    expect(calculateActiveLoansTotal(db, CHAMA_A)).toBe(0);
  });

  it("ignores pending and rejected loans in the active total", () => {
    const db = createBaseMockDb();
    db.loans.push({
      id: "loan-pending", chama_id: CHAMA_A, member_id: MEMBER_2, amount: 10000, interest_rate: 10, term_months: 3,
      status: "pending", application_date: "2026-01-01", created_at: "2026-01-01",
    });
    db.loans.push({
      id: "loan-rejected", chama_id: CHAMA_A, member_id: MEMBER_3, amount: 5000, interest_rate: 10, term_months: 3,
      status: "rejected", application_date: "2026-01-01", created_at: "2026-01-01",
    });
    expect(calculateActiveLoansTotal(db, CHAMA_A)).toBe(0);
  });
});

describe("Dividend split calculations", () => {
  it("splits surplus in exact proportion to member savings shares", () => {
    const db = createBaseMockDb();
    const surplus = 20000;
    const splits = calculateDividendSplits(db, CHAMA_A, surplus);
    const s1 = splits.find((s) => s.memberId === MEMBER_1)!;
    const s2 = splits.find((s) => s.memberId === MEMBER_2)!;
    const s3 = splits.find((s) => s.memberId === MEMBER_3)!;

    expect(s1.share).toBe(50);
    expect(s1.dividend).toBe(10000);
    expect(s2.share).toBe(25);
    expect(s2.dividend).toBe(5000);
    expect(s3.share).toBe(25);
    expect(s3.dividend).toBe(5000);

    const sum = splits.reduce((acc, s) => acc + s.dividend, 0);
    expect(sum).toBe(surplus);
  });

  it("handles a chama with zero total savings without dividing by zero", () => {
    const db = createBaseMockDb();
    db.contributions = [];
    const splits = calculateDividendSplits(db, CHAMA_A, 10000);
    expect(splits.length).toBe(3);
    splits.forEach((split) => {
      expect(split.share).toBe(0);
      expect(split.dividend).toBe(0);
    });
  });
});
