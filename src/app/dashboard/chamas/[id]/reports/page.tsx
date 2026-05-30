import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { DividendCalculator } from "./dividend-calculator";
import { MonthlyStatement } from "./monthly-statement";

export default async function ReportsPage({
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
    .select("*")
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

  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);

  const isOfficer = ["chairperson", "treasurer", "secretary"].includes(membership.role);

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
          Reports — {chama.name}
        </h2>

        <h3 className="mb-4 text-lg font-semibold">Monthly Statement</h3>

        <MonthlyStatement
          chamaId={chamaId}
          members={(
            await supabase
              .from("chama_members")
              .select("id, full_name")
              .eq("chama_id", chamaId)
              .order("joined_at", { ascending: true })
          ).data || []}
          isOfficer={isOfficer}
        />

        <div className="my-8 border-t" />

        <h3 className="mb-4 text-lg font-semibold">Dividend Calculator</h3>

        <DividendCalculator
          chamaId={chamaId}
          isOfficer={isOfficer}
          formatKES={formatKES}
        />
    </main>
  );
}
