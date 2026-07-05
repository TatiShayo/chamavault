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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, TrendingDown, TrendingUp } from "lucide-react";

interface Investment {
  id: string;
  name: string;
  investmentType: string;
  description: string | null;
  purchaseDate: string | null;
  cost: number;
  currentValue: number;
  notes: string | null;
  createdAt: string;
}

const TYPE_LABELS: Record<string, string> = {
  property: "Property",
  stock: "Stock",
  business: "Business",
};

export function InvestmentTracker({
  chamaId,
  investments: initialInvestments,
  isOfficer,
  formatKES,
}: {
  chamaId: string;
  investments: Investment[];
  isOfficer: boolean;
  formatKES: (n: number) => string;
}) {
  const [investments, setInvestments] = useState(initialInvestments);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [investmentType, setInvestmentType] = useState("property");
  const [description, setDescription] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [cost, setCost] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalCost = investments.reduce((sum, i) => sum + i.cost, 0);
  const totalCurrentValue = investments.reduce((sum, i) => sum + i.currentValue, 0);
  const totalGain = totalCurrentValue - totalCost;

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setInvestmentType("property");
    setDescription("");
    setPurchaseDate("");
    setCost("");
    setCurrentValue("");
    setNotes("");
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (inv: Investment) => {
    setEditingId(inv.id);
    setName(inv.name);
    setInvestmentType(inv.investmentType);
    setDescription(inv.description || "");
    setPurchaseDate(inv.purchaseDate?.split("T")[0] || "");
    setCost(String(inv.cost));
    setCurrentValue(String(inv.currentValue));
    setNotes(inv.notes || "");
    setError(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setSaving(true);
    setError(null);

    const body = {
      name: name.trim(),
      investmentType,
      description: description || undefined,
      purchaseDate: purchaseDate || undefined,
      cost: Number(cost) || 0,
      currentValue: Number(currentValue) || 0,
      notes: notes || undefined,
    };

    const url = `/api/chamas/${chamaId}/investments`;
    const res = await fetch(url, {
      method: editingId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editingId ? { id: editingId, ...body } : body),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Failed to save investment");
      setSaving(false);
      return;
    }

    const { investment } = await res.json();

    if (editingId) {
      setInvestments((prev) =>
        prev.map((i) => (i.id === editingId ? investment : i))
      );
    } else {
      setInvestments((prev) => [investment, ...prev]);
    }

    setDialogOpen(false);
    setSaving(false);
  };

  const handleDelete = async (investmentId: string) => {
    const res = await fetch(`/api/chamas/${chamaId}/investments`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ investmentId }),
    });

    if (!res.ok) return;

    setInvestments((prev) => prev.filter((i) => i.id !== investmentId));
  };

  return (
    <div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="overflow-hidden rounded-xl bg-gradient-to-br from-amber-400 via-yellow-500 to-orange-500 p-4 sm:p-5 text-white shadow-lg">
          <p className="text-xs sm:text-sm font-medium text-white/80">Total Cost</p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight">
            {formatKES(totalCost)}
          </p>
        </div>
        <div className="overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 via-green-500 to-teal-600 p-4 sm:p-5 text-white shadow-lg">
          <p className="text-xs sm:text-sm font-medium text-white/80">Current Value</p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight">
            {formatKES(totalCurrentValue)}
          </p>
        </div>
        <div
          className={`overflow-hidden rounded-xl p-4 sm:p-5 text-white shadow-lg ${
            totalGain >= 0
              ? "bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600"
              : "bg-gradient-to-br from-red-400 via-rose-500 to-pink-600"
          }`}
        >
          <p className="text-xs sm:text-sm font-medium text-white/80">
            {totalGain >= 0 ? "Total Gain" : "Total Loss"}
          </p>
          <p className="text-xl sm:text-2xl font-bold tracking-tight">
            {formatKES(Math.abs(totalGain))}
          </p>
        </div>
      </div>

      {isOfficer && (
        <div className="mb-4 flex justify-end">
          <Button onClick={openAdd}>
            <Plus className="size-4" />
            Add Investment
          </Button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border bg-white dark:bg-zinc-900">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium">Name</th>
              <th className="px-4 py-2.5 text-left font-medium">Type</th>
              <th className="px-4 py-2.5 text-right font-medium">Cost</th>
              <th className="px-4 py-2.5 text-right font-medium">Value</th>
              <th className="px-4 py-2.5 text-right font-medium">Gain/Loss</th>
              {isOfficer && (
                <th className="px-4 py-2.5 text-right font-medium">Actions</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {investments.length === 0 && (
              <tr>
                <td
                  colSpan={isOfficer ? 6 : 5}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No investments recorded yet.
                </td>
              </tr>
            )}
            {investments.map((inv) => {
              const gain = inv.currentValue - inv.cost;
              return (
                <tr key={inv.id} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">
                    <div>{inv.name}</div>
                    {inv.description && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {inv.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <Badge variant="outline" className="text-xs capitalize">
                      {TYPE_LABELS[inv.investmentType] || inv.investmentType}
                    </Badge>
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatKES(inv.cost)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-medium tabular-nums">
                    {formatKES(inv.currentValue)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <span
                      className={`inline-flex items-center gap-1 font-medium tabular-nums ${
                        gain >= 0 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {gain >= 0 ? (
                        <TrendingUp className="size-3.5" />
                      ) : (
                        <TrendingDown className="size-3.5" />
                      )}
                      {formatKES(Math.abs(gain))}
                    </span>
                  </td>
                  {isOfficer && (
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => openEdit(inv)}
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => handleDelete(inv.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Investment" : "Add Investment"}
            </DialogTitle>
            <DialogDescription>
              Record a chama investment (property, stock, or business).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Mtaani Plaza"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={investmentType} onValueChange={(v) => v && setInvestmentType(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="property">Property</SelectItem>
                  <SelectItem value="stock">Stock</SelectItem>
                  <SelectItem value="business">Business</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description..."
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Date (optional)</Label>
              <Input
                type="date"
                value={purchaseDate}
                onChange={(e) => setPurchaseDate(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Cost (KES)</Label>
                <Input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  min="0"
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Current Value (KES)</Label>
                <Input
                  type="number"
                  value={currentValue}
                  onChange={(e) => setCurrentValue(e.target.value)}
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Additional notes..."
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editingId ? "Update" : "Add Investment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
