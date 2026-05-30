import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import {
  sendContributionReminder,
  sendMeetingReminder,
  sendLoanApprovalEmail,
} from "@/lib/email";

async function getMemberEmail(userId: string): Promise<string | null> {
  try {
    const supabaseAdmin = createAdminClient();
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return data?.user?.email || null;
  } catch {
    return null;
  }
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
    return NextResponse.json({ error: "Only officers can send notifications" }, { status: 403 });
  }

  const body = await request.json();
  const { type, memberId, loanId, meetingId, monthLabel } = body;

  if (!type || !memberId) {
    return NextResponse.json({ error: "type and memberId are required" }, { status: 400 });
  }

  const { data: chama } = await supabase
    .from("chamas")
    .select("id, name, contribution_amount, meeting_day")
    .eq("id", chamaId)
    .single();

  if (!chama) {
    return NextResponse.json({ error: "Chama not found" }, { status: 404 });
  }

  const { data: member } = await supabase
    .from("chama_members")
    .select("id, user_id, full_name")
    .eq("id", memberId)
    .eq("chama_id", chamaId)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (!member.user_id) {
    return NextResponse.json({ error: "Member has no linked user account" }, { status: 400 });
  }

  const email = await getMemberEmail(member.user_id);
  if (!email) {
    return NextResponse.json({ error: "No email found for this member" }, { status: 400 });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const chamaLink = `${siteUrl}/dashboard/chamas/${chamaId}`;

  const result: { success?: boolean; error?: string; skipped?: boolean } = {};

  if (type === "contribution") {
    if (!monthLabel) {
      return NextResponse.json({ error: "monthLabel is required for contribution reminder" }, { status: 400 });
    }

    const res = await sendContributionReminder({
      to: email,
      memberName: member.full_name,
      chamaName: chama.name,
      amountKES: chama.contribution_amount,
      monthLabel,
      chamaLink,
    });

    if (res.error) {
      return NextResponse.json({ error: "Failed to send contribution reminder" }, { status: 500 });
    }

    result.success = true;
  } else if (type === "meeting") {
    let meetingDate: string;
    let venueVal: string | undefined;
    let agendaVal: string | undefined;

    if (meetingId) {
      const { data: meeting } = await supabase
        .from("meetings")
        .select("id, date, venue, agenda")
        .eq("id", meetingId)
        .eq("chama_id", chamaId)
        .single();

      if (!meeting) {
        return NextResponse.json({ error: "Meeting not found" }, { status: 404 });
      }

      meetingDate = new Date(meeting.date).toLocaleDateString("en-KE", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      venueVal = (meeting as Record<string, unknown>).venue as string | undefined;
      agendaVal = (meeting as Record<string, unknown>).agenda as string | undefined;
    } else {
      const dayName = chama.meeting_day || "meeting";
      meetingDate = `next ${dayName}`;
    }

    const res = await sendMeetingReminder({
      to: email,
      memberName: member.full_name,
      chamaName: chama.name,
      meetingDate,
      venue: venueVal,
      agenda: agendaVal,
      chamaLink: `${siteUrl}/dashboard/chamas/${chamaId}/meetings`,
    });

    if (res.error) {
      return NextResponse.json({ error: "Failed to send meeting reminder" }, { status: 500 });
    }

    result.success = true;
  } else if (type === "loan_approval") {
    if (!loanId) {
      return NextResponse.json({ error: "loanId is required for loan approval notification" }, { status: 400 });
    }

    const { data: loan } = await supabase
      .from("loans")
      .select("id, amount, interest_rate, due_date")
      .eq("id", loanId)
      .eq("chama_id", chamaId)
      .single();

    if (!loan) {
      return NextResponse.json({ error: "Loan not found" }, { status: 404 });
    }

    const dueDateStr = loan.due_date
      ? new Date(loan.due_date as string).toLocaleDateString("en-KE", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : undefined;

    const res = await sendLoanApprovalEmail({
      to: email,
      memberName: member.full_name,
      chamaName: chama.name,
      amountKES: Number(loan.amount),
      interestRate: Number(loan.interest_rate || 10),
      dueDate: dueDateStr,
      chamaLink: `${siteUrl}/dashboard/chamas/${chamaId}/loans`,
    });

    if (res.error) {
      return NextResponse.json({ error: "Failed to send loan approval email" }, { status: 500 });
    }

    result.success = true;
  } else {
    return NextResponse.json({ error: `Unknown notification type: ${type}` }, { status: 400 });
  }

  return NextResponse.json(result);
}
