import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { dateInputValue, timeInputValue, combineDateTime } from "@/lib/format";

const EMPTY = {
  title: "",
  description: "",
  area_id: "none",
  date: "",
  start: "09:00",
  end: "10:00",
  location: "",
  meeting_link: "",
  prep_min: "",
  travel_min: "",
};

export function EventSheet({ open, onOpenChange, event, areas = [], onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (event) {
      setForm({
        title: event.title || "",
        description: event.description || "",
        area_id: event.area_id || "none",
        date: dateInputValue(event.start_at),
        start: timeInputValue(event.start_at),
        end: timeInputValue(event.end_at),
        location: event.location || "",
        meeting_link: event.meeting_link || "",
        prep_min: event.prep_min ? String(event.prep_min) : "",
        travel_min: event.travel_min ? String(event.travel_min) : "",
      });
    } else {
      const today = new Date();
      setForm({ ...EMPTY, date: dateInputValue(today) });
    }
  }, [open, event]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.title.trim()) {
      setError("Give the appointment a name.");
      return;
    }
    setSaving(true);
    try {
      const start = combineDateTime(form.date || new Date(), form.start);
      const end = combineDateTime(form.date || new Date(), form.end);
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        area_id: form.area_id === "none" ? "" : form.area_id,
        start_at: start,
        end_at: new Date(end) < new Date(start) ? new Date(new Date(start).getTime() + 3600000).toISOString() : end,
        location: form.location.trim(),
        meeting_link: form.meeting_link.trim(),
        prep_min: form.prep_min ? Number(form.prep_min) : 0,
        travel_min: form.travel_min ? Number(form.travel_min) : 0,
      };
      if (event?.id) await base44.entities.Event.update(event.id, payload);
      else await base44.entities.Event.create({ ...payload, recurrence: "none", all_day: false });
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Could not save that event.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!event?.id) return;
    setSaving(true);
    try {
      await base44.entities.Event.delete(event.id);
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {event ? "Edit appointment" : "New appointment"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="event-title">What is it?</Label>
            <Input
              id="event-title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Call with Dr. Alvarez"
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Label htmlFor="event-date">Date</Label>
              <Input
                id="event-date"
                type="date"
                value={form.date}
                onChange={(e) => set({ date: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="event-start">Start</Label>
              <Input
                id="event-start"
                type="time"
                value={form.start}
                onChange={(e) => set({ start: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="event-end">End</Label>
              <Input
                id="event-end"
                type="time"
                value={form.end}
                onChange={(e) => set({ end: e.target.value })}
                className="mt-1.5"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="event-area">Life area</Label>
              <Select value={form.area_id} onValueChange={(v) => set({ area_id: v })}>
                <SelectTrigger id="event-area" className="mt-1.5">
                  <SelectValue placeholder="Unsorted" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unsorted</SelectItem>
                  {areas.map((area) => (
                    <SelectItem key={area.id} value={area.id}>
                      {area.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="event-location">Location</Label>
              <Input
                id="event-location"
                value={form.location}
                onChange={(e) => set({ location: e.target.value })}
                placeholder="Phone, clinic, home…"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="event-prep">Prep time (min)</Label>
              <Input
                id="event-prep"
                type="number"
                min="0"
                step="5"
                value={form.prep_min}
                onChange={(e) => set({ prep_min: e.target.value })}
                placeholder="15"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="event-travel">Travel time (min)</Label>
              <Input
                id="event-travel"
                type="number"
                min="0"
                step="5"
                value={form.travel_min}
                onChange={(e) => set({ travel_min: e.target.value })}
                placeholder="20"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="event-link">Meeting link</Label>
            <Input
              id="event-link"
              value={form.meeting_link}
              onChange={(e) => set({ meeting_link: e.target.value })}
              placeholder="https://"
              className="mt-1.5"
            />
          </div>

          <div>
            <Label htmlFor="event-notes">Notes</Label>
            <Textarea
              id="event-notes"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={2}
              placeholder="Anything you need to remember about it."
              className="mt-1.5"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {event ? (
            <Button
              type="button"
              variant="ghost"
              onClick={remove}
              disabled={saving}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="mr-1.5 h-4 w-4" aria-hidden="true" />
              Delete
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : event ? "Save changes" : "Add event"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}