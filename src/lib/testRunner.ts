import type { DbState, Chama, ChamaMember, Contribution, Fine, Loan, LoanRepayment, Expense, Meeting, MeetingAttendance, Vote, VoteRecord } from './mockDb';
import {
  calculateTotalSavings,
  calculateMemberSavings,
  calculateActiveLoansTotal,
  calculateSingleLoanBalance,
  checkLoanEligibility,
  calculateDividendSplits
} from './financials';

// Color logging helpers for clean terminal output
const green = (text: string) => `\x1b[32m${text}\x1b[0m`;
const red = (text: string) => `\x1b[31m${text}\x1b[0m`;
const yellow = (text: string) => `\x1b[33m${text}\x1b[0m`;
const cyan = (text: string) => `\x1b[36m${text}\x1b[0m`;

let failedTestsCount = 0;

function describe(suiteName: string, fn: () => void) {
  console.log(`\n${cyan('===')} ${suiteName} ${cyan('===')}`);
  fn();
}

function it(testName: string, fn: () => void) {
  try {
    fn();
    console.log(`  ${green('✓')} ${testName}`);
  } catch (error: any) {
    failedTestsCount++;
    console.error(`  ${red('✗')} ${testName}`);
    console.error(`    ${red(error.stack || error.message)}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)}, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -precision) / 2;
      if (diff > tolerance) {
        throw new Error(`Expected ${actual} to be close to ${expected} (tolerance: ${tolerance})`);
      }
    },
    toBeTrue() {
      if (actual !== true) {
        throw new Error(`Expected true, but got ${JSON.stringify(actual)}`);
      }
    },
    toBeFalse() {
      if (actual !== false) {
        throw new Error(`Expected false, but got ${JSON.stringify(actual)}`);
      }
    }
  };
}

// Set up a mock database state for testing
const CHAMA_A = 'test-chama-a';
const MEMBER_1 = 'member-1';
const MEMBER_2 = 'member-2';
const MEMBER_3 = 'member-3';

const createBaseMockDb = (): DbState => ({
  chamas: [
    { id: CHAMA_A, name: 'Test Chama A', description: 'Testing', created_at: '2026-01-01', currency: 'KES', status: 'active' }
  ],
  members: [
    { id: MEMBER_1, chama_id: CHAMA_A, name: 'Member One', email: 'one@test.com', role: 'Chairperson', joined_at: '2026-01-01' },
    { id: MEMBER_2, chama_id: CHAMA_A, name: 'Member Two', email: 'two@test.com', role: 'Treasurer', joined_at: '2026-01-01' },
    { id: MEMBER_3, chama_id: CHAMA_A, name: 'Member Three', email: 'three@test.com', role: 'Member', joined_at: '2026-01-01' }
  ],
  contributions: [
    // Member 1 paid contributions
    { id: 'c1', chama_id: CHAMA_A, member_id: MEMBER_1, amount: 2000, contribution_date: '2026-01', status: 'paid', created_at: '2026-01-15' },
    { id: 'c2', chama_id: CHAMA_A, member_id: MEMBER_1, amount: 2000, contribution_date: '2026-02', status: 'paid', created_at: '2026-02-15' },
    // Member 2 paid contributions
    { id: 'c3', chama_id: CHAMA_A, member_id: MEMBER_2, amount: 2000, contribution_date: '2026-01', status: 'paid', created_at: '2026-01-15' },
    // Member 3 paid, pending and overdue contributions
    { id: 'c4', chama_id: CHAMA_A, member_id: MEMBER_3, amount: 2000, contribution_date: '2026-01', status: 'paid', created_at: '2026-01-15' },
    { id: 'c5', chama_id: CHAMA_A, member_id: MEMBER_3, amount: 2000, contribution_date: '2026-02', status: 'pending', created_at: '2026-02-15' },
    { id: 'c6', chama_id: CHAMA_A, member_id: MEMBER_3, amount: 2000, contribution_date: '2026-03', status: 'overdue', created_at: '2026-03-15' },
    // Dividend payout contribution (should not count as savings base)
    { id: 'c7', chama_id: CHAMA_A, member_id: MEMBER_1, amount: 500, contribution_date: '2026-03', status: 'paid', remarks: 'Dividend: Distributed', created_at: '2026-03-15' }
  ],
  fines: [],
  loans: [],
  repayments: [],
  expenses: [],
  meetings: [],
  attendance: [],
  votes: [],
  voteRecords: []
});

describe('Contribution Calculations', () => {
  it('should sum up only paid savings contributions for total chama savings (excluding dividends)', () => {
    const db = createBaseMockDb();
    const totalSavings = calculateTotalSavings(db, CHAMA_A);
    // Paid savings: c1(2000) + c2(2000) + c3(2000) + c4(2000) = 8000
    // c5 is pending, c6 is overdue, c7 is a dividend payout.
    expect(totalSavings).toBe(8000);
  });

  it('should calculate individual member savings base correctly (excluding dividends and unpaid contributions)', () => {
    const db = createBaseMockDb();
    
    // Member 1 paid savings: c1(2000) + c2(2000) = 4000. c7(500) is dividend so excluded.
    expect(calculateMemberSavings(db, CHAMA_A, MEMBER_1)).toBe(4000);

    // Member 2 paid savings: c3(2000) = 2000.
    expect(calculateMemberSavings(db, CHAMA_A, MEMBER_2)).toBe(2000);

    // Member 3 paid savings: c4(2000) = 2000. c5(pending) and c6(overdue) are excluded.
    expect(calculateMemberSavings(db, CHAMA_A, MEMBER_3)).toBe(2000);
  });

  it('should return 0 savings if member has no contributions', () => {
    const db = createBaseMockDb();
    expect(calculateMemberSavings(db, CHAMA_A, 'non-existent-member')).toBe(0);
  });
});

describe('Loan Eligibility Checks', () => {
  it('should approve loans within 3x of a member savings base', () => {
    const db = createBaseMockDb();
    
    // Member 1 savings = 4000. Limit = 12000.
    const eligibleUnder = checkLoanEligibility(db, CHAMA_A, MEMBER_1, 10000);
    expect(eligibleUnder.eligible).toBeTrue();
    expect(eligibleUnder.savingsBase).toBe(4000);
    expect(eligibleUnder.maxLimit).toBe(12000);

    const eligibleExact = checkLoanEligibility(db, CHAMA_A, MEMBER_1, 12000);
    expect(eligibleExact.eligible).toBeTrue();
  });

  it('should deny loans exceeding 3x of a member savings base', () => {
    const db = createBaseMockDb();

    // Member 1 savings = 4000. Limit = 12000.
    const eligibleOver = checkLoanEligibility(db, CHAMA_A, MEMBER_1, 12001);
    expect(eligibleOver.eligible).toBeFalse();
    expect(eligibleOver.maxLimit).toBe(12000);
  });

  it('should limit eligibility to 0 if a member has 0 savings', () => {
    const db = createBaseMockDb();
    const eligibility = checkLoanEligibility(db, CHAMA_A, 'non-existent-member', 1);
    expect(eligibility.eligible).toBeFalse();
    expect(eligibility.maxLimit).toBe(0);
  });
});

describe('Loan Balance Tracking', () => {
  it('should calculate active loan balances correctly incorporating interest rate', () => {
    const db = createBaseMockDb();
    
    // Add active loan: Principal 10000, Interest 10% (repayable = 11000)
    db.loans.push({
      id: 'loan-1', chama_id: CHAMA_A, member_id: MEMBER_2, amount: 10000, interest_rate: 10, term_months: 3,
      status: 'active', application_date: '2026-01-01', created_at: '2026-01-01'
    });

    // Verify individual balance before repayment
    expect(calculateSingleLoanBalance(db, 'loan-1')).toBe(11000);
    expect(calculateActiveLoansTotal(db, CHAMA_A)).toBe(11000);

    // Record a repayment of 4000
    db.repayments.push({
      id: 'rep-1', loan_id: 'loan-1', amount: 4000, repayment_date: '2026-02-01', payment_method: 'M-Pesa', created_at: '2026-02-01'
    });

    // Verify balance after partial repayment: 11000 - 4000 = 7000
    expect(calculateSingleLoanBalance(db, 'loan-1')).toBe(7000);
    expect(calculateActiveLoansTotal(db, CHAMA_A)).toBe(7000);
  });

  it('should handle fully paid loans cleanly without going negative', () => {
    const db = createBaseMockDb();
    db.loans.push({
      id: 'loan-1', chama_id: CHAMA_A, member_id: MEMBER_2, amount: 10000, interest_rate: 10, term_months: 3,
      status: 'active', application_date: '2026-01-01', created_at: '2026-01-01'
    });

    // Repay more than total due: 12000 (due: 11000)
    db.repayments.push({
      id: 'rep-1', loan_id: 'loan-1', amount: 12000, repayment_date: '2026-02-01', payment_method: 'M-Pesa', created_at: '2026-02-01'
    });

    // Verify outstanding balance is capped at 0
    expect(calculateSingleLoanBalance(db, 'loan-1')).toBe(0);
    expect(calculateActiveLoansTotal(db, CHAMA_A)).toBe(0);
  });

  it('should ignore pending or rejected loans in active loans total calculations', () => {
    const db = createBaseMockDb();
    db.loans.push({
      id: 'loan-pending', chama_id: CHAMA_A, member_id: MEMBER_2, amount: 10000, interest_rate: 10, term_months: 3,
      status: 'pending', application_date: '2026-01-01', created_at: '2026-01-01'
    });
    db.loans.push({
      id: 'loan-rejected', chama_id: CHAMA_A, member_id: MEMBER_3, amount: 5000, interest_rate: 10, term_months: 3,
      status: 'rejected', application_date: '2026-01-01', created_at: '2026-01-01'
    });

    expect(calculateActiveLoansTotal(db, CHAMA_A)).toBe(0);
  });
});

describe('Dividend Split Calculations', () => {
  it('should split surplus earnings in exact proportion to member savings shares', () => {
    const db = createBaseMockDb();
    // Member 1: 4000 (50% share of total 8000)
    // Member 2: 2000 (25% share)
    // Member 3: 2000 (25% share)
    
    const surplus = 20000;
    const splits = calculateDividendSplits(db, CHAMA_A, surplus);

    const s1 = splits.find(s => s.memberId === MEMBER_1)!;
    const s2 = splits.find(s => s.memberId === MEMBER_2)!;
    const s3 = splits.find(s => s.memberId === MEMBER_3)!;

    expect(s1.share).toBe(50);
    expect(s1.dividend).toBe(10000);

    expect(s2.share).toBe(25);
    expect(s2.dividend).toBe(5000);

    expect(s3.share).toBe(25);
    expect(s3.dividend).toBe(5000);

    // Sum of splits should equal exactly the surplus
    const sumDividends = splits.reduce((sum, s) => sum + s.dividend, 0);
    expect(sumDividends).toBe(surplus);
  });

  it('should handle chama with zero total savings safely without division by zero errors', () => {
    const db = createBaseMockDb();
    // Reset all contributions to zero
    db.contributions = [];

    const splits = calculateDividendSplits(db, CHAMA_A, 10000);
    expect(splits.length).toBe(3);
    splits.forEach(split => {
      expect(split.share).toBe(0);
      expect(split.dividend).toBe(0);
    });
  });
});

// Summary Report
console.log(`\n${cyan('=======================================')}`);
console.log(`Test Execution Finished.`);
if (failedTestsCount === 0) {
  console.log(`${green('ALL TESTS PASSED SUCCESSFULLY! ✓')}`);
  process.exit(0);
} else {
  console.error(`${red(`${failedTestsCount} TEST(S) FAILED. ✗`)}`);
  process.exit(1);
}
