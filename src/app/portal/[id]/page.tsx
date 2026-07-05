"use client";

import { useState, use } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, FileText, CheckCircle, XCircle, Clock } from "lucide-react";

interface PortalData {
  member: { id: string; name: string; role: string };
  chama: { name: string; contributionAmount: number; meetingDay: string; meetingFrequency: string };
  contributions: { monthYear: string; amountDue: number; amountPaid: number; status: string; paidAt: string | null }[];
  totalPaid: number;
  totalDue: number;
  loans: { id: string; amount: number; interestRate: number; status: string; outstanding: number; monthlyPayment: number; dueDate: string }[];
  meetings: { id: string; date: string; venue: string; agenda: string }[];
  fines: { reason: string; amount: number; paid: boolean; issuedAt: string }[];
  equity: number;
  arrears: number;
  totalUnpaidFines: number;
}

export default function PortalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: chamaId } = use(params);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [data, setData] = useState<PortalData | null>(null);

  const handleLookup = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/portal/${chamaId}?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) {
        const body = await res.json();
        setError(body.error || "Member not found");
        setData(null);
        return;
      }
      setData(await res.json());
    } catch {
      setError("Failed to fetch member data");
    } finally {
      setLoading(false);
    }
  };

  const formatKES = (amount: number) =>
    new Intl.NumberFormat("en-KE", { style: "currency", currency: "KES" }).format(amount);

  if (!data) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>ChamaVault Member Portal</CardTitle>
            <CardDescription>
              Enter your phone number to view your contributions, loans, and meeting schedule.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              type="tel"
              placeholder="Phone number (e.g. 07XX XXX XXX)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLookup()}
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button
              className="w-full"
              onClick={handleLookup}
              disabled={loading || !phone.trim()}
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : "View My Account"}
            </Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  const overdueCount = data.contributions.filter((c) => c.status === "overdue").length;
  const activeLoans = data.loans.filter((l) => l.status === "active");
  const totalOutstanding = activeLoans.reduce((s, l) => s + l.outstanding, 0);

  return (
    <main className="mx-auto max-w-2xl px-3 sm:px-4 py-6 sm:py-8">
      <Card className="mb-6 overflow-hidden border-amber-200 dark:border-amber-800">
        <div className="bg-amber-50 dark:bg-amber-950/30 px-6 py-4">
          <p className="text-xs font-medium uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {data.chama.name}
          </p>
          <h1 className="text-xl font-bold">{data.member.name}</h1>
          <p className="text-sm text-muted-foreground capitalize">{data.member.role}</p>
        </div>
      </Card>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
          <CardContent className="p-4 text-center">
            <CheckCircle className="mx-auto mb-1 size-5 text-emerald-600" />
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
              {formatKES(data.totalPaid)}
            </p>
            <p className="text-xs text-muted-foreground">Total Paid</p>
          </CardContent>
        </Card>
        <Card className={overdueCount > 0 ? "bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-800" : "bg-zinc-100 dark:bg-zinc-900"}>
          <CardContent className="p-4 text-center">
            <XCircle className={`mx-auto mb-1 size-5 ${overdueCount > 0 ? "text-red-600" : "text-zinc-400"}`} />
            <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-red-700 dark:text-red-400" : "text-zinc-500"}`}>
              {formatKES(data.arrears)}
            </p>
            <p className="text-xs text-muted-foreground">Outstanding ({overdueCount} overdue)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{formatKES(data.equity)}</p>
            <p className="text-xs text-muted-foreground">My Equity</p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Contribution History</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(`/api/chamas/${chamaId}/statement?memberId=${data.member.id}`, "_blank")}
            >
              <FileText className="size-3.5" />
              Statement PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            <div className="flex px-4 py-2 text-xs font-medium text-muted-foreground">
              <span className="w-1/3">Month</span>
              <span className="w-1/4 text-right">Due</span>
              <span className="w-1/4 text-right">Paid</span>
              <span className="w-1/6 text-right">Status</span>
            </div>
            {data.contributions.map((c) => (
              <div key={c.monthYear} className="flex items-center px-4 py-2.5 text-sm">
                <span className="w-1/3">{c.monthYear}</span>
                <span className="w-1/4 text-right">{formatKES(c.amountDue)}</span>
                <span className="w-1/4 text-right">{formatKES(c.amountPaid)}</span>
                <span className="w-1/6 text-right">
                  {c.status === "paid" ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <CheckCircle className="size-3" /> Paid
                    </span>
                  ) : c.status === "overdue" ? (
                    <span className="inline-flex items-center gap-1 text-red-600">
                      <XCircle className="size-3" /> Overdue
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-zinc-400">
                      <Clock className="size-3" /> Pending
                    </span>
                  )}
                </span>
              </div>
            ))}
            {data.contributions.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">No contributions recorded yet.</p>
            )}
          </div>
        </CardContent>
      </Card>

      {activeLoans.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Loans ({activeLoans.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {activeLoans.map((l) => (
                <div key={l.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{formatKES(l.amount)} @ {l.interestRate}%</span>
                    <span className={l.outstanding > 0 ? "text-red-600 font-medium" : "text-emerald-600"}>
                      {l.outstanding > 0 ? formatKES(l.outstanding) : "Repaid"}
                    </span>
                  </div>
                  <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
                    <span>Monthly: {formatKES(l.monthlyPayment)}</span>
                    {l.dueDate && <span>Due: {new Date(l.dueDate).toLocaleDateString("en-KE")}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Upcoming Meetings</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {data.meetings.length > 0 ? (
            <div className="divide-y">
              {data.meetings.map((m) => (
                <div key={m.id} className="px-4 py-3">
                  <p className="font-medium">
                    {new Date(m.date as string).toLocaleDateString("en-KE", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {m.venue && <p className="text-sm text-muted-foreground">{m.venue as string}</p>}
                  {m.agenda && <p className="text-sm text-muted-foreground truncate">{m.agenda as string}</p>}
                </div>
              ))}
            </div>
          ) : (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No upcoming meetings.</p>
          )}
        </CardContent>
      </Card>

      {data.fines.length > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Fines</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {data.fines.map((f, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm">{f.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(f.issuedAt as string).toLocaleDateString("en-KE")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatKES(f.amount)}</p>
                    <p className={`text-xs ${f.paid ? "text-emerald-600" : "text-red-600"}`}>
                      {f.paid ? "Paid" : "Unpaid"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <p className="text-center text-xs text-muted-foreground">
        ChamaVault — Simamia Chama Yako Vizuri
      </p>
    </main>
  );
}
