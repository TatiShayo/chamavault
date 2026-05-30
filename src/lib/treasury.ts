import { createClient } from "@/lib/supabase/server";

export interface TreasuryBalance {
  balance: number;
  totalContributions: number;
  totalExpenses: number;
  activeLoans: number;
  totalRepaid: number;
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

  const { data: repayments } = await supabase
    .from("loan_repayments")
    .select("amount, loans!inner(chama_id)")
    .eq("loans.chama_id", chamaId);

  const totalRepaid = (repayments || []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  const { data: loans } = await supabase
    .from("loans")
    .select("amount, status")
    .eq("chama_id", chamaId)
    .neq("status", "rejected");

  const activeLoans = (loans || []).reduce(
    (sum, l) => sum + Number(l.amount),
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

  const balance = totalContributions + totalRepaid - activeLoans - totalExpenses;

  return {
    balance,
    totalContributions,
    totalExpenses,
    activeLoans,
    totalRepaid,
  };
}
