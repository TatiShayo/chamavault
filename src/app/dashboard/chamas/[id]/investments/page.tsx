import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { InvestmentTracker } from "./investment-tracker";

export default async function InvestmentsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const { data: chama } = await supabase
    .from("chamas")
    .select("name")
    .eq("id", chamaId)
    .single();

  if (!chama) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Chama not found.</p>
      </div>
    );
  }

  const { data: membership } = await supabase
    .from("chama_members")
    .select("role")
    .eq("chama_id", chamaId)
    .eq("user_id", user.id)
    .single();

  if (!membership) redirect("/dashboard");

  const { data: investments } = await supabase
    .from("investments")
    .select("*")
    .eq("chama_id", chamaId)
    .order("created_at", { ascending: false });

  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);

  const isOfficer = ["chairperson", "treasurer", "secretary"].includes(membership.role);

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

  return (
    <main className="mx-auto max-w-4xl px-3 sm:px-4 py-6 sm:py-8">
        <Link
          href={`/dashboard/chamas/${chamaId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Chama
        </Link>

        <h2 className="mb-6 text-2xl font-bold">
          Investments — {chama.name}
        </h2>

        <InvestmentTracker
          chamaId={chamaId}
          investments={rows}
          isOfficer={isOfficer}
          formatKES={formatKES}
        />
    </main>
  );
}
