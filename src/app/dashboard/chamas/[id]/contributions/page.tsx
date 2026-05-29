import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { ContributionTracker } from "./tracker";

export default async function ContributionsPage({
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

  // Get all members
  const { data: members } = await supabase
    .from("chama_members")
    .select("id, full_name")
    .eq("chama_id", chamaId)
    .order("joined_at", { ascending: true });

  // Get all contributions
  const { data: contributions } = await supabase
    .from("contributions")
    .select("id, member_id, month_year, amount_due, amount_paid, paid_at, payment_method")
    .eq("chama_id", chamaId)
    .order("month_year", { ascending: true });

  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);

  const isOfficer = ["chairperson", "treasurer", "secretary"].includes(membership.role);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b bg-white dark:bg-zinc-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold">ChamaVault</h1>
          <form action="/auth/logout" method="post">
            <Button variant="outline" size="sm" type="submit">
              Sign Out
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Link
          href={`/dashboard/chamas/${chamaId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Chama
        </Link>

        <h2 className="mb-6 text-2xl font-bold">
          Contributions — {chama.name}
        </h2>

        <ContributionTracker
          chamaId={chamaId}
          members={members || []}
          contributions={contributions || []}
          contributionAmount={chama.contribution_amount}
          isOfficer={isOfficer}
          formatKES={formatKES}
        />
      </main>
    </div>
  );
}
