"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Download } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
}

export function MonthlyStatement({
  chamaId,
  members,
  isOfficer,
}: {
  chamaId: string;
  members: Member[];
  isOfficer: boolean;
}) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");

  const handleDownload = () => {
    const memberId = selectedMemberId;
    if (!memberId) return;

    const url = `/api/chamas/${chamaId}/statement?memberId=${memberId}&period=Last 12 months`;
    window.open(url, "_blank");
  };

  const handleMyStatement = () => {
    window.open(`/api/chamas/${chamaId}/statement?period=Last 12 months`, "_blank");
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">
              Download a PDF statement showing contributions, loans, and fines.
            </p>
          </div>
          <div className="flex gap-2">
            {isOfficer && (
              <div className="flex items-center gap-2">
                <Select value={selectedMemberId} onValueChange={(v) => { if (v) setSelectedMemberId(v); }}>
                  <SelectTrigger className="w-48">
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
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!selectedMemberId}
                  onClick={handleDownload}
                >
                  <Download className="size-4" />
                  Download
                </Button>
              </div>
            )}
            <Button variant="default" size="sm" onClick={handleMyStatement}>
              <FileText className="size-4" />
              My Statement
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
