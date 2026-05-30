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

  if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [chamaRes, membersRes, contribsRes, loansRes, repaymentsRes, meetingsRes, finesRes, expensesRes, investmentsRes] =
    await Promise.all([
      supabase.from("chamas").select("*").eq("id", chamaId).single(),
      supabase.from("chama_members").select("*").eq("chama_id", chamaId),
      supabase.from("contributions").select("*").eq("chama_id", chamaId),
      supabase.from("loans").select("*").eq("chama_id", chamaId),
      supabase.from("loan_repayments").select("*").eq("chama_id", chamaId),
      supabase.from("meetings").select("*").eq("chama_id", chamaId),
      supabase.from("fines").select("*").eq("chama_id", chamaId),
      supabase.from("expenses").select("*").eq("chama_id", chamaId),
      supabase.from("investments").select("*").eq("chama_id", chamaId),
    ]);

  const exportData = {
    exportedAt: new Date().toISOString(),
    chama: chamaRes.data,
    members: membersRes.data,
    contributions: contribsRes.data,
    loans: loansRes.data,
    loanRepayments: repaymentsRes.data,
    meetings: meetingsRes.data,
    fines: finesRes.data,
    expenses: expensesRes.data,
    investments: investmentsRes.data,
  };

  return NextResponse.json(exportData, {
    headers: {
      "Content-Disposition": `attachment; filename="chamavault-export-${chamaId}.json"`,
    },
  });
}
