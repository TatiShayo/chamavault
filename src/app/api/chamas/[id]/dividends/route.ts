import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year") || String(new Date().getFullYear());

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: members } = await supabase
    .from("chama_members")
    .select("id, full_name, share_units")
    .eq("chama_id", chamaId)
    .order("joined_at", { ascending: true });

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: contributions } = await supabase
    .from("contributions")
    .select("amount_paid")
    .eq("chama_id", chamaId)
    .gte("month_year", startDate)
    .lte("month_year", endDate);

  const totalContributions = (contributions || []).reduce(
    (sum, c) => sum + Number(c.amount_paid),
    0
  );

  const { data: loanRepayments } = await supabase
    .from("loan_repayments")
    .select("amount, paid_at, loans!inner(chama_id)")
    .eq("loans.chama_id", chamaId)
    .gte("paid_at", startDate)
    .lte("paid_at", `${endDate}T23:59:59Z`);

  const totalRepayments = (loanRepayments || []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("chama_id", chamaId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate);

  const totalExpenses = (expenses || []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const distributableProfit = totalContributions + totalRepayments - totalExpenses;

  const totalUnits = (members || []).reduce(
    (sum, m) => sum + Number(m.share_units || 0),
    0
  );

  const memberCount = (members || []).length;

  const dividendRows = (members || []).map((m) => {
    const units = Number(m.share_units || 0);
    const share =
      totalUnits > 0
        ? (units / totalUnits) * distributableProfit
        : memberCount > 0
          ? distributableProfit / memberCount
          : 0;
    return {
      memberId: m.id,
      fullName: m.full_name,
      shareUnits: units,
      dividendAmount: Math.round(share * 100) / 100,
    };
  });

  return NextResponse.json({
    year: Number(year),
    totalContributions,
    totalRepayments,
    totalExpenses,
    distributableProfit,
    totalUnits,
    members: dividendRows,
  });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["chairperson", "treasurer"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only chairperson or treasurer can distribute dividends" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { year } = body;

  if (!year) {
    return NextResponse.json({ error: "Year is required" }, { status: 400 });
  }

  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: members } = await supabase
    .from("chama_members")
    .select("id, share_units")
    .eq("chama_id", chamaId);

  const { data: contributions } = await supabase
    .from("contributions")
    .select("amount_paid")
    .eq("chama_id", chamaId)
    .gte("month_year", startDate)
    .lte("month_year", endDate);

  const totalContributions = (contributions || []).reduce(
    (sum, c) => sum + Number(c.amount_paid),
    0
  );

  const { data: loanRepayments } = await supabase
    .from("loan_repayments")
    .select("amount, paid_at, loans!inner(chama_id)")
    .eq("loans.chama_id", chamaId)
    .gte("paid_at", startDate)
    .lte("paid_at", `${endDate}T23:59:59Z`);

  const totalRepayments = (loanRepayments || []).reduce(
    (sum, r) => sum + Number(r.amount),
    0
  );

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("chama_id", chamaId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate);

  const totalExpenses = (expenses || []).reduce(
    (sum, e) => sum + Number(e.amount),
    0
  );

  const distributableProfit = totalContributions + totalRepayments - totalExpenses;
  const totalUnits = (members || []).reduce(
    (sum, m) => sum + Number(m.share_units || 0),
    0
  );

  const dividendRecords = (members || []).map((m) => {
    const units = Number(m.share_units || 0);
    const share =
      totalUnits > 0
        ? (units / totalUnits) * distributableProfit
        : (members || []).length > 0
          ? distributableProfit / (members || []).length
          : 0;
    return {
      chama_id: chamaId,
      member_id: m.id,
      year: Number(year),
      amount: Math.round(share * 100) / 100,
      distributed_by: user.id,
    };
  });

  const { error } = await supabase.from("dividends").insert(dividendRecords);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, distributed: dividendRecords.length });
}
