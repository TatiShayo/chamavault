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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, ThumbsUp, ThumbsDown, MinusCircle } from "lucide-react";

interface Tally {
  yes: number;
  no: number;
  abstain: number;
  total: number;
}

interface Resolution {
  id: string;
  resolutionText: string;
  createdAt: string;
  closesAt: string | null;
  open: boolean;
  tally: Tally;
  totalMembers: number;
  userVote: string | null;
}

export function VotingSystem({
  chamaId,
  isOfficer,
}: {
  chamaId: string;
  isOfficer: boolean;
}) {
  const [resolutions, setResolutions] = useState<Resolution[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResolutions = async () => {
    const res = await fetch(`/api/chamas/${chamaId}/votes`);
    if (res.ok) {
      const data = await res.json();
      setResolutions(data.resolutions);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchResolutions();
  }, [chamaId]);

  const handleCreate = async () => {
    if (!title) {
      setError("Title is required");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/chamas/${chamaId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resolutionText: description
          ? `${title} — ${description}`
          : title,
        closesAt: deadline
          ? new Date(deadline).toISOString()
          : null,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to create resolution");
      setSaving(false);
      return;
    }

    const { resolution } = await res.json();
    setResolutions((prev) => [resolution, ...prev]);
    setCreateOpen(false);
    setTitle("");
    setDescription("");
    setDeadline("");
    setSaving(false);
  };

  const handleVote = async (voteId: string, value: string) => {
    const res = await fetch(`/api/chamas/${chamaId}/votes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voteId, voteValue: value }),
    });

    if (!res.ok) return;

    setResolutions((prev) =>
      prev.map((r) => {
        if (r.id !== voteId) return r;

        const oldVote = r.userVote;
        const newTally = { ...r.tally };

        if (oldVote) {
          newTally[oldVote as "yes" | "no" | "abstain"] -= 1;
        } else {
          newTally.total += 1;
        }

        if (oldVote !== value) {
          newTally[value as "yes" | "no" | "abstain"] += 1;
        }

        return { ...r, tally: newTally, userVote: value };
      })
    );
  };

  const renderBar = (count: number, total: number, color: string) => {
    const pct = total > 0 ? (count / total) * 100 : 0;
    return (
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-all ${color}`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-xs font-medium tabular-nums w-8 text-right">
          {count}
        </span>
      </div>
    );
  };

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Loading resolutions...</p>;
  }

  return (
    <div>
      {isOfficer && (
        <div className="mb-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              setTitle("");
              setDescription("");
              setDeadline("");
              setError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            New Resolution
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {resolutions.length === 0 && (
          <p className="py-8 text-center text-muted-foreground">
            No resolutions yet.
          </p>
        )}
        {resolutions.map((r) => (
          <div
            key={r.id}
            className="rounded-lg border bg-white p-4 dark:bg-zinc-900"
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-medium">{r.resolutionText}</h3>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant={r.open ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {r.open ? "Open" : "Closed"}
                  </Badge>
                  {r.closesAt && (
                    <span className="text-xs text-muted-foreground">
                      Closes{" "}
                      {new Date(r.closesAt).toLocaleDateString("en-KE", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <span className="text-xs text-muted-foreground">
                {r.tally.total}/{r.totalMembers} voted
              </span>
            </div>

            <div className="mb-3 space-y-1.5">
              {renderBar(r.tally.yes, r.tally.total, "bg-emerald-500")}
              {renderBar(r.tally.no, r.tally.total, "bg-red-500")}
              {renderBar(r.tally.abstain, r.tally.total, "bg-amber-400")}
            </div>

            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="text-emerald-600 dark:text-emerald-400">
                Yes: {r.tally.yes}
              </span>
              <span>•</span>
              <span className="text-red-600 dark:text-red-400">
                No: {r.tally.no}
              </span>
              <span>•</span>
              <span className="text-amber-600 dark:text-amber-400">
                Abstain: {r.tally.abstain}
              </span>
            </div>

            {r.open && (
              <div className="mt-3 flex gap-2 border-t pt-3">
                <Button
                  size="sm"
                  variant={r.userVote === "yes" ? "default" : "outline"}
                  className="flex-1 gap-1"
                  onClick={() => handleVote(r.id, "yes")}
                >
                  <ThumbsUp className="size-3.5" />
                  Yes
                </Button>
                <Button
                  size="sm"
                  variant={r.userVote === "no" ? "default" : "outline"}
                  className="flex-1 gap-1"
                  onClick={() => handleVote(r.id, "no")}
                >
                  <ThumbsDown className="size-3.5" />
                  No
                </Button>
                <Button
                  size="sm"
                  variant={r.userVote === "abstain" ? "default" : "outline"}
                  className="flex-1 gap-1"
                  onClick={() => handleVote(r.id, "abstain")}
                >
                  <MinusCircle className="size-3.5" />
                  Abstain
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Create Resolution</DialogTitle>
            <DialogDescription>
              Propose a resolution for members to vote on.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Increase monthly contribution to KES 1,000"
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Why is this needed?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Voting Deadline (optional)</Label>
              <Input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create Resolution"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
