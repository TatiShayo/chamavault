import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { sendInvitationEmail } from "@/lib/email";

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

  // Check officer role
  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Only chairperson, treasurer, or secretary can invite members" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { email, phone } = body;

  if (!email && !phone) {
    return NextResponse.json(
      { error: "Provide at least an email or phone number" },
      { status: 400 }
    );
  }

  const { data: invitation, error } = await supabase
    .from("invitations")
    .insert({
      chama_id: chamaId,
      email: email || null,
      phone: phone || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check if chama exists and get its name for the response
  const { data: chama } = await supabase
    .from("chamas")
    .select("name")
    .eq("id", chamaId)
    .single();

  const joinUrl = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin")}/join/${invitation.token}`;
  const publicUrl = `${process.env.NEXT_PUBLIC_SITE_URL || request.headers.get("origin")}/c/${chamaId}`;

  const chamaName = chama?.name || "Chama";

  // Send email if an email address was provided
  if (email) {
    sendInvitationEmail({ to: email, chamaName, joinUrl }).catch((e) =>
      console.error("Email send failed:", e)
    );
  }

  return NextResponse.json({
    invitation,
    joinUrl,
    chamaName,
    publicUrl,
  });
}

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

  // Check membership
  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: invitations, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("chama_id", chamaId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ invitations });
}
