"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  joined_at: string;
}

const roleColors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  chairperson: "default",
  treasurer: "secondary",
  secretary: "outline",
  member: "secondary",
};

export function MemberList({
  chamaId,
  members: initialMembers,
  currentUserRole,
}: {
  chamaId: string;
  members: Member[];
  currentUserRole: string;
}) {
  const [members, setMembers] = useState(initialMembers);
  const [updating, setUpdating] = useState<string | null>(null);
  const isOfficer = ["chairperson", "treasurer", "secretary"].includes(currentUserRole);

  const handleRoleChange = async (memberId: string, newRole: string) => {
    setUpdating(memberId);
    try {
      const res = await fetch(`/api/chamas/${chamaId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });

      if (!res.ok) {
        const body = await res.json();
        alert(body.error || "Failed to update role");
        return;
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
      );
    } catch {
      alert("Failed to update role. Please try again.");
    } finally {
      setUpdating(null);
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {members.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-8 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
                  {member.full_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)}
                </div>
                <div>
                  <p className="text-sm font-medium">{member.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Joined{" "}
                    {new Date(member.joined_at).toLocaleDateString("en-KE", {
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {isOfficer && currentUserRole === "chairperson" ? (
                  <Select
                    value={member.role}
                    onValueChange={(v) => { if (v) handleRoleChange(member.id, v); }}
                    disabled={updating === member.id}
                  >
                    <SelectTrigger size="sm" className="h-7 text-xs min-w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="chairperson">Chairperson</SelectItem>
                      <SelectItem value="treasurer">Treasurer</SelectItem>
                      <SelectItem value="secretary">Secretary</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                ) : isOfficer && (currentUserRole === "treasurer" || currentUserRole === "secretary") ? (
                  <Select
                    value={member.role}
                    onValueChange={(v) => { if (v) handleRoleChange(member.id, v); }}
                    disabled={updating === member.id}
                  >
                    <SelectTrigger size="sm" className="h-7 text-xs min-w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="secretary">Secretary</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge variant={roleColors[member.role] || "secondary"} className="capitalize">
                    {member.role}
                  </Badge>
                )}
                {updating === member.id && (
                  <span className="text-xs text-muted-foreground">Saving...</span>
                )}
              </div>
            </div>
          ))}
        </div>
        {members.length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            No members yet.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
