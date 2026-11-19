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
import { dateInputValue } from "@/lib/format";
import { ENERGY_LEVELS, PRIORITY_GROUPS } from "@/lib/design";

const EMPTY = {
  title: "",
  description: "",
  area_id: "none",
  priority: "should",
  energy: "moderate",
  due_date: "",
  estimate_min: "",
  waiting_on: "",
};

export function TaskSheet({ open, onOpenChange, task, areas = [], defaultAreaId, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        area_id: task.area_id || "none",
        priority: task.priority || "should",
        energy: task.energy || "moderate",
        due_date: dateInputValue(task.due_date),
        estimate_min: task.estimate_min ? String(task.estimate_min) : "",
        waiting_on: task.waiting_on || "",
      });
    } else {
      // New work is usually today's work — the date stays editable.
      setForm({
        ...EMPTY,
        area_id: defaultAreaId || "none",
        due_date: dateInputValue(new Date()),
      });
    }
  }, [open, task, defaultAreaId]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSave = async () => {
    if (!form.title.trim()) {
      setError("Give it a name so you can recognise it later.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        area_id: form.area_id === "none" ? "" : form.area_id,
        priority: form.priority,
        energy: form.energy,
        due_date: form.due_date ? new Date(`${form.due_date}T09:00:00`).toISOString() : "",
        estimate_min: form.estimate_min ? Number(form.estimate_min) : 0,
        waiting_on: form.waiting_on.trim(),
      };
      if (task?.id) {
        await base44.entities.Task.update(task.id, payload);
      } else {
        await base44.entities.Task.create({
          ...payload,
          status: "open",
          source: "manual",
          subtasks: [],
          tags: [],
        });
      }
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Could not save that. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!task?.id) return;
    setSaving(true);
    try {
      await base44.entities.Task.delete(task.id);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Could not delete that.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {task ? "Edit task" : "New task"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="task-title">What needs doing?</Label>
            <Input
              id="task-title"
              value={form.title}
              onChange={(e) => set({ title: e.target.value })}
              placeholder="Send the revised proposal"
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="task-area">Life area</Label>
              <Select value={form.area_id} onValueChange={(v) => set({ area_id: v })}>
                <SelectTrigger id="task-area" className="mt-1.5">
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
              <Label htmlFor="task-priority">Priority</Label>
              <Select value={form.priority} onValueChange={(v) => set({ priority: v })}>
                <SelectTrigger id="task-priority" className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_GROUPS.map((group) => (
                    <SelectItem key={group.id} value={group.id}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="task-due">Due date</Label>
              <Input
                id="task-due"
                type="date"
                value={form.due_date}
                onChange={(e) => set({ due_date: e.target.value })}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="task-estimate">Estimate (minutes)</Label>
              <Input
                id="task-estimate"
                type="number"
                min="0"
                step="5"
                value={form.estimate_min}
                onChange={(e) => set({ estimate_min: e.target.value })}
                placeholder="25"
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="task-energy">Energy it needs</Label>
            <Select value={form.energy} onValueChange={(v) => set({ energy: v })}>
              <SelectTrigger id="task-energy" className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENERGY_LEVELS.map((level) => (
                  <SelectItem key={level.id} value={level.id}>
                    {level.label} — {level.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {form.priority === "waiting" ? (
            <div>
              <Label htmlFor="task-waiting">Waiting on</Label>
              <Input
                id="task-waiting"
                value={form.waiting_on}
                onChange={(e) => set({ waiting_on: e.target.value })}
                placeholder="Sam's contract review"
                className="mt-1.5"
              />
            </div>
          ) : null}

          <div>
            <Label htmlFor="task-notes">Notes</Label>
            <Textarea
              id="task-notes"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              placeholder="Anything you'd otherwise have to keep in your head."
              rows={3}
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
          {task ? (
            <Button
              type="button"
              variant="ghost"
              onClick={handleDelete}
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
            <Button type="button" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : task ? "Save changes" : "Add task"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}