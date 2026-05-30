import { createClient } from "@/lib/supabase/server";
import { getTreasuryBalance } from "@/lib/treasury";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Calendar, Landmark, Users, UserPlus, Pencil, Banknote, Smartphone, List } from "lucide-react";
import { MemberList } from "./member-list";

export default async function ChamaDetailPage({
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

  if (!membership) {
    redirect("/dashboard");
  }

  const { data: members } = await supabase
    .from("chama_members")
    .select("id, user_id, full_name, role, joined_at")
    .eq("chama_id", chamaId)
    .order("joined_at", { ascending: true });

  const treasury = await getTreasuryBalance(chamaId);

  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);

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
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{chama.name}</CardTitle>
                <CardDescription>
                  Founded{" "}
                  {new Date(chama.founding_date).toLocaleDateString("en-KE", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </CardDescription>
              </div>
              {["chairperson", "treasurer", "secretary"].includes(
                membership.role
              ) && (
                <Link
                  href={`/dashboard/chamas/${chamaId}/edit`}
                  className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
                >
                  <Pencil className="size-4" />
                  Edit
                </Link>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="size-4" />
                <span className="capitalize">
                  {chama.meeting_day}s • {chama.meeting_frequency}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Landmark className="size-4" />
                <span>
                  {formatKES(chama.contribution_amount)} /{" "}
                  {chama.meeting_frequency === "weekly"
                    ? "week"
                    : chama.meeting_frequency === "biweekly"
                      ? "2 weeks"
                      : "month"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="size-4" />
                <span>{members?.length || 0} members</span>
              </div>
            </div>
            {chama.objective && (
              <p className="mt-4 text-sm text-muted-foreground italic">
                &ldquo;{chama.objective}&rdquo;
              </p>
            )}
            {(chama.bank_account || chama.mpesa_number) && (
              <div className="mt-4 border-t pt-4 grid gap-2 sm:grid-cols-2">
                {chama.bank_account && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Banknote className="size-4" />
                    <span>{chama.bank_account}</span>
                  </div>
                )}
                {chama.mpesa_number && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Smartphone className="size-4" />
                    <span>{chama.mpesa_number}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-white/80">Treasury Balance</p>
              <p className="text-3xl font-bold tracking-tight">
                {formatKES(treasury.balance)}
              </p>
            </div>
            <Landmark className="size-10 opacity-30" />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-white/70">Contributions</p>
              <p className="font-semibold">{formatKES(treasury.totalContributions)}</p>
            </div>
            <div>
              <p className="text-white/70">Expenses</p>
              <p className="font-semibold">{formatKES(treasury.totalExpenses)}</p>
            </div>
            <div>
              <p className="text-white/70">Active Loans</p>
              <p className="font-semibold">{formatKES(treasury.activeLoans)}</p>
            </div>
            <div>
              <p className="text-white/70">Repaid</p>
              <p className="font-semibold">{formatKES(treasury.totalRepaid)}</p>
            </div>
          </div>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Members</h2>
          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/chamas/${chamaId}/contributions`}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <List className="size-4" />
              Contributions
            </Link>
            {["chairperson", "treasurer", "secretary"].includes(membership.role) && (
              <Link
                href={`/dashboard/chamas/${chamaId}/invite`}
                className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 px-2.5 hover:bg-primary/80 transition-all"
              >
                <UserPlus className="size-4" />
                Invite
              </Link>
            )}
          </div>
        </div>

        <MemberList
          chamaId={chamaId}
          members={(members || []).map((m) => ({
            ...m,
            joined_at: m.joined_at,
          }))}
          currentUserRole={membership.role}
        />
      </main>
    </div>
  );
}
