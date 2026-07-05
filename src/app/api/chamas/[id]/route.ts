import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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
    return NextResponse.json(
      { error: "Only officers can edit the chama profile" },
      { status: 403 }
    );
  }

  const body = await request.json();
  const {
    name, objective, foundingDate, bankAccount, mpesaNumber,
    complianceType, registrationNumber, sasraLicenseNumber,
    sasraLicenseExpiry, auditorName, financialYearStart,
    financialYearEnd, coreCapital, fosaEnabled,
  } = body;

  if (name !== undefined && (!name || name.trim().length < 2)) {
    return NextResponse.json(
      { error: "Chama name must be at least 2 characters" },
      { status: 400 }
    );
  }

  if (objective !== undefined && objective.length > 500) {
    return NextResponse.json(
      { error: "Objective must be 500 characters or less" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {};
  if (name !== undefined) updates.name = name.trim();
  if (objective !== undefined) updates.objective = objective || null;
  if (foundingDate !== undefined) updates.founding_date = foundingDate || null;
  if (bankAccount !== undefined) updates.bank_account = bankAccount || null;
  if (mpesaNumber !== undefined) updates.mpesa_number = mpesaNumber || null;
  if (complianceType !== undefined) updates.compliance_type = complianceType;
  if (registrationNumber !== undefined) updates.registration_number = registrationNumber || null;
  if (sasraLicenseNumber !== undefined) updates.sasra_license_number = sasraLicenseNumber || null;
  if (sasraLicenseExpiry !== undefined) updates.sasra_license_expiry = sasraLicenseExpiry || null;
  if (auditorName !== undefined) updates.auditor_name = auditorName || null;
  if (financialYearStart !== undefined) updates.financial_year_start = financialYearStart || null;
  if (financialYearEnd !== undefined) updates.financial_year_end = financialYearEnd || null;
  if (coreCapital !== undefined) updates.core_capital = coreCapital || null;
  if (fosaEnabled !== undefined) updates.fosa_enabled = fosaEnabled;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data: updated, error } = await supabase
    .from("chamas")
    .update(updates)
    .eq("id", chamaId)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ chama: updated });
}
