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
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("id, date, agenda, venue, minutes_text, created_at")
    .eq("chama_id", chamaId)
    .order("date", { ascending: false });

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  const { data: attendance } = await supabase
    .from("meeting_attendance")
    .select("meeting_id, member_id, present")
    .in("meeting_id", (meetings || []).map((m) => m.id));

  const attendanceMap: Record<string, Record<string, boolean>> = {};
  for (const a of attendance || []) {
    const mid = a.meeting_id as string;
    if (!attendanceMap[mid]) attendanceMap[mid] = {};
    attendanceMap[mid][a.member_id as string] = a.present as boolean;
  }

  const now = new Date();
  const upcoming = (meetings || []).filter((m) => new Date(m.date) >= now);
  const past = (meetings || []).filter((m) => new Date(m.date) < now);

  const rows = (meetings || []).map((m) => ({
    id: m.id,
    date: m.date,
    agenda: m.agenda,
    venue: m.venue,
    minutesText: m.minutes_text,
    createdAt: m.created_at,
    attendance: attendanceMap[m.id] || {},
  }));

  return NextResponse.json({ meetings: rows, upcoming, past, attendance: attendanceMap });
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
    return NextResponse.json({ error: "Only officers can create meetings" }, { status: 403 });
  }

  const body = await request.json();
  const { date, agenda, venue } = body;

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert({
      chama_id: chamaId,
      date,
      agenda: agenda || null,
      venue: venue || null,
    })
    .select("id, date, agenda, venue, minutes_text, created_at")
    .single();

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({ meeting: { ...meeting, minutesText: meeting.minutes_text, createdAt: meeting.created_at } });
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
    .select("role, id")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await request.json();
  const { meetingId, minutesText, attendance, action } = body;

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  }

  const isOfficer = ["chairperson", "treasurer", "secretary"].includes(membership.role);

  if (minutesText !== undefined) {
    if (!isOfficer) {
      return NextResponse.json({ error: "Only officers can edit minutes" }, { status: 403 });
    }

    const { error } = await supabase
      .from("meetings")
      .update({ minutes_text: minutesText })
      .eq("id", meetingId)
      .eq("chama_id", chamaId);

    if (error) {
      { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
    }

    return NextResponse.json({ success: true });
  }

  if (attendance !== undefined) {
    if (!isOfficer) {
      return NextResponse.json({ error: "Only officers can mark attendance" }, { status: 403 });
    }

    const records = Object.entries(attendance).map(([memberId, present]) => ({
      meeting_id: meetingId,
      member_id: memberId,
      present,
    }));

    const { error: deleteError } = await supabase
      .from("meeting_attendance")
      .delete()
      .eq("meeting_id", meetingId);

    if (deleteError) {
      { console.error("[api] server error:", deleteError); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
    }

    if (records.length > 0) {
      const { error: insertError } = await supabase
        .from("meeting_attendance")
        .insert(records);

      if (insertError) {
        { console.error("[api] server error:", insertError); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
      }
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "No valid action provided" }, { status: 400 });
}
