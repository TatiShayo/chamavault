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

  const { data: fines, error } = await supabase
    .from("fines")
    .select("id, member_id, reason, amount, paid, issued_at, chama_members!inner(full_name)")
    .eq("chama_id", chamaId)
    .order("issued_at", { ascending: false });

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  const rows = (fines || []).map((f: Record<string, unknown>) => ({
    id: f.id,
    memberId: f.member_id,
    fullName: (f.chama_members as { full_name: string })?.full_name,
    reason: f.reason,
    amount: f.amount,
    paid: f.paid,
    issuedAt: f.issued_at,
  }));

  const outstanding = rows
    .filter((r) => !r.paid)
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return NextResponse.json({ fines: rows, outstanding });
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
      { error: "Only officers can manage fines" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { memberId, reason, amount, notes } = body;

  if (!memberId || !reason || !amount) {
    return NextResponse.json(
      { error: "memberId, reason, and amount are required" },
      { status: 400 }
    );
  }

  if (Number(amount) <= 0) {
    return NextResponse.json(
      { error: "Amount must be greater than 0" },
      { status: 400 }
    );
  }

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

  const { data: fine, error } = await supabase
    .from("fines")
    .insert({
      chama_id: chamaId,
      member_id: memberId,
      reason: notes ? `${reason} — ${notes}` : reason,
      amount: Number(amount),
    })
    .select("id, member_id, reason, amount, paid, issued_at")
    .single();

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({
    fine: {
      id: fine.id,
      memberId: fine.member_id,
      reason: fine.reason,
      amount: fine.amount,
      paid: fine.paid,
      issuedAt: fine.issued_at,
      fullName: null,
    },
  });
}

export async function PATCH(
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
      { error: "Only officers can manage fines" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { fineId, paid } = body;

  if (!fineId) {
    return NextResponse.json({ error: "fineId is required" }, { status: 400 });
  }

  const { data: fine, error } = await supabase
    .from("fines")
    .update({ paid })
    .eq("id", fineId)
    .eq("chama_id", chamaId)
    .select("id, paid")
    .single();

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({ fine });
}
