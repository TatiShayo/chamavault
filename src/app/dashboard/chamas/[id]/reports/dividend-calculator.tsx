"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface DividendRow {
  memberId: string;
  fullName: string;
  shareUnits: number;
  dividendAmount: number;
}

interface DividendData {
  year: number;
  totalContributions: number;
  totalRepayments: number;
  totalExpenses: number;
  distributableProfit: number;
  totalUnits: number;
  members: DividendRow[];
}

const YEARS = Array.from(
  { length: 5 },
  (_, i) => new Date().getFullYear() - i
);

export function DividendCalculator({
  chamaId,
  isOfficer,
  formatKES,
}: {
  chamaId: string;
  isOfficer: boolean;
  formatKES: (n: number) => string;
}) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState<DividendData | null>(null);
  const [loading, setLoading] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const [distributed, setDistributed] = useState(false);

  const fetchDividends = async (selectedYear: string) => {
    setLoading(true);
    const res = await fetch(
      `/api/chamas/${chamaId}/dividends?year=${selectedYear}`
    );
    if (res.ok) {
      setData(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchDividends(year);
  }, [year]);

  const handleDistribute = async () => {
    if (!data) return;
    setDistributing(true);

    const res = await fetch(`/api/chamas/${chamaId}/dividends`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year: Number(year) }),
    });

    if (res.ok) {
      setDistributed(true);
    }
    setDistributing(false);
  };

  return (
    <div>
      <div className="mb-6 overflow-hidden rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-indigo-600 p-6 text-white shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-48">
                <Select value={year} onValueChange={(v) => { if (v) { setYear(v); setDistributed(false); } }}>
                  <SelectTrigger className="bg-white/10 border-white/20 text-white [&>svg]:text-white/60">
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEARS.map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {data && (
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <p className="text-white/70">Contributions</p>
                  <p className="font-semibold">{formatKES(data.totalContributions)}</p>
                </div>
                <div>
                  <p className="text-white/70">Repayments</p>
                  <p className="font-semibold">{formatKES(data.totalRepayments)}</p>
                </div>
                <div>
                  <p className="text-white/70">Expenses</p>
                  <p className="font-semibold">{formatKES(data.totalExpenses)}</p>
                </div>
                <div>
                  <p className="text-white/70">Distributable</p>
                  <p className="font-semibold">
                    {formatKES(data.distributableProfit)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-white/70">Total Units</p>
            <p className="text-2xl font-bold">
              {data ? data.totalUnits : "—"}
            </p>
            {isOfficer && data && data.distributableProfit > 0 && !distributed && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 border-white/20 text-white hover:bg-white/10 hover:text-white"
                onClick={handleDistribute}
                disabled={distributing}
              >
                {distributing ? "Distributing..." : "Distribute"}
              </Button>
            )}
            {distributed && (
              <Badge className="mt-2 bg-emerald-500 text-white">Distributed</Badge>
            )}
          </div>
        </div>
      </div>

      {loading && (
        <p className="py-8 text-center text-muted-foreground">Calculating...</p>
      )}

      {data && !loading && (
        <div className="overflow-hidden rounded-lg border bg-white dark:bg-zinc-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-2.5 text-left font-medium">Member</th>
                <th className="px-4 py-2.5 text-right font-medium">Share Units</th>
                <th className="px-4 py-2.5 text-right font-medium">Dividend (KES)</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.members.length === 0 && (
                <tr>
                  <td
                    colSpan={3}
                    className="px-4 py-8 text-center text-muted-foreground"
                  >
                    No members found.
                  </td>
                </tr>
              )}
              {data.members.map((m) => (
                <tr key={m.memberId} className="hover:bg-muted/30">
                  <td className="px-4 py-2.5 font-medium">{m.fullName}</td>
                  <td className="px-4 py-2.5 text-right text-muted-foreground">
                    {m.shareUnits}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                    {formatKES(m.dividendAmount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
