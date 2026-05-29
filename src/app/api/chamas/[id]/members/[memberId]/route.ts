import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> }
) {
  const { id: chamaId, memberId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from("chama_members")
    .select("id, role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only officers can change member roles" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { role } = body;

  if (!["chairperson", "treasurer", "secretary", "member"].includes(role)) {
    return NextResponse.json(
      { error: "Invalid role. Must be: chairperson, treasurer, secretary, or member" },
      { status: 400 }
    );
  }

  // Only chairperson can assign chairperson or treasurer roles
  if (
    (role === "chairperson" || role === "treasurer") &&
    membership.role !== "chairperson"
  ) {
    return NextResponse.json(
      { error: "Only the chairperson can assign chairperson or treasurer roles" },
      { status: 403 }
    );
  }

  // Fetch target member
  const { data: target } = await supabase
    .from("chama_members")
    .select("id, role")
    .eq("id", memberId)
    .eq("chama_id", chamaId)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Prevent officers from changing their own role
  if (target.id === membership.id) {
    return NextResponse.json(
      { error: "You cannot change your own role" },
      { status: 403 }
    );
  }

  // No-op: same role
  if (target.role === role) {
    return NextResponse.json({ member: target });
  }

  // Enforce uniqueness for officer roles
  if (["chairperson", "treasurer", "secretary"].includes(role)) {
    const { data: existing } = await supabase
      .from("chama_members")
      .select("id")
      .eq("chama_id", chamaId)
      .eq("role", role)
      .neq("id", memberId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: `There is already a ${role}. Demote them first before promoting someone else.` },
        { status: 409 }
      );
    }
  }

  // Prevent demoting the last chairperson
  if (target.role === "chairperson") {
    const { count } = await supabase
      .from("chama_members")
      .select("id", { count: "exact", head: true })
      .eq("chama_id", chamaId)
      .eq("role", "chairperson");

    if (count === 1) {
      return NextResponse.json(
        { error: "Cannot demote the only chairperson. Promote another member to chairperson first." },
        { status: 403 }
      );
    }
  }

  const { data: updated, error } = await supabase
    .from("chama_members")
    .update({ role })
    .eq("id", memberId)
    .eq("chama_id", chamaId)
    .select("id, full_name, role")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ member: updated });
}
