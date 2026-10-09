import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { sendLoanApprovalEmail } from "@/lib/email";
import { z } from "zod";
import { fromCents, loanBalance } from "@/lib/money";

/**
 * Loan creation payload.
 *
 * `amount` is accepted as a positive finite number — the previous
 * implementation did `Number(amount)`, which turned `null` into 0, `"abc"` into
 * NaN (bypassing the `<= 0` guard because `NaN <= 0` is false), and accepted
 * `1e308`.
 */
const loanCreateSchema = z.object({
  memberId: z.string().uuid(),
  amount: z.number().positive().finite().max(9_999_999_999_999),
  interestRate: z.number().min(0).max(100).default(10),
  dueDate: z.string().date().nullish(),
  purpose: z.string().trim().max(1000).nullish(),
});

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

  const { data: loans, error } = await supabase
    .from("loans")
    .select("id, member_id, amount, interest_rate, disbursed_at, due_date, status, approved_by, created_at, chama_members!inner(full_name)")
    .eq("chama_id", chamaId)
    .order("created_at", { ascending: false });

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  const { data: repayments } = await supabase
    .from("loan_repayments")
    .select("loan_id, amount, paid_at")
    .in("loan_id", (loans || []).map((l) => l.id));

  const repaymentMap: Record<string, { total: number; count: number }> = {};
  for (const r of repayments || []) {
    const loanId = r.loan_id as string;
    if (!repaymentMap[loanId]) repaymentMap[loanId] = { total: 0, count: 0 };
    repaymentMap[loanId].total += Number(r.amount);
    repaymentMap[loanId].count += 1;
  }

  const rows = (loans || []).map((l: Record<string, unknown>) => {
    const cm = l.chama_members as { full_name: string } | { full_name: string }[];
    const fullName = Array.isArray(cm) ? cm[0]?.full_name : cm?.full_name;
    const loanId = l.id as string;
    const repaid = repaymentMap[loanId]?.total || 0;
    const amount = Number(l.amount);
    const rate = Number(l.interest_rate || 0);
    const interest = amount * (rate / 100);
    const totalDue = amount + interest;

    return {
      id: l.id,
      memberId: l.member_id,
      fullName,
      amount,
      interestRate: rate,
      disbursedAt: l.disbursed_at,
      dueDate: l.due_date,
      status: l.status,
      approvedBy: l.approved_by,
      createdAt: l.created_at,
      totalRepaid: repaid,
      totalRepayments: repaymentMap[loanId]?.count || 0,
      outstanding: Math.max(0, totalDue - repaid),
      totalDue,
    };
  });

  return NextResponse.json({ loans: rows });
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
    .select("role, id")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Not a member" }, { status: 403 });
  }

  const body = await request.json();

  // Validate the payload. Previously every field arrived unvalidated, so
  // `Number("abc")` produced NaN, `Number(null)` produced 0 (which slipped past
  // a `<= 0` check only by accident), and a negative interest_rate was stored.
  const parsed = loanCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid loan request", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const { memberId, amount, interestRate, dueDate, purpose } = parsed.data;

  // The target member MUST belong to this chama. The previous code only checked
  // that the *caller* was a member, then used the body's `memberId` verbatim —
  // so an officer of chama A could borrow chama B's contribution history to
  // justify a loan issued from chama A.
  const { data: targetMember } = await supabase
    .from("chama_members")
    .select("id")
    .eq("id", memberId)
    .eq("chama_id", chamaId)
    .maybeSingle();

  if (!targetMember) {
    return NextResponse.json(
      { error: "Member not found in this chama" },
      { status: 404 }
    );
  }

  const loanAmount = amount;

  // Eligibility is computed from contributions INSIDE this chama only.
  const { data: memberContribs } = await supabase
    .from("contributions")
    .select("amount_paid")
    .eq("member_id", memberId)
    .eq("chama_id", chamaId);

  const totalContributions = (memberContribs || []).reduce(
    (sum, c) => sum + Number(c.amount_paid),
    0
  );

  if (loanAmount > totalContributions * 3) {
    return NextResponse.json(
      { error: `Loan amount cannot exceed 3× total contributions (${totalContributions * 3})` },
      { status: 400 }
    );
  }

  const { data: loan, error } = await supabase
    .from("loans")
    .insert({
      chama_id: chamaId,
      member_id: memberId,
      amount: loanAmount,
      interest_rate: interestRate,
      due_date: dueDate || null,
      // Officers may never self-approve. Creating a loan and disbursing it in
      // the same request bypasses the M-of-N approval path entirely, so every
      // loan now starts `pending` and must go through the PATCH approve route.
      status: "pending",
      approved_by: null,
      disbursed_at: null,
    })
    .select("id, member_id, amount, interest_rate, disbursed_at, due_date, status, approved_by, created_at")
    .single();

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({
    loan: {
      id: loan.id,
      memberId: loan.member_id,
      amount: Number(loan.amount),
      interestRate: Number(loan.interest_rate || 0),
      disbursedAt: loan.disbursed_at,
      dueDate: loan.due_date,
      status: loan.status,
      approvedBy: loan.approved_by,
      createdAt: loan.created_at,
      totalRepaid: 0,
      totalRepayments: 0,
      // Integer-cents arithmetic. The previous expression
      // `Number(amount) * (1 + rate/100)` accumulates IEEE-754 error before
      // any rounding; `loanBalance()` converts to cents once and rounds once.
      outstanding: fromCents(loanBalance(loan.amount, loan.interest_rate).outstandingCents),
      totalDue: fromCents(loanBalance(loan.amount, loan.interest_rate).totalDueCents),
    },
  });
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
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership || !["chairperson", "treasurer", "secretary"].includes(membership.role)) {
    return NextResponse.json({ error: "Only officers can manage loans" }, { status: 403 });
  }

  const body = await request.json();
  const { loanId, action, repaymentAmount } = body;

  if (!loanId) {
    return NextResponse.json({ error: "loanId is required" }, { status: 400 });
  }

  const { data: loan } = await supabase
    .from("loans")
    .select("id, status, chama_id")
    .eq("id", loanId)
    .eq("chama_id", chamaId)
    .single();

  if (!loan) {
    return NextResponse.json({ error: "Loan not found" }, { status: 404 });
  }

  if (action === "repay") {
    if (!repaymentAmount || Number(repaymentAmount) <= 0) {
      return NextResponse.json({ error: "Valid repaymentAmount is required" }, { status: 400 });
    }

    const { error: repayError } = await supabase
      .from("loan_repayments")
      .insert({
        loan_id: loanId,
        amount: Number(repaymentAmount),
      });

    if (repayError) {
      { console.error("[api] server error:", repayError); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
    }

    return NextResponse.json({ success: true });
  }

  if (action === "approve" || action === "reject") {
    const newStatus = action === "approve" ? "approved" : "rejected";
    const updates: Record<string, unknown> = {
      status: newStatus,
      approved_by: user.id,
    };
    if (action === "approve") {
      updates.disbursed_at = new Date().toISOString();
    }

    // Race-safe: only a still-pending loan may be approved/rejected. The
    // status guard makes the decision atomic — two officers acting at once
    // cannot both "win"; the second sees an empty result. Prevents an already
    // approved (disbursed) loan being re-approved / double-disbursed.
    const { data: changed, error: updateError } = await supabase
      .from("loans")
      .update(updates)
      .eq("id", loanId)
      .eq("chama_id", chamaId)
      .eq("status", "pending")
      .select("id");

    if (updateError) {
      return NextResponse.json({ error: "Failed to update loan" }, { status: 500 });
    }

    if (!changed || changed.length === 0) {
      return NextResponse.json(
        { error: "Loan is no longer pending — it may have already been decided" },
        { status: 409 }
      );
    }

    // Send email notification on approval
    if (action === "approve") {
      try {
        const supabaseAdmin = createAdminClient();
        const { data: loanRecord } = await supabaseAdmin
          .from("loans")
          .select("member_id, amount, interest_rate, due_date")
          .eq("id", loanId)
          .single();

        if (loanRecord) {
          const { data: memberRecord } = await supabaseAdmin
            .from("chama_members")
            .select("user_id, full_name")
            .eq("id", loanRecord.member_id)
            .single();

          if (memberRecord?.user_id) {
            const { data: userData } = await supabaseAdmin.auth.admin.getUserById(memberRecord.user_id);
            const email = userData?.user?.email;
            if (email) {
              const { data: chamaRecord } = await supabaseAdmin
                .from("chamas")
                .select("name")
                .eq("id", chamaId)
                .single();

              const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
              const dueDateStr = loanRecord.due_date
                ? new Date(loanRecord.due_date as string).toLocaleDateString("en-KE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : undefined;

              sendLoanApprovalEmail({
                to: email,
                memberName: memberRecord.full_name,
                chamaName: chamaRecord?.name || "Chama",
                amountKES: Number(loanRecord.amount),
                interestRate: Number(loanRecord.interest_rate || 10),
                dueDate: dueDateStr,
                chamaLink: `${siteUrl}/dashboard/chamas/${chamaId}/loans`,
              }).catch((e) => console.error("Loan approval email failed:", e));
            }
          }
        }
      } catch (e) {
        console.error("Loan approval email error:", e);
      }
    }

    return NextResponse.json({ success: true, status: newStatus });
  }

  if (action === "markRepaid") {
    const { error: updateError } = await supabase
      .from("loans")
      .update({ status: "repaid" })
      .eq("id", loanId)
      .eq("chama_id", chamaId);

    if (updateError) {
      { console.error("[api] server error:", updateError); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
