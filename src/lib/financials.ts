import type { DbState } from './mockDb';
import { toCents, fromCents, sumCents, allocateByShares, loanBalance } from './money';

/**
 * Calculates the total savings for a specific chama, sum of paid contributions excluding dividends.
 */
export function calculateTotalSavings(db: DbState, chamaId: string): number {
  const paidAmounts = db.contributions
    .filter(c => c.chama_id === chamaId && c.status === 'paid' && !c.remarks?.includes('Dividend'))
    .map(c => c.amount);
  return fromCents(sumCents(paidAmounts));
}

/**
 * Calculates a specific member's total savings within a chama, sum of paid contributions excluding dividends.
 */
export function calculateMemberSavings(db: DbState, chamaId: string, memberId: string): number {
  const paidAmounts = db.contributions
    .filter(c => c.member_id === memberId && c.chama_id === chamaId && c.status === 'paid' && !c.remarks?.includes('Dividend'))
    .map(c => c.amount);
  return fromCents(sumCents(paidAmounts));
}

/**
 * Calculates the total outstanding balance of active loans for a chama.
 * Balance is calculated as (principal + interest) - repaid amounts.
 */
export function calculateActiveLoansTotal(db: DbState, chamaId: string): number {
  const activeLoans = db.loans.filter(l => l.chama_id === chamaId && l.status === 'active');
  
  let totalOutstandingCents = 0;
  for (const loan of activeLoans) {
    const repaidCents = sumCents(
      db.repayments.filter(r => r.loan_id === loan.id).map(r => r.amount)
    );
    const balance = loanBalance(loan.amount, loan.interest_rate, fromCents(repaidCents));
    totalOutstandingCents += balance.outstandingCents;
  }

  return fromCents(totalOutstandingCents);
}

/**
 * Calculates outstanding loan balance for a single loan.
 */
export function calculateSingleLoanBalance(db: DbState, loanId: string): number {
  const loan = db.loans.find(l => l.id === loanId);
  if (!loan) return 0;
  const repaidCents = sumCents(
    db.repayments.filter(r => r.loan_id === loanId).map(r => r.amount)
  );
  return fromCents(loanBalance(loan.amount, loan.interest_rate, fromCents(repaidCents)).outstandingCents);
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
  const maxLimit = fromCents(toCents(savingsBase) * 3);
  return {
    eligible: toCents(requestedAmount) <= toCents(maxLimit),
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
 * Distributes exactly in proportion to member savings shares using the canonical largest-remainder method.
 */
export function calculateDividendSplits(
  db: DbState,
  chamaId: string,
  dividendSurplus: number
): DividendSplitResult[] {
  const chamaMembers = db.members.filter(m => m.chama_id === chamaId);
  const totalChamaSavings = calculateTotalSavings(db, chamaId);

  if (totalChamaSavings === 0 || chamaMembers.length === 0) {
    return chamaMembers.map(m => ({
      memberId: m.id,
      name: m.name,
      savings: 0,
      share: 0,
      dividend: 0
    }));
  }

  const memberSavingsMap = new Map<string, number>();
  for (const member of chamaMembers) {
    memberSavingsMap.set(member.id, calculateMemberSavings(db, chamaId, member.id));
  }

  const totalCents = toCents(dividendSurplus);
  const allocations = allocateByShares(
    totalCents,
    chamaMembers,
    (m) => toCents(memberSavingsMap.get(m.id) || 0)
  );

  return allocations.map(({ item: member, amountCents }) => {
    const mSavings = memberSavingsMap.get(member.id) || 0;
    const sharePct = totalChamaSavings > 0 ? (mSavings / totalChamaSavings) * 100 : 0;
    return {
      memberId: member.id,
      name: member.name,
      savings: mSavings,
      share: Number(sharePct.toFixed(2)),
      dividend: fromCents(amountCents),
    };
  });
}
