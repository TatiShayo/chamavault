"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, MessageCircle, FileText } from "lucide-react";
import { contributionReminder, meetingReminder } from "@/lib/whatsapp";
import { toast } from "sonner";

interface Member {
  id: string;
  user_id: string;
  full_name: string;
  role: string;
  joined_at: string;
  phone: string;
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
  chamaName,
  contributionAmount,
  meetingDay,
}: {
  chamaId: string;
  members: Member[];
  currentUserRole: string;
  chamaName: string;
  contributionAmount: number;
  meetingDay: string;
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

  const handleWhatsAppContribution = (member: Member) => {
    const link = contributionReminder(member.full_name, chamaName, contributionAmount);
    window.open(link, "_blank");
  };

  const handleWhatsAppMeeting = (member: Member) => {
    const link = meetingReminder(member.full_name, chamaName, meetingDay);
    window.open(link, "_blank");
  };

  const handleEmailContribution = async (member: Member) => {
    const now = new Date();
    const monthLabel = now.toLocaleDateString("en-KE", { month: "long", year: "numeric" });

    try {
      const res = await fetch(`/api/chamas/${chamaId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "contribution",
          memberId: member.id,
          monthLabel,
        }),
      });

      const body = await res.json();
      if (res.ok) {
        toast.success(`Contribution reminder emailed to ${member.full_name}`);
      } else {
        toast.error(body.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
    }
  };

  const handleEmailMeeting = async (member: Member) => {
    try {
      const res = await fetch(`/api/chamas/${chamaId}/notifications`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "meeting",
          memberId: member.id,
          meetingId: "latest",
        }),
      });

      const body = await res.json();
      if (res.ok) {
        toast.success(`Meeting reminder emailed to ${member.full_name}`);
      } else {
        toast.error(body.error || "Failed to send email");
      }
    } catch {
      toast.error("Failed to send email");
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
              <div className="flex items-center gap-1">
                {isOfficer && (
                  <div className="flex gap-0.5">
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-7 text-orange-600 hover:text-orange-700 dark:text-orange-400"
                      title="Download statement PDF"
                      onClick={() =>
                        window.open(`/api/chamas/${chamaId}/statement?memberId=${member.id}`, "_blank")
                      }
                    >
                      <FileText className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-7 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                      title="Send WhatsApp contribution reminder"
                      onClick={() => handleWhatsAppContribution(member)}
                    >
                      <MessageCircle className="size-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="size-7 text-blue-600 hover:text-blue-700 dark:text-blue-400"
                      title="Send email contribution reminder"
                      onClick={() => handleEmailContribution(member)}
                    >
                      <Mail className="size-3" />
                    </Button>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  {isOfficer && currentUserRole === "chairperson" ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) => {
                        if (v) handleRoleChange(member.id, v);
                      }}
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
                  ) : isOfficer &&
                    (currentUserRole === "treasurer" ||
                      currentUserRole === "secretary") ? (
                    <Select
                      value={member.role}
                      onValueChange={(v) => {
                        if (v) handleRoleChange(member.id, v);
                      }}
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
                    <Badge
                      variant={roleColors[member.role] || "secondary"}
                      className="capitalize"
                    >
                      {member.role}
                    </Badge>
                  )}
                </div>
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
