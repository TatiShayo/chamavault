"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function EditChamaForm({
  chamaId,
  chama,
}: {
  chamaId: string;
  chama: {
    name: string;
    founding_date: string;
    objective: string | null;
    bank_account: string | null;
    mpesa_number: string | null;
  };
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const form = new FormData(e.currentTarget);

    const res = await fetch(`/api/chamas/${chamaId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        foundingDate: form.get("foundingDate"),
        objective: form.get("objective"),
        bankAccount: form.get("bankAccount"),
        mpesaNumber: form.get("mpesaNumber"),
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to update chama");
      setSaving(false);
      return;
    }

    router.push(`/dashboard/chamas/${chamaId}`);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Chama Name</Label>
        <Input id="name" name="name" defaultValue={chama.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="foundingDate">Founding Date</Label>
        <Input
          id="foundingDate"
          name="foundingDate"
          type="date"
          defaultValue={chama.founding_date?.split("T")[0] || ""}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="objective">Objective</Label>
        <Textarea
          id="objective"
          name="objective"
          rows={3}
          maxLength={500}
          defaultValue={chama.objective || ""}
          placeholder="e.g. Kuokoleana na kuwekeza pamoja"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bankAccount">Bank Account</Label>
        <Input
          id="bankAccount"
          name="bankAccount"
          defaultValue={chama.bank_account || ""}
          placeholder="Bank name and account number"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="mpesaNumber">M-Pesa Number</Label>
        <Input
          id="mpesaNumber"
          name="mpesaNumber"
          type="tel"
          defaultValue={chama.mpesa_number || ""}
          placeholder="e.g. 0712 345 678"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
