import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { z } from "zod";
import { allocateDividends } from "@/lib/money";

const distributeSchema = z.object({
  year: z.coerce
    .number()
    .int()
    .gte(2000)
    .lte(2100),
});

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

  // Canonical, exact allocation (integer cents, largest-remainder). Parts sum
  // EXACTLY to distributableProfit — no penny lost to per-member rounding.
  const nameById = new Map((members || []).map((m) => [m.id, m.full_name]));
  const dividendRows = allocateDividends(distributableProfit, members || []).map(
    (a) => ({
      memberId: a.memberId,
      fullName: nameById.get(a.memberId),
      shareUnits: a.shareUnits,
      dividendAmount: a.amountKes,
    })
  );

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

  const parsed = distributeSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "A valid year (2000-2100) is required" },
      { status: 400 }
    );
  }
  const { year } = parsed.data;

  // Idempotency guard against double-payout: if dividends were already
  // distributed for this chama+year, refuse rather than inserting a second set
  // of records (which would double every member's payout). Pair with the
  // unique index in supabase/rls-policies.sql for a hard, race-proof backstop.
  const { count: existingCount } = await supabase
    .from("dividends")
    .select("id", { count: "exact", head: true })
    .eq("chama_id", chamaId)
    .eq("year", year);

  if ((existingCount ?? 0) > 0) {
    return NextResponse.json(
      { error: `Dividends for ${year} have already been distributed` },
      { status: 409 }
    );
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

  // Exact integer-cents allocation — persisted amounts sum EXACTLY to the
  // distributable profit and match what GET previews to members.
  const dividendRecords = allocateDividends(distributableProfit, members || []).map(
    (a) => ({
      chama_id: chamaId,
      member_id: a.memberId,
      year,
      amount: a.amountKes,
      distributed_by: user.id,
    })
  );

  const { error } = await supabase.from("dividends").insert(dividendRecords);

  if (error) {
    // A 23505 here means a concurrent request won the race against our
    // idempotency pre-check — treat as already-distributed, not a 500.
    if ((error as { code?: string }).code === "23505") {
      return NextResponse.json(
        { error: `Dividends for ${year} have already been distributed` },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Failed to distribute dividends" }, { status: 500 });
  }

  return NextResponse.json({ success: true, distributed: dividendRecords.length });
}
