"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Download } from "lucide-react";

export function AnnualReport({
  chamaId,
  isOfficer,
}: {
  chamaId: string;
  isOfficer: boolean;
}) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);

  const handleDownload = () => {
    window.open(`/api/chamas/${chamaId}/annual-report?year=${year}`, "_blank");
  };

  if (!isOfficer) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">
            Only officers can generate the annual report.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex-1 space-y-2">
            <p className="text-sm text-muted-foreground">
              Generate a comprehensive annual report with treasury summary, member compliance, loans, expenses, and investments.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24"
              min={2020}
              max={2030}
            />
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="size-4" />
              Download
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
