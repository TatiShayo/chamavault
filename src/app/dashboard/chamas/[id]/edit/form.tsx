"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Upload, Trash2, ExternalLink } from "lucide-react";

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
    constitution_url?: string | null;
    constitution_name?: string | null;
  };
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [constitutionUrl, setConstitutionUrl] = useState<string | null>(
    chama.constitution_url || null
  );
  const [constitutionName, setConstitutionName] = useState<string | null>(
    chama.constitution_name || null
  );
  const [uploading, setUploading] = useState(false);

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

  const handleUpload = async () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`/api/chamas/${chamaId}/constitution`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to upload constitution");
      setUploading(false);
      return;
    }

    const data = await res.json();
    setConstitutionUrl(data.url);
    setConstitutionName(data.name);
    setUploading(false);

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDelete = async () => {
    setUploading(true);
    setError(null);

    const res = await fetch(`/api/chamas/${chamaId}/constitution`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to remove constitution");
      setUploading(false);
      return;
    }

    setConstitutionUrl(null);
    setConstitutionName(null);
    setUploading(false);
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

      <div className="border-t pt-4">
        <Label className="mb-2 block">Chama Constitution (PDF)</Label>

        {constitutionUrl ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-primary" />
              <span className="truncate flex-1">{constitutionName || "constitution.pdf"}</span>
            </div>
            <div className="mt-2 flex gap-2">
              <a
                href={constitutionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary underline hover:no-underline"
              >
                <ExternalLink className="size-3" />
                View
              </a>
              <button
                type="button"
                onClick={handleDelete}
                disabled={uploading}
                className="inline-flex items-center gap-1 text-xs text-destructive underline hover:no-underline"
              >
                <Trash2 className="size-3" />
                {uploading ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUpload}
              disabled={uploading}
            >
              <Upload className="size-4" />
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="submit" className="w-full" disabled={saving}>
        {saving ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
