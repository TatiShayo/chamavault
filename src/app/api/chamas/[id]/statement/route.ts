import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { MemberStatementPDF } from "@/components/member-statement-pdf";

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
    .select("role, id")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const url = new URL(request.url);
  const memberId = url.searchParams.get("memberId");
  const period = url.searchParams.get("period") || "Last 12 months";

  // If specific member requested, only officers can view
  let targetMemberId = membership.id;
  if (memberId) {
    const isOfficer = ["chairperson", "treasurer", "secretary"].includes(membership.role);
    if (!isOfficer) {
      return NextResponse.json({ error: "Only officers can generate statements for other members" }, { status: 403 });
    }
    targetMemberId = memberId;
  }

  // Get chama info
  const { data: chama } = await supabase
    .from("chamas")
    .select("name, contribution_amount")
    .eq("id", chamaId)
    .single();

  if (!chama) {
    return NextResponse.json({ error: "Chama not found" }, { status: 404 });
  }

  // Get member info
  const { data: member } = await supabase
    .from("chama_members")
    .select("id, full_name, user_id")
    .eq("id", targetMemberId)
    .eq("chama_id", chamaId)
    .single();

  if (!member) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  // Get contributions
  const { data: contributions } = await supabase
    .from("contributions")
    .select("month_year, amount_due, amount_paid, paid_at")
    .eq("chama_id", chamaId)
    .eq("member_id", targetMemberId)
    .order("month_year", { ascending: false })
    .limit(24);

  const now = new Date();
  const contributionRows = (contributions || []).map((c: Record<string, unknown>) => {
    const monthYear = c.month_year as string;
    const [y, m] = monthYear.split("-").map(Number);
    const monthDate = new Date(y, m - 1, 1);
    const monthName = monthDate.toLocaleDateString("en-KE", { month: "long", year: "numeric" });
    const amountDue = Number(c.amount_due);
    const amountPaid = Number(c.amount_paid);

    let status: "paid" | "overdue" | "pending" = "pending";
    if (c.paid_at) {
      status = "paid";
    } else if (monthDate < now && amountDue > 0) {
      status = "overdue";
    }

    return {
      monthYear: monthName,
      amountDue,
      amountPaid,
      paidAt: c.paid_at as string | null,
      status,
    };
  });

  const totalPaid = contributionRows.reduce((sum, c) => sum + c.amountPaid, 0);
  const totalDue = contributionRows.reduce((sum, c) => sum + c.amountDue, 0);

  // Get loans
  const { data: loans } = await supabase
    .from("loans")
    .select("id, amount, interest_rate, status")
    .eq("chama_id", chamaId)
    .eq("member_id", targetMemberId)
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
    const totalDueLoan = amount + interest;
    const repaid = repaymentMap[loanId] || 0;
    return {
      amount,
      interestRate: rate,
      status: l.status as string,
      outstanding: Math.max(0, totalDueLoan - repaid),
    };
  });

  const totalLoanOutstanding = loanRows.reduce((sum, l) => sum + l.outstanding, 0);

  // Get fines
  const { data: fines } = await supabase
    .from("fines")
    .select("reason, amount, paid")
    .eq("chama_id", chamaId)
    .eq("member_id", targetMemberId)
    .order("issued_at", { ascending: false });

  const fineRows = (fines || []).map((f: Record<string, unknown>) => ({
    reason: f.reason as string,
    amount: Number(f.amount),
    paid: f.paid as boolean,
  }));

  const totalUnpaidFines = fineRows
    .filter((f) => !f.paid)
    .reduce((sum, f) => sum + f.amount, 0);

  const statementData = {
    memberName: member.full_name,
    chamaName: chama.name,
    period,
    contributionAmount: chama.contribution_amount,
    contributions: contributionRows,
    totalPaid,
    totalDue,
    loans: loanRows,
    totalLoanOutstanding,
    fines: fineRows,
    totalUnpaidFines,
  };

  try {
    // @ts-expect-error - MemberStatementPDF uses custom props internally
    const blob = await pdf(React.createElement(MemberStatementPDF, { data: statementData })).toBlob();

    return new Response(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="statement-${member.full_name.replace(/\s+/g, "-").toLowerCase()}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
