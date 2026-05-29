"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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

interface Member {
  id: string;
  full_name: string;
}

interface Contribution {
  id: string;
  member_id: string;
  month_year: string;
  amount_due: number;
  amount_paid: number;
  paid_at: string | null;
  payment_method: string | null;
}

function getMonthsFromFounding(dateStr: string, count: number): string[] {
  const d = new Date(dateStr);
  const months: string[] = [];
  for (let i = 0; i < count; i++) {
    const m = new Date(d.getFullYear(), d.getMonth() + i, 1);
    months.push(m.toISOString().slice(0, 7));
  }
  return months;
}

function getStatus(memberId: string, month: string, contributions: Contribution[]): "paid" | "partial" | "pending" | "overdue" {
  const found = contributions.find(
    (c) => c.member_id === memberId && c.month_year.startsWith(month)
  );
  if (!found) return month < new Date().toISOString().slice(0, 7) ? "overdue" : "pending";
  const amt = Number(found.amount_paid);
  const due = Number(found.amount_due);
  if (amt >= due) return "paid";
  if (amt > 0) return "partial";
  return month < new Date().toISOString().slice(0, 7) ? "overdue" : "pending";
}

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
  partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
  pending: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  overdue: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const statusLabels: Record<string, string> = {
  paid: "Paid",
  partial: "Partial",
  pending: "Pending",
  overdue: "Overdue",
};

export function ContributionTracker({
  chamaId,
  members,
  contributions,
  contributionAmount,
  isOfficer,
  formatKES,
}: {
  chamaId: string;
  members: Member[];
  contributions: Contribution[];
  contributionAmount: number;
  isOfficer: boolean;
  formatKES: (n: number) => string;
}) {
  const [allContributions, setAllContributions] = useState(contributions);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null);
  const [amount, setAmount] = useState(contributionAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const months = getMonthsFromFounding(
    contributions[0]?.month_year?.slice(0, 7) || new Date().toISOString().slice(0, 7),
    12
  );

  const openRecordPayment = (memberId: string, month: string) => {
    if (!isOfficer) return;
    setSelectedMember(memberId);
    setSelectedMonth(month);
    setAmount(contributionAmount.toString());
    setPaymentMethod("cash");
    setError(null);
    setDialogOpen(true);
  };

  const handleRecord = async () => {
    if (!selectedMember || !selectedMonth) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/chamas/${chamaId}/contributions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: selectedMember,
        monthYear: `${selectedMonth}-01`,
        amount: Number(amount),
        paymentMethod,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to record payment");
      setSaving(false);
      return;
    }

    const { contribution } = await res.json();
    setAllContributions((prev) => {
      const existing = prev.findIndex(
        (c) => c.member_id === selectedMember && c.month_year.startsWith(selectedMonth)
      );
      if (existing >= 0) {
        const copy = [...prev];
        copy[existing] = {
          ...copy[existing],
          amount_paid: contribution.amount_paid || Number(copy[existing].amount_paid) + Number(amount),
          paid_at: contribution.paid_at,
          payment_method: contribution.payment_method,
        };
        return copy;
      }
      const newRecord: Contribution = {
        id: contribution.id,
        member_id: contribution.member_id,
        month_year: contribution.month_year,
        amount_due: contribution.amount_due || contributionAmount,
        amount_paid: contribution.amount_paid || Number(amount),
        paid_at: contribution.paid_at,
        payment_method: contribution.payment_method,
      };
      return [...prev, newRecord];
    });
    setDialogOpen(false);
    setSaving(false);
  };

  const totals = members.map((m) => {
    const memberContribs = allContributions.filter((c) => c.member_id === m.id);
    const paid = memberContribs.reduce((s, c) => s + Number(c.amount_paid), 0);
    const due = memberContribs.reduce((s, c) => s + Number(c.amount_due), 0);
    return { memberId: m.id, paid, due };
  });

  return (
    <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="sticky left-0 bg-muted/50 px-3 py-2 text-left font-medium">
              Member
            </th>
            {months.map((m) => (
              <th key={m} className="px-2 py-2 text-center font-medium text-xs">
                {new Date(`${m}-01`).toLocaleDateString("en-KE", {
                  month: "short",
                  year: "2-digit",
                })}
              </th>
            ))}
            <th className="px-3 py-2 text-center font-medium">Total</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {members.map((member) => (
            <tr key={member.id} className="hover:bg-muted/30">
              <td className="sticky left-0 bg-white dark:bg-zinc-900 px-3 py-2 font-medium whitespace-nowrap">
                {member.full_name}
              </td>
              {months.map((month) => {
                const status = getStatus(member.id, month, allContributions);
                const found = allContributions.find(
                  (c) => c.member_id === member.id && c.month_year.startsWith(month)
                );
                return (
                  <td key={month} className="px-1 py-2 text-center">
                    <button
                      onClick={() => openRecordPayment(member.id, month)}
                      disabled={!isOfficer}
                      className={`w-full rounded px-2 py-1 text-xs font-medium transition-colors ${
                        statusStyles[status]
                      } ${isOfficer ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                      title={
                        found
                          ? `${statusLabels[status]}: ${formatKES(Number(found.amount_paid))} / ${formatKES(Number(found.amount_due))}`
                          : statusLabels[status]
                      }
                    >
                      {statusLabels[status]}
                    </button>
                  </td>
                );
              })}
              <td className="px-3 py-2 text-center text-xs font-medium">
                {formatKES(totals.find((t) => t.memberId === member.id)?.paid || 0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a contribution payment for this member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
              />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(v) => v && setPaymentMethod(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="mpesa">M-Pesa</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecord} disabled={saving}>
                {saving ? "Saving..." : "Record Payment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
