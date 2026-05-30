import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { EditChamaForm } from "./form";

export default async function EditChamaPage({
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
    .select("name, founding_date, objective, bank_account, mpesa_number, constitution_url, constitution_name")
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

  if (
    !membership ||
    !["chairperson", "treasurer", "secretary"].includes(membership.role)
  ) {
    redirect(`/dashboard/chamas/${chamaId}`);
  }

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
      <main className="mx-auto max-w-lg px-4 py-8">
        <Link
          href={`/dashboard/chamas/${chamaId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Chama
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Edit Chama Profile</CardTitle>
            <CardDescription>
              Update your chama details and payment information.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EditChamaForm chamaId={chamaId} chama={chama} />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
