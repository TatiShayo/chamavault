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
import { Plus, Trash2 } from "lucide-react";

const CATEGORIES = ["Venue", "Food & Drinks", "Admin", "Transport", "Other"];

const CATEGORY_CLASSES: Record<string, string> = {
  Venue: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  "Food & Drinks": "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  Admin: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  Transport: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  Other: "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-300",
};

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  expenseDate: string;
  receiptUrl: string | null;
  recordedBy: string | null;
  createdAt: string;
}

export function ExpenseTracker({
  chamaId,
  isOfficer,
  formatKES,
}: {
  chamaId: string;
  isOfficer: boolean;
  formatKES: (n: number) => string;
}) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [monthTotal, setMonthTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = async () => {
    const res = await fetch(`/api/chamas/${chamaId}/expenses`);
    if (res.ok) {
      const data = await res.json();
      setExpenses(data.expenses);
      setMonthTotal(data.monthTotal);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchExpenses();
  }, [chamaId]);

  const handleAddExpense = async () => {
    if (!description || !amount || !category || !expenseDate) {
      setError("Please fill all required fields");
      return;
    }
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append("description", description);
    formData.append("amount", amount);
    formData.append("category", category);
    formData.append("expenseDate", expenseDate);
    if (receiptFile) {
      formData.append("receipt", receiptFile);
    }

    const res = await fetch(`/api/chamas/${chamaId}/expenses`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to add expense");
      setSaving(false);
      return;
    }

    const { expense } = await res.json();
    setExpenses((prev) => [expense, ...prev]);
    setMonthTotal((prev) => prev + Number(amount));
    setDialogOpen(false);
    setDescription("");
    setAmount("");
    setCategory("");
    setExpenseDate(new Date().toISOString().slice(0, 10));
    setReceiptFile(null);
    setSaving(false);
  };

  const handleDelete = async (expenseId: string, expenseAmount: number) => {
    const res = await fetch(`/api/chamas/${chamaId}/expenses`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expenseId }),
    });

    if (!res.ok) return;

    setExpenses((prev) => prev.filter((e) => e.id !== expenseId));
    const deleted = expenses.find((e) => e.id === expenseId);
    if (deleted) {
      const d = new Date(deleted.expenseDate);
      const now = new Date();
      if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
        setMonthTotal((prev) => prev - expenseAmount);
      }
    }
  };

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Loading expenses...</p>;
  }

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 p-4 sm:p-6 text-white shadow-lg">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs sm:text-sm font-medium text-white/80">Expenses This Month</p>
            <p className="text-2xl sm:text-3xl font-bold tracking-tight">
              {formatKES(monthTotal)}
            </p>
          </div>
          {isOfficer && (
            <Button
              variant="outline"
              size="sm"
              className="border-white/20 text-white hover:bg-white/10 hover:text-white text-xs sm:text-sm self-start sm:self-auto"
              onClick={() => {
                setDescription("");
                setAmount("");
                setCategory("");
                setExpenseDate(new Date().toISOString().slice(0, 10));
                setReceiptFile(null);
                setError(null);
                setDialogOpen(true);
              }}
            >
              <Plus className="size-4" />
              Add Expense
            </Button>
          )}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium">Date</th>
              <th className="px-4 py-2.5 text-left font-medium">Description</th>
              <th className="px-4 py-2.5 text-left font-medium">Category</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
              <th className="px-4 py-2.5 text-left font-medium">Recorded By</th>
              <th className="px-4 py-2.5 text-left font-medium">Receipt</th>
              {isOfficer && (
                <th className="px-4 py-2.5 text-right font-medium">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y">
            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={isOfficer ? 7 : 6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No expenses recorded yet.
                </td>
              </tr>
            )}
            {expenses.map((expense) => (
              <tr key={expense.id} className="hover:bg-muted/30">
                <td className="px-4 py-2.5 text-muted-foreground">
                  {new Date(expense.expenseDate).toLocaleDateString("en-KE", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </td>
                <td className="px-4 py-2.5 font-medium">
                  {expense.description}
                </td>
                <td className="px-4 py-2.5">
                  <Badge
                    variant="outline"
                    className={`text-xs ${CATEGORY_CLASSES[expense.category] || CATEGORY_CLASSES.Other}`}
                  >
                    {expense.category}
                  </Badge>
                </td>
                <td className="px-4 py-2.5 text-right font-medium">
                  {formatKES(Number(expense.amount))}
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">
                  {expense.recordedBy || "—"}
                </td>
                <td className="px-4 py-2.5">
                  {expense.receiptUrl ? (
                    <a
                      href={expense.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 underline hover:text-blue-800 dark:text-blue-400"
                    >
                      View
                    </a>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                {isOfficer && (
                  <td className="px-4 py-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(expense.id, Number(expense.amount))}
                    >
                      <Trash2 className="size-3" />
                    </Button>
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
            <DialogTitle>Add Expense</DialogTitle>
            <DialogDescription>
              Record a new chama expense.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What was the expense for?"
              />
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
              <Label>Category</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Receipt (optional)</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddExpense} disabled={saving}>
                {saving ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
