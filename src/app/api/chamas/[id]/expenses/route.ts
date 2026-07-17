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

  const { data: expenses, error } = await supabase
    .from("expenses")
    .select("id, description, amount, category, expense_date, receipt_url, recorded_by, created_at, chama_members!expenses_recorded_by_fkey(full_name)")
    .eq("chama_id", chamaId)
    .order("expense_date", { ascending: false });

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  const rows = (expenses || []).map((e: Record<string, unknown>) => {
    const recordedBy = Array.isArray(e.chama_members)
      ? (e.chama_members[0] as { full_name?: string })?.full_name
      : (e.chama_members as { full_name?: string })?.full_name;
    return {
      id: e.id,
      description: e.description,
      amount: e.amount,
      category: e.category,
      expenseDate: e.expense_date,
      receiptUrl: e.receipt_url,
      recordedBy: recordedBy || null,
      createdAt: e.created_at,
    };
  });

  const thisMonth = new Date().getMonth();
  const thisYear = new Date().getFullYear();
  const monthTotal = rows
    .filter((r) => {
      const d = new Date(r.expenseDate as string);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    })
    .reduce((sum, r) => sum + Number(r.amount), 0);

  return NextResponse.json({ expenses: rows, monthTotal });
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
    return NextResponse.json({ error: "Only officers can manage expenses" }, { status: 403 });
  }

  const formData = await request.formData();
  const description = formData.get("description") as string;
  const amount = formData.get("amount") as string;
  const category = formData.get("category") as string;
  const expenseDate = formData.get("expenseDate") as string;
  const receiptFile = formData.get("receipt") as File | null;

  if (!description || !amount || !category || !expenseDate) {
    return NextResponse.json({ error: "All fields are required" }, { status: 400 });
  }

  let receiptUrl: string | null = null;

  if (receiptFile && receiptFile.size > 0) {
    const fileExt = receiptFile.name.split(".").pop();
    const fileName = `${chamaId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { data: upload, error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(fileName, receiptFile, {
        contentType: receiptFile.type,
        upsert: false,
      });

    if (!uploadError && upload) {
      const { data: urlData } = supabase.storage
        .from("receipts")
        .getPublicUrl(fileName);
      receiptUrl = urlData.publicUrl;
    }
  }

  const { data: expense, error } = await supabase
    .from("expenses")
    .insert({
      chama_id: chamaId,
      description,
      amount: Number(amount),
      category,
      expense_date: expenseDate,
      receipt_url: receiptUrl,
      recorded_by: user.id,
    })
    .select("id, description, amount, category, expense_date, receipt_url, recorded_by, created_at")
    .single();

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({
    expense: {
      id: expense.id,
      description: expense.description,
      amount: expense.amount,
      category: expense.category,
      expenseDate: expense.expense_date,
      receiptUrl: expense.receipt_url,
      recordedBy: null,
      createdAt: expense.created_at,
    },
  });
}

export async function DELETE(
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
    return NextResponse.json({ error: "Only officers can manage expenses" }, { status: 403 });
  }

  const { expenseId } = await request.json();

  if (!expenseId) {
    return NextResponse.json({ error: "expenseId is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("expenses")
    .delete()
    .eq("id", expenseId)
    .eq("chama_id", chamaId);

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({ success: true });
}
