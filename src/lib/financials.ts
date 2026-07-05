import type { DbState } from './mockDb';

/**
 * Calculates the total savings for a specific chama, sum of paid contributions excluding dividends.
 */
export function calculateTotalSavings(db: DbState, chamaId: string): number {
  return db.contributions
    .filter(c => c.chama_id === chamaId && c.status === 'paid' && !c.remarks?.includes('Dividend'))
    .reduce((sum, c) => sum + c.amount, 0);
}

/**
 * Calculates a specific member's total savings within a chama, sum of paid contributions excluding dividends.
 */
export function calculateMemberSavings(db: DbState, chamaId: string, memberId: string): number {
  return db.contributions
    .filter(c => c.member_id === memberId && c.chama_id === chamaId && c.status === 'paid' && !c.remarks?.includes('Dividend'))
    .reduce((sum, c) => sum + c.amount, 0);
}

/**
 * Calculates the total outstanding balance of active loans for a chama.
 * Balance is calculated as (principal + interest) - repaid amounts.
 */
export function calculateActiveLoansTotal(db: DbState, chamaId: string): number {
  const activeLoans = db.loans.filter(l => l.chama_id === chamaId && l.status === 'active');
  const loanIds = activeLoans.map(l => l.id);
  const loanPrincipal = activeLoans.reduce((sum, l) => sum + l.amount, 0);
  const loanInterest = activeLoans.reduce((sum, l) => sum + (l.amount * (l.interest_rate / 100)), 0);
  const totalRepayable = loanPrincipal + loanInterest;
  const totalRepaid = db.repayments
    .filter(r => loanIds.includes(r.loan_id))
    .reduce((sum, r) => sum + r.amount, 0);
  return Math.max(0, totalRepayable - totalRepaid);
}

/**
 * Calculates outstanding loan balance for a single loan.
 */
export function calculateSingleLoanBalance(db: DbState, loanId: string): number {
  const loan = db.loans.find(l => l.id === loanId);
  if (!loan) return 0;
  const totalRepayable = loan.amount * (1 + loan.interest_rate / 100);
  const totalRepaid = db.repayments
    .filter(r => r.loan_id === loanId)
    .reduce((sum, r) => sum + r.amount, 0);
  return Math.max(0, totalRepayable - totalRepaid);
}

/**
 * Checks if a member is eligible for a requested loan amount.
 * The limit is 3x their accumulated savings.
 */
export function checkLoanEligibility(db: DbState, chamaId: string, memberId: string, requestedAmount: number): {
  eligible: boolean;
  savingsBase: number;
  maxLimit: number;
} {
  const savingsBase = calculateMemberSavings(db, chamaId, memberId);
  const maxLimit = savingsBase * 3;
  return {
    eligible: requestedAmount <= maxLimit,
    savingsBase,
    maxLimit
  };
}

export interface DividendSplitResult {
  memberId: string;
  name: string;
  savings: number;
  share: number; // Percentage, e.g. 25 for 25%
  dividend: number;
}

/**
 * Calculates the dividend split for a given surplus.
 * Distributes exactly in proportion to member savings shares.
 */
export function calculateDividendSplits(
  db: DbState,
  chamaId: string,
  dividendSurplus: number
): DividendSplitResult[] {
  const chamaMembers = db.members.filter(m => m.chama_id === chamaId);
  const totalChamaSavings = calculateTotalSavings(db, chamaId);

  if (totalChamaSavings === 0) {
    return chamaMembers.map(m => ({
      memberId: m.id,
      name: m.name,
      savings: 0,
      share: 0,
      dividend: 0
    }));
  }

  return chamaMembers.map(member => {
    const mSavings = calculateMemberSavings(db, chamaId, member.id);
    const share = mSavings / totalChamaSavings;
    const dividend = dividendSurplus * share;
    return {
      memberId: member.id,
      name: member.name,
      savings: mSavings,
      share: share * 100, // percentage
      dividend
    };
  });
}
