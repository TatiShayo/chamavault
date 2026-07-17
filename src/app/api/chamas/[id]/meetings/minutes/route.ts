import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { MeetingMinutesPDF } from "@/components/meeting-minutes-pdf";

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

  const url = new URL(request.url);
  const meetingId = url.searchParams.get("meetingId");

  if (!meetingId) {
    return NextResponse.json({ error: "meetingId is required" }, { status: 400 });
  }

  const { data: chama } = await supabase
    .from("chamas")
    .select("name")
    .eq("id", chamaId)
    .single();

  if (!chama) {
    return NextResponse.json({ error: "Chama not found" }, { status: 404 });
  }

  const { data: meeting } = await supabase
    .from("meetings")
    .select("id, date, agenda, venue, minutes_text")
    .eq("id", meetingId)
    .eq("chama_id", chamaId)
    .single();

  if (!meeting) {
    return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
  }

  const { data: members } = await supabase
    .from("chama_members")
    .select("id, full_name")
    .eq("chama_id", chamaId)
    .order("joined_at", { ascending: true });

  const { data: attendance } = await supabase
    .from("meeting_attendance")
    .select("member_id, present")
    .eq("meeting_id", meetingId);

  const attendanceSet = new Set(
    (attendance || []).filter((a) => a.present).map((a) => a.member_id)
  );

  const membersPresent = (members || []).map((m) => ({
    name: m.full_name,
    present: attendanceSet.has(m.id),
  }));

  // Get any votes/resolutions for this meeting (find votes near meeting date)
  const meetingDate = meeting.date as string;
  const { data: votes } = await supabase
    .from("votes")
    .select("id, resolution_text")
    .eq("chama_id", chamaId)
    .order("created_at", { ascending: false });

  const resolutions: { text: string; yes: number; no: number; abstain: number }[] = [];

  for (const vote of votes || []) {
    const { data: records } = await supabase
      .from("vote_records")
      .select("vote")
      .eq("vote_id", vote.id);

    const yes = (records || []).filter((r) => r.vote === "yes").length;
    const no = (records || []).filter((r) => r.vote === "no").length;
    const abstain = (records || []).filter((r) => r.vote === "abstain").length;

    resolutions.push({
      text: vote.resolution_text,
      yes,
      no,
      abstain,
    });
  }

  // Get next meeting date
  const { data: nextMeetings } = await supabase
    .from("meetings")
    .select("date")
    .eq("chama_id", chamaId)
    .gt("date", meetingDate)
    .order("date", { ascending: true })
    .limit(1);

  const nextMeetingDate = nextMeetings?.[0]?.date
    ? new Date(nextMeetings[0].date as string).toLocaleDateString("en-KE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : undefined;

  // Get chairperson name
  const { data: chairperson } = await supabase
    .from("chama_members")
    .select("full_name")
    .eq("chama_id", chamaId)
    .eq("role", "chairperson")
    .single();

  const meetingDateFormatted = new Date(meetingDate).toLocaleDateString("en-KE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const minutesData = {
    chamaName: chama.name,
    chairpersonName: chairperson?.full_name || "Chairperson",
    meetingDate: meetingDateFormatted,
    venue: (meeting.venue as string) || "",
    agenda: (meeting.agenda as string) || "No agenda set",
    minutesText: (meeting.minutes_text as string) || "",
    membersPresent,
    resolutions,
    nextMeetingDate,
  };

  try {
    const blob = await pdf(
      React.createElement(
        MeetingMinutesPDF as React.ComponentType<{ data: typeof minutesData }>,
        { data: minutesData }
      ) as Parameters<typeof pdf>[0]
    ).toBlob();

    return new Response(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="meeting-minutes-${meetingId}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
