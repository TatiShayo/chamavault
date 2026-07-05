export interface TreasuryCalc {
  balance: number;
  totalContributions: number;
  totalExpenses: number;
  totalLoansDisbursed: number;
  totalLoanRepayments: number;
}

export function calcTreasuryBalance(
  contributions: { amount_paid: number }[],
  repayments: { amount: number }[],
  loans: { amount: number }[],
  expenses: { amount: number }[]
): TreasuryCalc {
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount_paid, 0);
  const totalLoanRepayments = repayments.reduce((sum, r) => sum + r.amount, 0);
  const totalLoansDisbursed = loans.reduce((sum, l) => sum + l.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const balance = totalContributions + totalLoanRepayments - totalLoansDisbursed - totalExpenses;

  return { balance, totalContributions, totalExpenses, totalLoansDisbursed, totalLoanRepayments };
}

export interface LoanCalc {
  interest: number;
  totalDue: number;
  outstanding: number;
}

export function calcLoan(amount: number, interestRate: number, totalRepaid: number): LoanCalc {
  const interest = amount * (interestRate / 100);
  const totalDue = amount + interest;
  const outstanding = Math.max(0, totalDue - totalRepaid);
  return { interest, totalDue, outstanding };
}

export function calcMaxLoan(totalContributions: number): number {
  return totalContributions * 3;
}

export interface DividendCalc {
  distributableProfit: number;
  totalUnits: number;
  shares: { memberId: string; shareUnits: number; dividendAmount: number }[];
}

export function calcDividends(
  contributions: { amount_paid: number }[],
  loanRepayments: { amount: number }[],
  expenses: { amount: number }[],
  members: { id: string; share_units: number }[]
): DividendCalc {
  const totalContributions = contributions.reduce((sum, c) => sum + c.amount_paid, 0);
  const totalRepayments = loanRepayments.reduce((sum, r) => sum + r.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  const distributableProfit = totalContributions + totalRepayments - totalExpenses;
  const totalUnits = members.reduce((sum, m) => sum + (m.share_units || 0), 0);
  const memberCount = members.length;

  const shares = members.map((m, index) => {
    const units = m.share_units || 0;
    const share =
      totalUnits > 0
        ? (units / totalUnits) * distributableProfit
        : memberCount > 0
          ? distributableProfit / memberCount
          : 0;
    // Round down first, then distribute remainder to avoid floating-point drift
    const rounded = Math.floor(share * 100) / 100;
    return {
      memberId: m.id,
      shareUnits: units,
      dividendAmount: rounded,
      _rawShare: share,
      _index: index,
    };
  });

  // Distribute rounding remainder (up to 1 cent per member)
  const totalRounded = shares.reduce((s, sh) => s + sh.dividendAmount, 0);
  let remainder = Math.round((distributableProfit - totalRounded) * 100);
  let i = 0;
  while (remainder > 0 && i < shares.length * 100) {
    if (remainder > 0) {
      shares[i % shares.length].dividendAmount = Math.round((shares[i % shares.length].dividendAmount + 0.01) * 100) / 100;
      remainder--;
    }
    i++;
  }

  return { distributableProfit, totalUnits, shares: shares.map(({ _rawShare, _index, ...s }) => s) };
}

export type ContributionStatus = "paid" | "partial" | "pending" | "overdue";

export function calcContributionStatus(
  amountPaid: number,
  amountDue: number,
  monthYear: string,
  referenceDate?: Date
): ContributionStatus {
  const now = referenceDate || new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  if (amountPaid >= amountDue) return "paid";
  if (amountPaid > 0) return "partial";
  return monthYear < currentMonth ? "overdue" : "pending";
}

export function calcContributionTotals(
  memberContributions: { amount_paid: number; amount_due: number }[]
): { totalPaid: number; totalDue: number } {
  const totalPaid = memberContributions.reduce((sum, c) => sum + c.amount_paid, 0);
  const totalDue = memberContributions.reduce((sum, c) => sum + c.amount_due, 0);
  return { totalPaid, totalDue };
}

export function calcCombinedPaid(existingPaid: number, newAmount: number): number {
  return existingPaid + newAmount;
}

export function getMonthsFromFounding(dateStr: string, count: number): string[] {
  const [year, month] = dateStr.split("-").map(Number);
  const months: string[] = [];
  let y = year;
  let m = month;
  for (let i = 0; i < count; i++) {
    months.push(`${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}

export interface MemberContributionRow {
  memberId: string;
  paid: number;
  due: number;
  balance: number;
}

export function calcMemberContributionBalances(
  memberIds: string[],
  contributions: { member_id: string; amount_paid: number; amount_due: number }[]
): MemberContributionRow[] {
  return memberIds.map((id) => {
    const memberContribs = contributions.filter((c) => c.member_id === id);
    const paid = memberContribs.reduce((s, c) => s + c.amount_paid, 0);
    const due = memberContribs.reduce((s, c) => s + c.amount_due, 0);
    return { memberId: id, paid, due, balance: due - paid };
  });
}

export function calcUnpaidFinesTotal(fines: { amount: number }[]): number {
  return fines.reduce((sum, f) => sum + f.amount, 0);
}

export function calcMonthlyExpenseTotal(expenses: { amount: number }[]): number {
  return expenses.reduce((sum, e) => sum + e.amount, 0);
}
