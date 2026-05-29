import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Calendar, Landmark } from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const displayName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "Member";

  const { data: memberships } = await supabase
    .from("chama_members")
    .select(
      "id, role, chama_id, chamas:chama_id (id, name, meeting_day, meeting_frequency, contribution_amount, objective, founding_date)"
    )
    .eq("user_id", user.id);

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
      <main className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold">Welcome, {displayName}</h2>
          <Link
            href="/dashboard/create-chama"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-all"
          >
            <Plus className="size-4" />
            Create Chama
          </Link>
        </div>

        {memberships && memberships.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => {
              const chama = (m as any).chamas;
              if (!chama) return null;
              return (
                <Card key={m.chama_id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{chama.name}</CardTitle>
                      <span className="rounded-full bg-yellow-500/10 px-2 py-0.5 text-xs font-medium text-yellow-600 dark:text-yellow-400 capitalize">
                        {m.role}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="size-4" />
                      <span className="capitalize">
                        {chama.meeting_day}s • {chama.meeting_frequency}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
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
                    {chama.objective && (
                      <p className="pt-1 border-t text-xs italic">
                        {chama.objective}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Chama</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  You haven&apos;t joined a chama yet. Create one or ask your
                  chairperson for an invite.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contributions</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No contributions recorded yet.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Meetings</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  No meetings scheduled.
                </p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
