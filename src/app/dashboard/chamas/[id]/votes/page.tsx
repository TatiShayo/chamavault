import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { VotingSystem } from "./voting-system";

export default async function VotesPage({
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
      <main className="mx-auto max-w-4xl px-4 py-8">
        <Link
          href={`/dashboard/chamas/${chamaId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Chama
        </Link>

        <h2 className="mb-6 text-2xl font-bold">
          Voting — {chama.name}
        </h2>

        <VotingSystem chamaId={chamaId} isOfficer={isOfficer} />
      </main>
    </div>
  );
}
