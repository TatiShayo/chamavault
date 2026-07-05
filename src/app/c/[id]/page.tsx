import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Calendar,
  Landmark,
  Users,
  Banknote,
  Smartphone,
  Globe,
  ArrowRight,
} from "lucide-react";

export default async function PublicChamaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: chamaId } = await params;
  const supabase = await createClient();

  const { data: chama } = await supabase
    .from("chamas")
    .select(
      "name, founding_date, meeting_day, meeting_frequency, contribution_amount, objective, bank_account, mpesa_number, is_active"
    )
    .eq("id", chamaId)
    .single();

  if (!chama || !chama.is_active) {
    notFound();
  }

  const { count: memberCount } = await supabase
    .from("chama_members")
    .select("id", { count: "exact" })
    .eq("chama_id", chamaId);

  const foundingDate = new Date(chama.founding_date);
  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
    }).format(amount);

  const freqLabel =
    chama.meeting_frequency === "weekly"
      ? "week"
      : chama.meeting_frequency === "biweekly"
        ? "2 weeks"
        : "month";

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b bg-white dark:bg-zinc-900 sticky top-0 z-40">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-3 sm:px-4 py-3 sm:py-4">
          <Link href="/" className="flex items-center gap-2">
            <Landmark className="size-5 sm:size-6 text-amber-500" />
            <span className="text-lg sm:text-xl font-bold">ChamaVault</span>
          </Link>
          <Link
            href="/auth/login"
            className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-all"
          >
            Sign In
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-3 sm:px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center rounded-full bg-amber-500/10 p-3 mb-4">
            <Landmark className="size-8 text-amber-500" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            {chama.name}
          </h1>
          <p className="mt-2 text-muted-foreground">
            Est.{" "}
            {foundingDate.toLocaleDateString("en-KE", {
              year: "numeric",
              month: "long",
            })}
            {" · "}
            Managed on ChamaVault
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Meeting Schedule</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Calendar className="size-4 text-muted-foreground" />
                <span className="font-medium capitalize">
                  {chama.meeting_day}s · {chama.meeting_frequency}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Contribution</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Banknote className="size-4 text-muted-foreground" />
                <span className="font-medium">
                  {formatKES(chama.contribution_amount)} / {freqLabel}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Members</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Users className="size-4 text-muted-foreground" />
                <span className="font-medium">
                  {memberCount ?? 0} {memberCount === 1 ? "member" : "members"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Managed With</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Globe className="size-4 text-muted-foreground" />
                <span className="font-medium">ChamaVault</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {chama.objective && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardDescription>Our Objective</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm italic text-muted-foreground">
                &ldquo;{chama.objective}&rdquo;
              </p>
            </CardContent>
          </Card>
        )}

        {(chama.bank_account || chama.mpesa_number) && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardDescription>Payment Details</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2 sm:grid-cols-2">
              {chama.bank_account && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Banknote className="size-4 shrink-0" />
                  <span className="truncate">{chama.bank_account}</span>
                </div>
              )}
              {chama.mpesa_number && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Smartphone className="size-4 shrink-0" />
                  <span>{chama.mpesa_number}</span>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card className="bg-amber-500/5 border-amber-500/20 mb-6">
          <CardContent className="py-6 text-center">
            <h2 className="text-lg font-semibold mb-2">
              Want to join {chama.name}?
            </h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ask your chairperson or treasurer for an invitation link, or sign in
              to ChamaVault if you already have an account.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              <Link
                href="/auth/signup"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-10 gap-1.5 px-4 hover:bg-primary/80 transition-all"
              >
                Create Account
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/auth/login"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground text-sm font-medium h-10 gap-1.5 px-4 hover:bg-muted transition-all"
              >
                Sign In
              </Link>
            </div>
          </CardContent>
        </Card>
      </main>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        <p>
          Powered by{" "}
          <Link href="/" className="underline hover:text-foreground">
            ChamaVault
          </Link>{" "}
          — Simamia Chama Yako Vizuri
        </p>
      </footer>
    </div>
  );
}
