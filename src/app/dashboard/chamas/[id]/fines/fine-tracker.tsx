"use client";

import { useState } from "react";
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
import { Plus, Check } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
}

interface Fine {
  id: string;
  member_id: string;
  reason: string;
  amount: number;
  paid: boolean;
  issued_at: string;
  full_name?: string;
  chama_members?: { full_name: string } | { full_name: string }[];
}

const REASONS = [
  "Missed Meeting",
  "Late Contribution",
  "Late Loan Payment",
  "Other",
];

export function FineTracker({
  chamaId,
  members,
  fines: initialFines,
  isOfficer,
  formatKES,
}: {
  chamaId: string;
  members: Member[];
  fines: Fine[];
  isOfficer: boolean;
  formatKES: (n: number) => string;
}) {
  const [fines, setFines] = useState(initialFines);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState("");
  const [reason, setReason] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const outstanding = fines
    .filter((f) => !f.paid)
    .reduce((sum, f) => sum + Number(f.amount), 0);

  const getMemberName = (fine: Fine) => {
    if (fine.full_name) return fine.full_name;
    const cm = fine.chama_members;
    if (cm && !Array.isArray(cm) && cm.full_name) return cm.full_name;
    if (cm && Array.isArray(cm) && cm[0]?.full_name) return cm[0].full_name;
    const member = members.find((m) => m.id === fine.member_id);
    return member?.full_name || "Unknown";
  };

  const handleAddFine = async () => {
    if (!selectedMember || !reason || !amount) {
      setError("Please fill all required fields");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/chamas/${chamaId}/fines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        memberId: selectedMember,
        reason,
        amount: Number(amount),
        notes: notes || undefined,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to add fine");
      setSaving(false);
      return;
    }

    const { fine } = await res.json();
    setFines((prev) => [
      {
        ...fine,
        member_id: fine.memberId,
        full_name: members.find((m) => m.id === fine.memberId)?.full_name,
        issued_at: fine.issuedAt,
      },
      ...prev,
    ]);
    setDialogOpen(false);
    setSelectedMember("");
    setReason("");
    setAmount("");
    setNotes("");
    setSaving(false);
  };

  const handleMarkPaid = async (fineId: string) => {
    const res = await fetch(`/api/chamas/${chamaId}/fines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fineId, paid: true }),
    });

    if (!res.ok) return;

    setFines((prev) =>
      prev.map((f) => (f.id === fineId ? { ...f, paid: true } : f))
    );
  };

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-red-400 via-rose-500 to-pink-600 p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-white/80">Outstanding Fines</p>
            <p className="text-3xl font-bold tracking-tight">
              {formatKES(outstanding)}
            </p>
          </div>
          {isOfficer && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white"
              onClick={() => {
                setSelectedMember("");
                setReason("");
                setAmount("");
                setNotes("");
                setError(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add Fine
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-900">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium">Member</th>
              <th className="px-4 py-2.5 text-left font-medium">Reason</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 text-left font-medium">Issued</th>
              <th className="px-4 py-2.5 text-center font-medium">Status</th>
              {isOfficer && (
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {fines.length === 0 && (
              <tr>
                <td
                  colSpan={isOfficer ? 6 : 5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No fines recorded yet.
                </td>
              </tr>
            )}
            {fines.map((fine) => (
              <tr key={fine.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 font-medium">
                  {getMemberName(fine)}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {fine.reason}
                </td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {formatKES(Number(fine.amount))}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {new Date(fine.issued_at).toLocaleDateString("en-KE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-2.5 text-center">
                  <Badge
                    variant={fine.paid ? "default" : "destructive"}
                    className="text-xs"
                  >
                    {fine.paid ? "Paid" : "Unpaid"}
                  </Badge>
                </td>
                {isOfficer && (
                  <td className="px-4 py-2.5 text-right">
                    {!fine.paid && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={() => handleMarkPaid(fine.id)}
                      >
                        <Check className="size-3" />
                        Paid
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Fine</DialogTitle>
            <DialogDescription>
              Issue a fine to a member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Member</Label>
              <Select value={selectedMember} onValueChange={(v) => v && setSelectedMember(v)}>
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
              <Label>Reason</Label>
              <Select value={reason} onValueChange={(v) => v && setReason(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {REASONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount (KES)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="1"
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional details..."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddFine} disabled={saving}>
                {saving ? "Adding..." : "Add Fine"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
