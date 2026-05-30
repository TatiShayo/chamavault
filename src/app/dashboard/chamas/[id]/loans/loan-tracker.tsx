"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Check, X } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
}

interface Loan {
  id: string;
  memberId: string;
  fullName: string;
  amount: number;
  interestRate: number;
  disbursedAt: string | null;
  dueDate: string | null;
  status: string;
  approvedBy: string | null;
  createdAt: string;
  totalRepaid: number;
  totalRepayments: number;
  outstanding: number;
  totalDue: number;
}

const STATUS_BADGE: Record<string, string> = {
  pending:
    "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  approved:
    "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  active:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  repaid:
    "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
};

export function LoanTracker({
  chamaId,
  members,
  isOfficer,
  formatKES,
}: {
  chamaId: string;
  members: Member[];
  isOfficer: boolean;
  formatKES: (n: number) => string;
}) {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const [applyOpen, setApplyOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [loanAmount, setLoanAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [interestRate, setInterestRate] = useState("10");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [repayOpen, setRepayOpen] = useState(false);
  const [repayLoanId, setRepayLoanId] = useState("");
  const [repayAmount, setRepayAmount] = useState("");
  const [repaying, setRepaying] = useState(false);
  const [repayError, setRepayError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState("active");

  const fetchLoans = async () => {
    const res = await fetch(`/api/chamas/${chamaId}/loans`);
    if (res.ok) {
      const data = await res.json();
      setLoans(data.loans);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLoans();
  }, [chamaId]);

  const activeLoans = loans.filter(
    (l) => l.status === "approved" || l.status === "active"
  );
  const applications = loans.filter((l) => l.status === "pending");
  const history = loans.filter(
    (l) => l.status === "rejected" || l.status === "repaid"
  );

  const activeTotal = activeLoans.reduce(
    (sum, l) => sum + l.outstanding,
    0
  );

  const handleApply = async () => {
    if (!selectedMember || !loanAmount) {
      setError("Please fill all required fields");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/chamas/${chamaId}/loans`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: selectedMember,
        amount: Number(loanAmount),
        purpose,
        dueDate: dueDate || null,
        interestRate: Number(interestRate),
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to apply");
      setSaving(false);
      return;
    }

    const { loan } = await res.json();
    const member = members.find((m) => m.id === loan.memberId);
    setLoans((prev) => [
      { ...loan, fullName: member?.full_name || "Unknown" },
      ...prev,
    ]);
    setApplyOpen(false);
    setSelectedMember("");
    setLoanAmount("");
    setPurpose("");
    setDueDate("");
    setInterestRate("10");
    setSaving(false);
  };

  const handleAction = async (loanId: string, action: "approve" | "reject") => {
    const res = await fetch(`/api/chamas/${chamaId}/loans`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loanId, action }),
    });

    if (!res.ok) return;

    setLoans((prev) =>
      prev.map((l) =>
        l.id === loanId
          ? {
              ...l,
              status: action === "approve" ? "approved" : "rejected",
              disbursedAt:
                action === "approve" ? new Date().toISOString() : l.disbursedAt,
            }
          : l
      )
    );
  };

  const handleMarkRepaid = async (loanId: string) => {
    const res = await fetch(`/api/chamas/${chamaId}/loans`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loanId, action: "markRepaid" }),
    });

    if (!res.ok) return;

    setLoans((prev) =>
      prev.map((l) => (l.id === loanId ? { ...l, status: "repaid" } : l))
    );
  };

  const handleRepay = async () => {
    if (!repayLoanId || !repayAmount) {
      setRepayError("Please select a loan and enter amount");
      return;
    }
    setRepaying(true);
    setRepayError(null);

    const res = await fetch(`/api/chamas/${chamaId}/loans`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loanId: repayLoanId,
        action: "repay",
        repaymentAmount: Number(repayAmount),
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setRepayError(body.error || "Failed to record repayment");
      setRepaying(false);
      return;
    }

    await fetchLoans();
    setRepayOpen(false);
    setRepayLoanId("");
    setRepayAmount("");
    setRepaying(false);
  };

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Loading loans...</p>;
  }

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-violet-400 via-purple-500 to-indigo-600 p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs sm:text-sm font-medium text-white/80">
              Active Loans Outstanding
            </p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              {formatKES(activeTotal)}
            </p>
          </div>
          {isOfficer && (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 hover:text-white text-xs sm:text-sm"
                onClick={() => {
                  setRepayLoanId("");
                  setRepayAmount("");
                  setRepayError(null);
                  setRepayOpen(true);
                }}
              >
                <Check className="size-3 sm:size-4" />
                <span className="hidden sm:inline">Record Repayment</span>
                <span className="sm:hidden">Repay</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-white/20 text-white hover:bg-white/10 hover:text-white text-xs sm:text-sm"
                onClick={() => {
                  setSelectedMember("");
                  setLoanAmount("");
                  setPurpose("");
                  setDueDate("");
                  setInterestRate("10");
                  setError(null);
                  setApplyOpen(true);
                }}
              >
                <Plus className="size-3 sm:size-4" />
                <span className="hidden sm:inline">New Loan</span>
                <span className="sm:hidden">New</span>
              </Button>
            </div>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4 w-full overflow-x-auto justify-start">
          <TabsTrigger value="active" className="shrink-0 text-xs sm:text-sm">
            Active ({activeLoans.length})
          </TabsTrigger>
          <TabsTrigger value="applications" className="shrink-0 text-xs sm:text-sm">
            Apps ({applications.length})
          </TabsTrigger>
          <TabsTrigger value="history" className="shrink-0 text-xs sm:text-sm">
            History ({history.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="active">
          <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-900">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium">Member</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-right font-medium">Interest</th>
                  <th className="px-4 py-2.5 text-left font-medium">Disbursed</th>
                  <th className="px-4 py-2.5 text-left font-medium">Due Date</th>
                  <th className="px-4 py-2.5 text-right font-medium">Repaid</th>
                  <th className="px-4 py-2.5 text-right font-medium">Outstanding</th>
                  <th className="px-4 py-2.5 text-center font-medium">Status</th>
                  {isOfficer && (
                    <th className="px-4 py-2.5 text-right font-medium">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {activeLoans.length === 0 && (
                  <tr>
                    <td
                      colSpan={isOfficer ? 9 : 8}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No active loans.
                    </td>
                  </tr>
                )}
                {activeLoans.map((loan) => (
                  <tr key={loan.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{loan.fullName}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatKES(loan.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {loan.interestRate}%
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {loan.disbursedAt
                        ? new Date(loan.disbursedAt).toLocaleDateString(
                            "en-KE",
                            { year: "numeric", month: "short", day: "numeric" }
                          )
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {loan.dueDate
                        ? new Date(loan.dueDate).toLocaleDateString("en-KE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-right text-emerald-600 dark:text-emerald-400">
                      {formatKES(loan.totalRepaid)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-semibold text-red-600 dark:text-red-400">
                      {formatKES(loan.outstanding)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_BADGE[loan.status] || STATUS_BADGE.repaid}`}
                      >
                        {loan.status}
                      </Badge>
                    </td>
                    {isOfficer && (
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => handleMarkRepaid(loan.id)}
                        >
                          <Check className="size-3" />
                          Mark Repaid
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="applications">
          <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-900">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium">Member</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-right font-medium">Interest</th>
                  <th className="px-4 py-2.5 text-left font-medium">Due Date</th>
                  <th className="px-4 py-2.5 text-left font-medium">Applied</th>
                  <th className="px-4 py-2.5 text-center font-medium">Status</th>
                  {isOfficer && (
                    <th className="px-4 py-2.5 text-right font-medium">Action</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y">
                {applications.length === 0 && (
                  <tr>
                    <td
                      colSpan={isOfficer ? 7 : 6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No pending applications.
                    </td>
                  </tr>
                )}
                {applications.map((loan) => (
                  <tr key={loan.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{loan.fullName}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatKES(loan.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {loan.interestRate}%
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {loan.dueDate
                        ? new Date(loan.dueDate).toLocaleDateString("en-KE", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(loan.createdAt).toLocaleDateString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_BADGE.pending}`}
                      >
                        pending
                      </Badge>
                    </td>
                    {isOfficer && (
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="outline"
                            size="xs"
                            className="text-emerald-600"
                            onClick={() => handleAction(loan.id, "approve")}
                          >
                            <Check className="size-3" />
                            Approve
                          </Button>
                          <Button
                            variant="outline"
                            size="xs"
                            className="text-red-600"
                            onClick={() => handleAction(loan.id, "reject")}
                          >
                            <X className="size-3" />
                            Reject
                          </Button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-900">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-2.5 text-left font-medium">Member</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-right font-medium">Interest</th>
                  <th className="px-4 py-2.5 text-left font-medium">Applied</th>
                  <th className="px-4 py-2.5 text-right font-medium">Repaid</th>
                  <th className="px-4 py-2.5 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {history.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-muted-foreground"
                    >
                      No loan history.
                    </td>
                  </tr>
                )}
                {history.map((loan) => (
                  <tr key={loan.id} className="hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{loan.fullName}</td>
                    <td className="px-4 py-2.5 text-right">
                      {formatKES(loan.amount)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-muted-foreground">
                      {loan.interestRate}%
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {new Date(loan.createdAt).toLocaleDateString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatKES(loan.totalRepaid)}
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge
                        variant="outline"
                        className={`text-xs ${STATUS_BADGE[loan.status] || STATUS_BADGE.repaid}`}
                      >
                        {loan.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Apply Dialog */}
      <Dialog open={applyOpen} onOpenChange={setApplyOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {isOfficer ? "Disburse Loan" : "Apply for Loan"}
            </DialogTitle>
            <DialogDescription>
              {isOfficer
                ? "Record a loan issued to a member."
                : "Apply for a loan from the chama."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <Select
                value={selectedMember}
                onValueChange={(v) => v && setSelectedMember(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                value={loanAmount}
                onChange={(e) => setLoanAmount(e.target.value)}
                min="1"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Purpose (optional)</Label>
              <Input
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="What is the loan for?"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Interest Rate (%)</Label>
                <Input
                  type="number"
                  value={interestRate}
                  onChange={(e) => setInterestRate(e.target.value)}
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="10"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setApplyOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={saving}>
                {saving ? "Saving..." : isOfficer ? "Disburse Loan" : "Apply"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Repay Dialog */}
      <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
            <DialogDescription>
              Record a loan repayment from a member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Loan</Label>
              <Select
                value={repayLoanId}
                onValueChange={(v) => v && setRepayLoanId(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select loan" />
                </SelectTrigger>
                <SelectContent>
                  {activeLoans.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.fullName} — {formatKES(l.outstanding)} outstanding
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                value={repayAmount}
                onChange={(e) => setRepayAmount(e.target.value)}
                min="1"
                placeholder="0"
              />
            </div>
            {repayError && (
              <p className="text-sm text-destructive">{repayError}</p>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRepayOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRepay} disabled={repaying}>
                {repaying ? "Recording..." : "Record Repayment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
