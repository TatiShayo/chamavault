import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getMemberEquity, getArrears } from "@/lib/treasury";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const url = new URL(request.url);
  const phone = url.searchParams.get("phone");

  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  // Find member by chama and phone
  const { data: member } = await supabase
    .from("chama_members")
    .select("id, full_name, role, phone")
    .eq("chama_id", chamaId)
    .eq("phone", phone)
    .maybeSingle();

  if (!member) {
    return NextResponse.json({ error: "No member found with that phone number" }, { status: 404 });
  }

  // Get chama info
  const { data: chama } = await supabase
    .from("chamas")
    .select("name, contribution_amount, meeting_day, meeting_frequency")
    .eq("id", chamaId)
    .single();

  // Get contributions
  const { data: contributions } = await supabase
    .from("contributions")
    .select("month_year, amount_due, amount_paid, paid_at")
    .eq("chama_id", chamaId)
    .eq("member_id", member.id)
    .order("month_year", { ascending: false })
    .limit(12);

  const contributionRows = (contributions || []).map((c: Record<string, unknown>) => {
    const monthYear = c.month_year as string;
    const [y, m] = monthYear.split("-").map(Number);
    const monthName = new Date(y, m - 1, 1).toLocaleDateString("en-KE", { month: "long", year: "numeric" });
    const amountDue = Number(c.amount_due);
    const amountPaid = Number(c.amount_paid);

    let status: "paid" | "overdue" | "pending" = "pending";
    const now = new Date();
    const monthDate = new Date(y, m - 1, 1);
    if (c.paid_at) {
      status = "paid";
    } else if (monthDate < now && amountDue > 0) {
      status = "overdue";
    }

    return { monthYear: monthName, amountDue, amountPaid, status, paidAt: c.paid_at };
  });

  // Get loans
  const { data: loans } = await supabase
    .from("loans")
    .select("id, amount, interest_rate, status, disbursed_at, due_date")
    .eq("chama_id", chamaId)
    .eq("member_id", member.id)
    .order("created_at", { ascending: false });

  const { data: loanRepayments } = await supabase
    .from("loan_repayments")
    .select("loan_id, amount")
    .in("loan_id", (loans || []).map((l) => l.id));

  const repaymentMap: Record<string, number> = {};
  for (const r of loanRepayments || []) {
    repaymentMap[r.loan_id as string] = (repaymentMap[r.loan_id as string] || 0) + Number(r.amount);
  }

  const loanRows = (loans || []).map((l: Record<string, unknown>) => {
    const loanId = l.id as string;
    const amount = Number(l.amount);
    const rate = Number(l.interest_rate || 0);
    const interest = amount * (rate / 100);
    const totalDue = amount + interest;
    const repaid = repaymentMap[loanId] || 0;
    const monthlyPayment = totalDue / Math.max(1, 12);
    return {
      id: loanId,
      amount,
      interestRate: rate,
      status: l.status,
      outstanding: Math.max(0, totalDue - repaid),
      monthlyPayment: Math.round(monthlyPayment),
      dueDate: l.due_date,
      disbursedAt: l.disbursed_at,
    };
  });

  // Get upcoming meetings
  const { data: meetings } = await supabase
    .from("meetings")
    .select("id, date, venue, agenda")
    .eq("chama_id", chamaId)
    .gte("date", new Date().toISOString().slice(0, 10))
    .order("date", { ascending: true })
    .limit(3);

  const meetingRows = (meetings || []).map((m: Record<string, unknown>) => ({
    id: m.id,
    date: m.date,
    venue: m.venue,
    agenda: m.agenda,
  }));

  // Get fines
  const { data: fines } = await supabase
    .from("fines")
    .select("reason, amount, paid, issued_at")
    .eq("chama_id", chamaId)
    .eq("member_id", member.id)
    .order("issued_at", { ascending: false });

  const fineRows = (fines || []).map((f: Record<string, unknown>) => ({
    reason: f.reason,
    amount: Number(f.amount),
    paid: f.paid,
    issuedAt: f.issued_at,
  }));

  const totalUnpaidFines = fineRows.filter((f) => !f.paid).reduce((s, f) => s + f.amount, 0);

  // Equity
  const equity = await getMemberEquity(chamaId, member.id);
  const arrears = await getArrears(chamaId, member.id);

  const totalPaid = contributionRows.reduce((s, c) => s + c.amountPaid, 0);
  const totalDue = contributionRows.reduce((s, c) => s + c.amountDue, 0);

  return NextResponse.json({
    member: {
      id: member.id,
      name: member.full_name,
      role: member.role,
    },
    chama: {
      name: chama?.name || "",
      contributionAmount: chama?.contribution_amount || 0,
      meetingDay: chama?.meeting_day || "",
      meetingFrequency: chama?.meeting_frequency || "",
    },
    contributions: contributionRows,
    totalPaid,
    totalDue,
    loans: loanRows,
    meetings: meetingRows,
    fines: fineRows,
    equity,
    arrears,
    totalUnpaidFines,
  });
}
