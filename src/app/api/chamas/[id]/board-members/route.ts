import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data, error } = await supabase
    .from("board_members")
    .select("*")
    .eq("chama_id", chamaId)
    .order("appointed_date", { ascending: true });

  if (error) { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }

  return NextResponse.json({ board_members: data });
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
    return NextResponse.json({ error: "Only officers can manage board members" }, { status: 403 });
  }

  const body = await request.json();
  const { full_name, role, appointed_date, term_expiry } = body;

  if (!full_name || !role) {
    return NextResponse.json({ error: "Full name and role are required" }, { status: 400 });
  }

  const validRoles = ["chairperson", "vice_chair", "treasurer", "secretary", "director", "supervisory_committee"];
  if (!validRoles.includes(role)) {
    return NextResponse.json({ error: `Role must be one of: ${validRoles.join(", ")}` }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("board_members")
    .insert({
      chama_id: chamaId,
      full_name,
      role,
      appointed_date: appointed_date || new Date().toISOString().split("T")[0],
      term_expiry: term_expiry || null,
      status: "active",
    })
    .select()
    .single();

  if (error) { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }

  return NextResponse.json({ board_member: data });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
    return NextResponse.json({ error: "Only officers can manage board members" }, { status: 403 });
  }

  const body = await request.json();
  const { boardMemberId, ...updates } = body;

  if (!boardMemberId) {
    return NextResponse.json({ error: "boardMemberId is required" }, { status: 400 });
  }

  if (updates.role) {
    const validRoles = ["chairperson", "vice_chair", "treasurer", "secretary", "director", "supervisory_committee"];
    if (!validRoles.includes(updates.role)) {
      return NextResponse.json({ error: `Role must be one of: ${validRoles.join(", ")}` }, { status: 400 });
    }
  }

  const { data, error } = await supabase
    .from("board_members")
    .update(updates)
    .eq("id", boardMemberId)
    .eq("chama_id", chamaId)
    .select()
    .single();

  if (error) { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }

  return NextResponse.json({ board_member: data });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
    return NextResponse.json({ error: "Only officers can manage board members" }, { status: 403 });
  }

  const body = await request.json();
  const { boardMemberId } = body;

  if (!boardMemberId) {
    return NextResponse.json({ error: "boardMemberId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("board_members")
    .delete()
    .eq("id", boardMemberId)
    .eq("chama_id", chamaId);

  if (error) { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }

  return NextResponse.json({ success: true });
}
