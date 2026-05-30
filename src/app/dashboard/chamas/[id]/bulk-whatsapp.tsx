"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { contributionReminder } from "@/lib/whatsapp";
import { toast } from "sonner";

interface Member {
  id: string;
  full_name: string;
  user_id: string;
}

interface ContributionStatus {
  member_id: string;
  amount_paid: number;
  amount_due: number;
  month_year: string;
  paid_at: string | null;
}

export function BulkWhatsApp({
  chamaId,
  members,
  chamaName,
  contributionAmount,
}: {
  chamaId: string;
  members: Member[];
  chamaName: string;
  contributionAmount: number;
}) {
  const [sending, setSending] = useState(false);

  const handleSendAll = async () => {
    setSending(true);
    try {
      // Get current month's contribution status
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

      const res = await fetch(
        `/api/chamas/${chamaId}/contributions?from=${currentMonth}&to=${currentMonth}`
      );
      const body = await res.json();
      const contribs: ContributionStatus[] = body.contributions || [];

      const paidMemberIds = new Set(
        contribs
          .filter((c) => c.paid_at)
          .map((c) => c.member_id)
      );

      const unpaid = members.filter((m) => !paidMemberIds.has(m.id));

      if (unpaid.length === 0) {
        toast.success("All members have paid this month!");
        return;
      }

      toast.info(`Opening ${unpaid.length} WhatsApp reminders...`);

      // Open WhatsApp links one by one (browsers block multiple popups)
      for (let i = 0; i < unpaid.length; i++) {
        const member = unpaid[i];
        const link = contributionReminder(
          member.full_name,
          chamaName,
          contributionAmount
        );
        // Open in new tab with slight delay to avoid popup blocking
        setTimeout(() => {
          window.open(link, "_blank");
        }, i * 500);
      }
    } catch {
      toast.error("Failed to check contribution status");
    } finally {
      setSending(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSendAll}
      disabled={sending}
      className="gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800"
    >
      <Send className="size-3.5" />
      {sending ? "Sending..." : "Send All Reminders"}
    </Button>
  );
}
