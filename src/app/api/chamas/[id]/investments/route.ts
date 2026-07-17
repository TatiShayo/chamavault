import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
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

  const { data: investments, error } = await supabase
    .from("investments")
    .select("*")
    .eq("chama_id", chamaId)
    .order("created_at", { ascending: false });

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  const rows = (investments || []).map((inv) => ({
    id: inv.id,
    name: inv.name,
    investmentType: inv.investment_type,
    description: inv.description,
    purchaseDate: inv.purchase_date,
    cost: Number(inv.cost),
    currentValue: Number(inv.current_value),
    notes: inv.notes,
    createdAt: inv.created_at,
  }));

  const totalCost = rows.reduce((sum, r) => sum + r.cost, 0);
  const totalCurrentValue = rows.reduce((sum, r) => sum + r.currentValue, 0);

  return NextResponse.json({ investments: rows, totalCost, totalCurrentValue });
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
    return NextResponse.json(
      { error: "Only officers can manage investments" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { name, investmentType, description, purchaseDate, cost, currentValue, notes } = body;

  if (!name || !investmentType) {
    return NextResponse.json(
      { error: "Name and investment type are required" },
      { status: 400 }
    );
  }

  if (!["property", "stock", "business"].includes(investmentType)) {
    return NextResponse.json(
      { error: "Investment type must be property, stock, or business" },
      { status: 400 }
    );
  }

  const { data: investment, error } = await supabase
    .from("investments")
    .insert({
      chama_id: chamaId,
      name,
      investment_type: investmentType,
      description: description || null,
      purchase_date: purchaseDate || null,
      cost: cost || 0,
      current_value: currentValue || 0,
      notes: notes || null,
      created_by: user.id,
    })
    .select("*")
    .single();

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({
    investment: {
      id: investment.id,
      name: investment.name,
      investmentType: investment.investment_type,
      description: investment.description,
      purchaseDate: investment.purchase_date,
      cost: Number(investment.cost),
      currentValue: Number(investment.current_value),
      notes: investment.notes,
      createdAt: investment.created_at,
    },
  });
}

export async function PUT(
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
    return NextResponse.json(
      { error: "Only officers can manage investments" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const { id: investmentId, name, investmentType, description, purchaseDate, cost, currentValue, notes } = body;

  if (!investmentId) {
    return NextResponse.json({ error: "Investment ID is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name;
  if (investmentType !== undefined) updates.investment_type = investmentType;
  if (description !== undefined) updates.description = description || null;
  if (purchaseDate !== undefined) updates.purchase_date = purchaseDate || null;
  if (cost !== undefined) updates.cost = cost;
  if (currentValue !== undefined) updates.current_value = currentValue;
  if (notes !== undefined) updates.notes = notes || null;
  updates.updated_at = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("investments")
    .update(updates)
    .eq("id", investmentId)
    .eq("chama_id", chamaId)
    .select("*")
    .single();

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({
    investment: {
      id: updated.id,
      name: updated.name,
      investmentType: updated.investment_type,
      description: updated.description,
      purchaseDate: updated.purchase_date,
      cost: Number(updated.cost),
      currentValue: Number(updated.current_value),
      notes: updated.notes,
      createdAt: updated.created_at,
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
    return NextResponse.json(
      { error: "Only officers can manage investments" },
      { status: 403 }
    );
  }

  const { investmentId } = await request.json();

  if (!investmentId) {
    return NextResponse.json({ error: "Investment ID is required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("investments")
    .delete()
    .eq("id", investmentId)
    .eq("chama_id", chamaId);

  if (error) {
    { console.error("[api] server error:", error); return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 }); }
  }

  return NextResponse.json({ success: true });
}
