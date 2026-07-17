import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { sendWelcomeEmail } from "@/lib/email";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";

export default async function JoinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Look up invitation
  const { data: invitation } = await supabase
    .from("invitations")
    .select("*, chama:chama_id(id, name, contribution_amount, meeting_day, meeting_frequency)")
    .eq("token", token)
    .maybeSingle();

  if (!invitation || invitation.status !== "pending") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invitation link is invalid or has already been used.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-all"
            >
              Go Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (new Date(invitation.expires_at) < new Date()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Invitation Expired</CardTitle>
            <CardDescription>
              This invitation has expired. Ask your chairperson for a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-all"
            >
              Go Home
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const chamaData = invitation.chama as unknown as { id: string; name: string; contribution_amount: number; meeting_day: string; meeting_frequency: string } | null;
  const chamaName = chamaData?.name || "this chama";

  if (!user) {
    const signupUrl = `/auth/signup?invite=${token}&chama=${encodeURIComponent(chamaName)}`;
    const loginUrl = `/auth/login?invite=${token}&chama=${encodeURIComponent(chamaName)}`;
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>You&apos;ve Been Invited</CardTitle>
            <CardDescription>
              {chamaName} has invited you! Sign in or create an account to join.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Link
              href={loginUrl}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-all"
            >
              Sign In
            </Link>
            <Link
              href={signupUrl}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-border bg-background text-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-muted transition-all"
            >
              Create Account
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // User is logged in — check if already a member
  const { data: existingMember } = await supabase
    .from("chama_members")
    .select("id")
    .eq("chama_id", invitation.chama_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingMember) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Already a Member</CardTitle>
            <CardDescription>
              You are already a member of {chamaData?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-all"
            >
              Go to Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Add the user as a member and mark invitation accepted
  const { error: joinError } = await supabase.from("chama_members").insert({
    chama_id: invitation.chama_id,
    user_id: user.id,
    full_name: user.user_metadata?.full_name || user.email || "Member",
    role: "member",
  });

  if (joinError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>
              Could not join the chama. Please try again.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link
              href="/dashboard"
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-primary text-primary-foreground text-sm font-medium h-8 gap-1.5 px-2.5 hover:bg-primary/80 transition-all"
            >
              Back to Dashboard
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Mark invitation as accepted
  await supabase
    .from("invitations")
    .update({ status: "accepted" })
    .eq("id", invitation.id);

  // Send welcome email
  const userEmail = user.email;
  if (userEmail) {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    sendWelcomeEmail({
      to: userEmail,
      memberName: user.user_metadata?.full_name || user.email || "Member",
      chamaName: chamaData?.name || "Chama",
      contributionAmount: chamaData?.contribution_amount || 0,
      meetingDay: chamaData?.meeting_day || "Monday",
      meetingFrequency: chamaData?.meeting_frequency || "monthly",
      chamaLink: `${siteUrl}/dashboard/chamas/${invitation.chama_id}`,
    }).catch((e) => console.error("Welcome email failed:", e));
  }

  redirect("/dashboard");
}
