"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Plus, Calendar, Landmark } from "lucide-react";
import { useLang, t } from "@/lib/i18n";
import { LangToggle } from "@/components/lang-toggle";

export default function DashboardPage() {
  const router = useRouter();
  const { lang } = useLang();
  const [loading, setLoading] = useState(true);
  const [displayName, setDisplayName] = useState("");
  const [memberships, setMemberships] = useState<any[]>([]);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login");
        return;
      }

      setDisplayName(
        user.user_metadata?.full_name || user.email?.split("@")[0] || "Member"
      );

      const { data: members } = await supabase
        .from("chama_members")
        .select(
          "id, role, chama_id, chamas:chama_id (id, name, meeting_day, meeting_frequency, contribution_amount, objective, founding_date)"
        )
        .eq("user_id", user.id);

      setMemberships(members || []);
      setLoading(false);
    })();
  }, [router]);

  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
        <p className="text-muted-foreground">Loading...</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 sm:py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between flex-1">
            <h2 className="text-xl sm:text-2xl font-semibold truncate max-w-[calc(100vw-5rem)] sm:max-w-none">
              {t(lang, "dashboard.welcome")} {displayName}
            </h2>
            <Link
              href="/dashboard/create-chama"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-all"
            >
              <Plus className="size-4" />
              {t(lang, "dashboard.createChama")}
            </Link>
          </div>
          <LangToggle />
        </div>

        {memberships.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {memberships.map((m) => {
              const chama = (m as any).chamas;
              if (!chama) return null;
              return (
                <Card key={m.chama_id}>
                  <Link href={`/dashboard/chamas/${chama.id}`}>
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
                  </Link>
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
                  {t(lang, "dashboard.noChama")}
                </p>
              </CardContent>
            </Card>
          </div>
        )}
    </main>
  );
}
