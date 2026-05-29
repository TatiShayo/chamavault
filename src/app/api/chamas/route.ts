import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, meetingDay, contributionAmount, meetingFrequency, foundingDate, objective } = body;

  if (!name || !meetingDay || !contributionAmount) {
    return NextResponse.json(
      { error: "Name, meeting day, and contribution amount are required" },
      { status: 400 }
    );
  }

  // Create the chama
  const { data: chama, error: chamaError } = await supabase
    .from("chamas")
    .insert({
      name,
      meeting_day: meetingDay,
      meeting_frequency: meetingFrequency || "monthly",
      contribution_amount: contributionAmount,
      founding_date: foundingDate || new Date().toISOString().split("T")[0],
      objective: objective || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (chamaError) {
    return NextResponse.json({ error: chamaError.message }, { status: 500 });
  }

  // Add creator as chairperson
  const { error: memberError } = await supabase.from("chama_members").insert({
    chama_id: chama.id,
    user_id: user.id,
    full_name: user.user_metadata?.full_name || user.email || "Member",
    role: "chairperson",
  });

  if (memberError) {
    // Rollback: delete the chama since we couldn't add the member
    await supabase.from("chamas").delete().eq("id", chama.id);
    return NextResponse.json({ error: memberError.message }, { status: 500 });
  }

  return NextResponse.json({ chama });
}
