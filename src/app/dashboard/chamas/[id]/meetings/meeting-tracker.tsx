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
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Calendar, Sparkles } from "lucide-react";

interface Member {
  id: string;
  full_name: string;
}

interface Meeting {
  id: string;
  date: string;
  agenda: string | null;
  venue: string | null;
  minutesText: string | null;
  createdAt: string;
  attendance: Record<string, boolean>;
}

export function MeetingTracker({
  chamaId,
  members,
  isOfficer,
}: {
  chamaId: string;
  members: Member[];
  isOfficer: boolean;
}) {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [date, setDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [agenda, setAgenda] = useState("");
  const [venue, setVenue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [attendanceState, setAttendanceState] = useState<Record<string, boolean>>({});
  const [minutesText, setMinutesText] = useState("");
  const [savingMinutes, setSavingMinutes] = useState(false);
  const [generatingMinutes, setGeneratingMinutes] = useState(false);

  const fetchMeetings = async () => {
    const res = await fetch(`/api/chamas/${chamaId}/meetings`);
    if (res.ok) {
      const data = await res.json();
      setMeetings(data.meetings);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchMeetings();
  }, [chamaId]);

  const handleCreate = async () => {
    if (!date) {
      setError("Date is required");
      return;
    }
    setSaving(true);
    setError(null);

    const res = await fetch(`/api/chamas/${chamaId}/meetings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: new Date(date).toISOString(),
        agenda: agenda || null,
        venue: venue || null,
      }),
    });

    if (!res.ok) {
      const body = await res.json();
      setError(body.error || "Failed to create meeting");
      setSaving(false);
      return;
    }

    const { meeting } = await res.json();
    setMeetings((prev) => [
      { ...meeting, minutesText: meeting.minutes_text || null, attendance: {} },
      ...prev,
    ]);
    setCreateOpen(false);
    setDate(new Date().toISOString().slice(0, 10));
    setAgenda("");
    setVenue("");
    setSaving(false);
  };

  const openDetail = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setAttendanceState(meeting.attendance || {});
    setMinutesText(meeting.minutesText || "");
    setDetailOpen(true);
  };

  const handleSaveMinutes = async () => {
    if (!selectedMeeting) return;
    setSavingMinutes(true);

    const res = await fetch(`/api/chamas/${chamaId}/meetings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meetingId: selectedMeeting.id,
        minutesText,
        attendance: attendanceState,
      }),
    });

    if (res.ok) {
      setMeetings((prev) =>
        prev.map((m) =>
          m.id === selectedMeeting.id
            ? { ...m, minutesText, attendance: { ...attendanceState } }
            : m
        )
      );
    }
    setSavingMinutes(false);
    setDetailOpen(false);
  };

  const handleGenerateMinutes = async () => {
    if (!selectedMeeting) return;
    setGeneratingMinutes(true);

    try {
      const present = members
        .filter((m) => attendanceState[m.id])
        .map((m) => m.full_name)
        .join(", ");
      const absent = members
        .filter((m) => !attendanceState[m.id])
        .map((m) => m.full_name)
        .join(", ");

      const res = await fetch("/api/ai/minutes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meetingId: selectedMeeting.id,
          agenda: selectedMeeting.agenda || "No agenda",
          attendance: `Present: ${present || "None"}\nAbsent: ${absent || "None"}`,
          chamaId,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMinutesText(data.minutes);
      } else {
        setMinutesText(
          "## Meeting Minutes\n\n*AI generation unavailable. Please write minutes manually.*"
        );
      }
    } catch {
      setMinutesText(
        "## Meeting Minutes\n\n*AI generation unavailable. Please write minutes manually.*"
      );
    }
    setGeneratingMinutes(false);
  };

  const toggleAttendance = (memberId: string) => {
    setAttendanceState((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const now = new Date();
  const past = meetings.filter((m) => new Date(m.date) < now);
  const upcoming = meetings.filter((m) => new Date(m.date) >= now);

  if (loading) {
    return <p className="py-8 text-center text-muted-foreground">Loading meetings...</p>;
  }

  return (
    <div>
      {isOfficer && (
        <div className="mb-4 flex justify-end">
          <Button
            size="sm"
            onClick={() => {
              setDate(new Date().toISOString().slice(0, 10));
              setAgenda("");
              setVenue("");
              setError(null);
              setCreateOpen(true);
            }}
          >
            <Plus className="size-4" />
            Schedule Meeting
          </Button>
        </div>
      )}

      <div className="grid gap-4">
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
            <Calendar className="size-4" />
            Upcoming ({upcoming.length})
          </h3>
          {upcoming.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No upcoming meetings.
            </p>
          )}
          {upcoming.map((meeting) => (
            <div
              key={meeting.id}
              className="mb-2 rounded-lg border bg-white p-4 dark:bg-zinc-900 cursor-pointer hover:bg-muted/50"
              onClick={() => openDetail(meeting)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {new Date(meeting.date).toLocaleDateString("en-KE", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {meeting.agenda && (
                    <p className="text-sm text-muted-foreground">{meeting.agenda}</p>
                  )}
                  {meeting.venue && (
                    <p className="text-xs text-muted-foreground">
                      📍 {meeting.venue}
                    </p>
                  )}
                </div>
                <Badge variant="outline" className="text-xs">
                  Upcoming
                </Badge>
              </div>
            </div>
          ))}
        </div>

        <div>
          <h3 className="mb-2 text-sm font-semibold text-muted-foreground">
            Past ({past.length})
          </h3>
          {past.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No past meetings.
            </p>
          )}
          {past.map((meeting) => (
            <div
              key={meeting.id}
              className="mb-2 rounded-lg border bg-white p-4 dark:bg-zinc-900 cursor-pointer hover:bg-muted/50"
              onClick={() => openDetail(meeting)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">
                    {new Date(meeting.date).toLocaleDateString("en-KE", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  {meeting.agenda && (
                    <p className="text-sm text-muted-foreground">{meeting.agenda}</p>
                  )}
                  {meeting.venue && (
                    <p className="text-xs text-muted-foreground">
                      📍 {meeting.venue}
                    </p>
                  )}
                </div>
                <Badge
                  variant={meeting.minutesText ? "default" : "secondary"}
                  className="text-xs"
                >
                  {meeting.minutesText ? "Minutes ready" : "No minutes"}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Set date, venue, and agenda for an upcoming meeting.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Venue (optional)</Label>
              <Input
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="e.g. Jane's house"
              />
            </div>
            <div className="space-y-2">
              <Label>Agenda</Label>
              <Textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                placeholder="What will be discussed?"
                rows={3}
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? "Creating..." : "Create Meeting"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Meeting —{" "}
              {selectedMeeting
                ? new Date(selectedMeeting.date).toLocaleDateString("en-KE", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : ""}
            </DialogTitle>
            <DialogDescription>
              {selectedMeeting?.venue && `📍 ${selectedMeeting.venue}`}
            </DialogDescription>
          </DialogHeader>

          {selectedMeeting && (
            <div className="space-y-6">
              {selectedMeeting.agenda && (
                <div>
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Agenda
                  </Label>
                  <p className="mt-1 text-sm whitespace-pre-wrap">{selectedMeeting.agenda}</p>
                </div>
              )}

              <div>
                <Label className="text-xs font-semibold uppercase text-muted-foreground">
                  Attendance
                </Label>
                <div className="mt-2 space-y-2">
                  {members.map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded border px-3 py-2"
                    >
                      <span className="text-sm">{m.full_name}</span>
                      {isOfficer ? (
                        <Switch
                          checked={!!attendanceState[m.id]}
                          onCheckedChange={() => toggleAttendance(m.id)}
                        />
                      ) : (
                        <Badge
                          variant={attendanceState[m.id] ? "default" : "secondary"}
                          className="text-xs"
                        >
                          {attendanceState[m.id] ? "Present" : "Absent"}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label className="text-xs font-semibold uppercase text-muted-foreground">
                    Minutes
                  </Label>
                  {isOfficer && (
                    <Button
                      variant="outline"
                      size="xs"
                      onClick={handleGenerateMinutes}
                      disabled={generatingMinutes}
                    >
                      <Sparkles className="size-3" />
                      {generatingMinutes ? "Generating..." : "Generate with AI"}
                    </Button>
                  )}
                </div>
                {isOfficer ? (
                  <Textarea
                    value={minutesText}
                    onChange={(e) => setMinutesText(e.target.value)}
                    placeholder="Record meeting minutes..."
                    rows={8}
                    className="font-mono text-xs"
                  />
                ) : (
                  <div className="rounded border bg-muted/30 p-3 whitespace-pre-wrap text-sm">
                    {minutesText || "No minutes recorded yet."}
                  </div>
                )}
              </div>

              {isOfficer && (
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setDetailOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveMinutes} disabled={savingMinutes}>
                    {savingMinutes ? "Saving..." : "Save"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
