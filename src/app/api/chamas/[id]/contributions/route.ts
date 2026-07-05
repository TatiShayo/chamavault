import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
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

  if (!membership) {
    return NextResponse.json({ error: "Not a member of this chama" }, { status: 403 });
  }

  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");

  let query = supabase
    .from("contributions")
    .select("id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method, chama_members!inner(full_name)")
    .eq("chama_id", chamaId)
    .order("month_year", { ascending: true });

  if (from) {
    query = query.gte("month_year", `${from}-01`);
  }
  if (to) {
    const lastDay = new Date(parseInt(to.split("-")[0]), parseInt(to.split("-")[1]), 0).getDate();
    query = query.lte("month_year", `${to}-${lastDay}`);
  }

  const { data: contributions, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (contributions || []).map((c: Record<string, unknown>) => ({
    id: c.id,
    memberId: c.member_id,
    fullName: (c.chama_members as { full_name: string })?.full_name,
    monthYear: c.month_year,
    amountDue: c.amount_due,
    amountPaid: c.amount_paid,
    paidAt: c.paid_at,
    paymentMethod: c.payment_method,
  }));

  return NextResponse.json({ contributions: rows });
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

  if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only officers can record contributions" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { memberId, monthYear, amount, paymentMethod } = body;

  if (!memberId || !monthYear || !amount) {
    return NextResponse.json(
      { error: "memberId, monthYear, and amount are required" },
      { status: 400 }
    );
  }

  // Get chama contribution amount for this member
  const { data: chama } = await supabase
    .from("chamas")
    .select("contribution_amount")
    .eq("id", chamaId)
    .single();

  if (!chama) {
    return NextResponse.json({ error: "Chama not found" }, { status: 404 });
  }

  // Verify member belongs to this chama
  const { data: member } = await supabase
    .from("chama_members")
    .select("id")
    .eq("id", memberId)
    .eq("chama_id", chamaId)
    .single();

  if (!member) {
    return NextResponse.json(
      { error: "Member not found in this chama" },
      { status: 404 }
    );
  }

  // Upsert contribution
  const { data: existing } = await supabase
    .from("contributions")
    .select("id, amount_paid")
    .eq("chama_id", chamaId)
    .eq("member_id", memberId)
    .eq("month_year", monthYear)
    .maybeSingle();

  if (existing) {
    const newPaid = Number(existing.amount_paid) + Number(amount);
    const { data: updated, error } = await supabase
      .from("contributions")
      .update({
        amount_paid: newPaid,
        paid_at: new Date().toISOString(),
        payment_method: paymentMethod || null,
        recorded_by: user.id,
      })
      .eq("id", existing.id)
      .select("id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ contribution: updated });
  }

  // Create new contribution record
  const { data: created, error } = await supabase
    .from("contributions")
    .insert({
      chama_id: chamaId,
      member_id: memberId,
      month_year: monthYear,
      amount_due: chama.contribution_amount,
      amount_paid: amount,
      paid_at: new Date().toISOString(),
      payment_method: paymentMethod || null,
      recorded_by: user.id,
    })
    .select("id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ contribution: created });
}
