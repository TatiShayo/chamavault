"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Copy, Check } from "lucide-react";
import Link from "next/link";

const inviteSchema = z.object({
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
});

type InviteForm = z.infer<typeof inviteSchema>;

export default function InvitePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: chamaId } = use(params);
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joinUrl, setJoinUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [chamaName, setChamaName] = useState("");
  const [invitations, setInvitations] = useState<any[]>([]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
  });

  useEffect(() => {
    fetch(`/api/chamas/${chamaId}/invitations`)
      .then((r) => r.json())
      .then((data) => {
        if (data.invitations) setInvitations(data.invitations);
      })
      .catch(() => {});
  }, [chamaId]);

  const onSubmit = async (data: InviteForm) => {
    if (!data.email && !data.phone) {
      setError("Provide at least an email or phone number");
      return;
    }
    setError(null);
    setJoinUrl(null);

    const res = await fetch(`/api/chamas/${chamaId}/invitations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to create invitation");
      return;
    }

    const body = await res.json();
    setJoinUrl(body.joinUrl);
    setChamaName(body.chamaName);
    setInvitations((prev) => [body.invitation, ...prev]);
    reset();
  };

  const copyLink = async () => {
    if (!joinUrl) return;
    await navigator.clipboard.writeText(joinUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          href="/dashboard"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Invite Members</CardTitle>
            <CardDescription>
              Members will receive a link to join the chama.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="member@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone (optional)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+254 712 345 678"
                  {...register("phone")}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Invite Link"}
              </Button>
            </form>

            {joinUrl && (
              <div className="mt-4 rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4">
                <p className="text-sm font-medium mb-2">
                  ✅ Invite created for {chamaName}
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={joinUrl}
                    className="flex-1 rounded border bg-muted px-2 py-1 text-xs text-muted-foreground"
                  />
                  <Button size="sm" variant="outline" onClick={copyLink}>
                    {copied ? (
                      <Check className="size-3" />
                    ) : (
                      <Copy className="size-3" />
                    )}
                  </Button>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Share this link. Expires in 7 days.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {invitations.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-lg">Pending Invitations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {invitations
                  .filter((i) => i.status === "pending")
                  .map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between rounded bg-muted/50 px-3 py-2 text-sm"
                    >
                      <span>{inv.email || inv.phone || "No contact"}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
