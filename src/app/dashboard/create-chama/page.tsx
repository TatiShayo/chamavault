"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

const chamaSchema = z.object({
  name: z.string().min(2, "Chama name must be at least 2 characters"),
  contributionAmount: z
    .string()
    .min(1, "Required")
    .refine(
      (v) => {
        const n = Number(v);
        return !isNaN(n) && n >= 100 && n <= 100000;
      },
      { message: "Must be between KES 100 and KES 100,000" }
    ),
  objective: z.string().max(500).optional(),
  foundingDate: z.string().optional(),
});

type ChamaForm = z.infer<typeof chamaSchema>;

const DAYS = [
  "monday", "tuesday", "wednesday", "thursday",
  "friday", "saturday", "sunday",
];

const FREQUENCIES = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Every 2 Weeks" },
  { value: "monthly", label: "Monthly" },
];

export default function CreateChamaPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [meetingDay, setMeetingDay] = useState("sunday");
  const [meetingFrequency, setMeetingFrequency] = useState("monthly");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChamaForm>({
    resolver: zodResolver(chamaSchema),
  });

  const onSubmit = async (data: ChamaForm) => {
    setError(null);

    const res = await fetch("/api/chamas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name,
        meetingDay,
        contributionAmount: Number(data.contributionAmount),
        meetingFrequency,
        foundingDate: data.foundingDate || undefined,
        objective: data.objective || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to create chama");
      return;
    }

    router.push("/dashboard");
    router.refresh();
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
            <CardTitle className="text-2xl">Create Your Chama</CardTitle>
            <CardDescription>
              Set up your savings group. You will be the Chairperson.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Chama Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Wema Savings Group"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contributionAmount">Contribution (KES)</Label>
                  <Input
                    id="contributionAmount"
                    type="number"
                    placeholder="500"
                    {...register("contributionAmount")}
                  />
                  {errors.contributionAmount && (
                    <p className="text-sm text-destructive">
                      {errors.contributionAmount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={meetingFrequency}
                    onValueChange={(value) =>
                      setMeetingFrequency(value as string)
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FREQUENCIES.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Meeting Day</Label>
                <Select
                  value={meetingDay}
                  onValueChange={(value) => setMeetingDay(value as string)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day} value={day}>
                        {day.charAt(0).toUpperCase() + day.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="foundingDate">Founding Date</Label>
                <Input
                  id="foundingDate"
                  type="date"
                  {...register("foundingDate")}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="objective">Objective (optional)</Label>
                <Textarea
                  id="objective"
                  placeholder="e.g. Kuokoleana na kuwekeza pamoja"
                  rows={3}
                  {...register("objective")}
                />
              </div>

              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Chama"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
