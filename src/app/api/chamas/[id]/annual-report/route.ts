import { createClient } from "@/lib/supabase/server";
import { getTreasuryBalance, getTotalWorth } from "@/lib/treasury";
import { NextResponse } from "next/server";
import React from "react";
import { pdf } from "@react-pdf/renderer";
import { AnnualReportPDF } from "@/components/annual-report-pdf";

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
  const yearStr = url.searchParams.get("year") || String(new Date().getFullYear());
  const year = Number(yearStr);
  const startDate = `${year}-01-01`;
  const endDate = `${year}-12-31`;

  const { data: chama } = await supabase
    .from("chamas")
    .select("name")
    .eq("id", chamaId)
    .single();

  if (!chama) {
    return NextResponse.json({ error: "Chama not found" }, { status: 404 });
  }

  // Treasury summary (whole-chama, not date-filtered since it's a running balance)
  const treasury = await getTreasuryBalance(chamaId);

  // Members with their contribution compliance
  const { data: members } = await supabase
    .from("chama_members")
    .select("id, full_name")
    .eq("chama_id", chamaId)
    .order("joined_at", { ascending: true });

  const memberRows = [];
  for (const m of members || []) {
    const { data: contribs } = await supabase
      .from("contributions")
      .select("amount_due, amount_paid")
      .eq("chama_id", chamaId)
      .eq("member_id", m.id)
      .gte("month_year", startDate)
      .lte("month_year", endDate);

    const totalPaid = (contribs || []).reduce((s, c) => s + Number(c.amount_paid), 0);
    const totalDue = (contribs || []).reduce((s, c) => s + Number(c.amount_due), 0);
    const compliance = totalDue > 0 ? (totalPaid / totalDue) * 100 : 100;

    memberRows.push({
      name: m.full_name,
      totalPaid,
      totalDue,
      compliance: Math.round(compliance * 10) / 10,
    });
  }

  // Loans
  const { data: loans } = await supabase
    .from("loans")
    .select("id, member_id, amount, interest_rate, status, chama_members!inner(full_name)")
    .eq("chama_id", chamaId);

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
    const memberInfo = l.chama_members as { full_name: string } | Array<{ full_name: string }>;
    const fullName = Array.isArray(memberInfo) ? memberInfo[0]?.full_name : memberInfo?.full_name;
    return {
      member: fullName || "Unknown",
      amount,
      interestRate: rate,
      outstanding: Math.max(0, totalDueLoan - repaid),
    };
  });

  // Expenses
  const { data: expenses } = await supabase
    .from("expenses")
    .select("description, amount, category")
    .eq("chama_id", chamaId)
    .gte("expense_date", startDate)
    .lte("expense_date", endDate)
    .order("expense_date", { ascending: false });

  const expenseRows = (expenses || []).map((e) => ({
    description: e.description as string,
    amount: Number(e.amount),
    category: e.category as string,
  }));

  // Investments
  const { data: investments } = await supabase
    .from("investments")
    .select("name, cost, current_value")
    .eq("chama_id", chamaId)
    .order("acquired_date", { ascending: false });

  const investmentRows = (investments || []).map((inv) => {
    const cost = Number(inv.cost);
    const currentValue = Number(inv.current_value || 0);
    return {
      name: inv.name as string,
      cost,
      currentValue,
      gain: currentValue - cost,
    };
  });

  const totalWorth = await getTotalWorth(chamaId);

  const reportData = {
    chamaName: chama.name,
    year,
    treasury,
    members: memberRows,
    loans: loanRows,
    expenses: expenseRows,
    totalWorth,
    investments: investmentRows,
  };

  try {
    const blob = await pdf(
      React.createElement(
        AnnualReportPDF as React.ComponentType<{ data: typeof reportData }>,
        { data: reportData }
      ) as Parameters<typeof pdf>[0]
    ).toBlob();

    return new Response(blob, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="annual-report-${chama.name.replace(/\s+/g, "-").toLowerCase()}-${year}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
