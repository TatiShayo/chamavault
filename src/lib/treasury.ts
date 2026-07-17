import { createClient } from "@/lib/supabase/server";

export interface TreasuryBalance {
  balance: number;
  totalContributions: number;
  totalLoansDisbursed: number;
  totalLoanRepayments: number;
  interestCollected: number;
  totalExpenses: number;
}

export async function getTreasuryBalance(chamaId: string): Promise<TreasuryBalance> {
  const supabase = await createClient();

  const { data: contributions } = await supabase
    .from("contributions")
    .select("amount_paid")
    .eq("chama_id", chamaId);

  const totalContributions = (contributions || []).reduce(
    (sum, c) => sum + Number(c.amount_paid),
    0
  );

  const { data: loans } = await supabase
    .from("loans")
    .select("amount, interest_rate, status")
    .eq("chama_id", chamaId)
    .neq("status", "rejected");

  const totalLoansDisbursed = (loans || []).reduce(
    (sum, l) => sum + Number(l.amount),
    0
  );

  const interestCollected = (loans || []).reduce(
    (sum, l) => {
      if (l.status === "repaid") {
        return sum + Number(l.amount) * (Number(l.interest_rate || 0) / 100);
      }
      return sum;
    },
    0
  );

  const { data: repayments } = await supabase
    .from("loan_repayments")
    .select("amount, loans!inner(chama_id)")
    .eq("loans.chama_id", chamaId);

  const totalLoanRepayments = (repayments || []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("chama_id", chamaId);

  const totalExpenses = (expenses || []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  // Formula: total contributions + repayments - loans disbursed - expenses
  // Repayments already include principal + interest, so no need to add interest separately
  const balance = totalContributions + totalLoanRepayments - totalLoansDisbursed - totalExpenses;

  return {
    balance,
    totalContributions,
    totalLoansDisbursed,
    totalLoanRepayments,
    interestCollected,
    totalExpenses,
  };
}

// NOTE: A former `getLoanOutstanding` here used a time-based interest accrual
// (`principal * rate * months/12`) that CONFLICTED with the canonical flat-rate
// formula in money.ts / the loans route. It was dead code (never imported) and
// has been removed to leave a single canonical loan formula. See loanBalance()
// in src/lib/money.ts and REVIEW_FINDINGS.md.

export async function getArrears(
  chamaId: string,
  memberId: string
): Promise<number> {
  const supabase = await createClient();

  const { data: contributions } = await supabase
    .from("contributions")
    .select("amount_due, amount_paid")
    .eq("chama_id", chamaId)
    .eq("member_id", memberId);

  return (contributions || []).reduce(
    (sum, c) => {
      const due = Number(c.amount_due);
      const paid = Number(c.amount_paid);
      return sum + Math.max(0, due - paid);
    },
    0
  );
}

export async function getTotalWorth(chamaId: string): Promise<number> {
  const treasury = await getTreasuryBalance(chamaId);

  const supabase = await createClient();
  const { data: activeLoans } = await supabase
    .from("loans")
    .select("amount, interest_rate")
    .eq("chama_id", chamaId)
    .eq("status", "active");

  const outstandingLoanValue = (activeLoans || []).reduce(
    (sum, l) => sum + Number(l.amount) * (1 + Number(l.interest_rate || 0) / 100),
    0
  );

  const { data: investments } = await supabase
    .from("investments")
    .select("current_value")
    .eq("chama_id", chamaId);

  const investmentValue = (investments || []).reduce(
    (sum, i) => sum + Number(i.current_value || 0),
    0
  );

  return treasury.balance + outstandingLoanValue + investmentValue;
}

export async function getMemberEquity(
  chamaId: string,
  memberId: string
): Promise<number> {
  const supabase = await createClient();

  const { data: member } = await supabase
    .from("chama_members")
    .select("share_units")
    .eq("chama_id", chamaId)
    .eq("id", memberId)
    .single();

  const { data: allMembers } = await supabase
    .from("chama_members")
    .select("share_units")
    .eq("chama_id", chamaId);

  const totalUnits = (allMembers || []).reduce(
    (sum, m) => sum + Number(m.share_units || 0),
    0
  );

  if (totalUnits === 0) return 0;

  const treasury = await getTreasuryBalance(chamaId);
  const memberUnits = Number(member?.share_units || 0);

  return (memberUnits / totalUnits) * treasury.balance;
}

