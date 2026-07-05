"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Users } from "lucide-react";

const ROLES = [
  { value: "chairperson", label: "Chairperson" },
  { value: "vice_chair", label: "Vice Chair" },
  { value: "treasurer", label: "Treasurer" },
  { value: "secretary", label: "Secretary" },
  { value: "director", label: "Director" },
  { value: "supervisory_committee", label: "Supervisory Committee" },
];

interface BoardMember {
  id: string;
  full_name: string;
  role: string;
  appointed_date: string;
  term_expiry: string | null;
  status: string;
}

export function BoardMembersManager({ chamaId }: { chamaId: string }) {
  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("director");
  const [newAppointed, setNewAppointed] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newTermExpiry, setNewTermExpiry] = useState("");

  const fetchMembers = useCallback(async () => {
    const res = await fetch(`/api/chamas/${chamaId}/board-members`);
    if (res.ok) {
      const data = await res.json();
      setMembers(data.board_members);
    }
    setLoading(false);
  }, [chamaId]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const addMember = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/chamas/${chamaId}/board-members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: newName.trim(),
        role: newRole,
        appointed_date: newAppointed,
        term_expiry: newTermExpiry || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to add board member");
      setSaving(false);
      return;
    }

    setNewName("");
    setNewRole("director");
    setNewTermExpiry("");
    await fetchMembers();
    setSaving(false);
  };

  const removeMember = async (memberId: string) => {
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/chamas/${chamaId}/board-members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ boardMemberId: memberId }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to remove board member");
      setSaving(false);
      return;
    }

    await fetchMembers();
    setSaving(false);
  };

  const active = members.filter((m) => m.status === "active");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-4 text-amber-500" />
        <span className="font-semibold">Board Members ({active.length})</span>
      </div>

      {active.length > 0 && (
        <div className="rounded-lg border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Name</th>
                <th className="px-3 py-2 text-left font-medium">Role</th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">
                  Appointed
                </th>
                <th className="px-3 py-2 text-left font-medium hidden md:table-cell">
                  Term Expiry
                </th>
                <th className="px-3 py-2 w-10" />
              </tr>
            </thead>
            <tbody>
              {active.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2">{m.full_name}</td>
                  <td className="px-3 py-2">
                    <span className="inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {m.role.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                    {new Date(m.appointed_date).toLocaleDateString("en-KE")}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground hidden md:table-cell">
                    {m.term_expiry
                      ? new Date(m.term_expiry).toLocaleDateString("en-KE")
                      : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      disabled={saving}
                      className="text-destructive hover:text-destructive/80"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {active.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">
          No board members added yet. SACCO regulations require at least 5 board members.
        </p>
      )}

      <div className="rounded-lg border border-dashed p-4 space-y-3">
        <p className="text-sm font-medium">Add Board Member</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Full Name</Label>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g. Jane Wanjiku"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Role</Label>
            <Select value={newRole} onValueChange={(v) => v && setNewRole(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Appointed Date</Label>
            <Input
              type="date"
              value={newAppointed}
              onChange={(e) => setNewAppointed(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Term Expiry (optional)</Label>
            <Input
              type="date"
              value={newTermExpiry}
              onChange={(e) => setNewTermExpiry(e.target.value)}
            />
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={addMember}
          disabled={saving || !newName.trim()}
        >
          <Plus className="size-4" />
          Add Member
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
