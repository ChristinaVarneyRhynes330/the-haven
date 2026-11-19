import { useEffect, useState } from "react";
import { Archive, EyeOff, Trash2 } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { AreaIcon } from "@/components/shared/AreaIcon";
import { LIFE_AREA_TONES } from "@/lib/design";
import { areaDot } from "@/lib/design";
import { cn } from "@/lib/utils";
import { AREA_ICON_KEYS } from "@/components/shared/AreaIcon";

const EMPTY = { name: "", description: "", tone: "sage", icon: "circle", hidden: false };

export function LifeAreaSheet({ open, onOpenChange, area, onSaved }) {
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setError("");
    if (area) {
      setForm({
        name: area.name || "",
        description: area.description || "",
        tone: area.tone || "sage",
        icon: area.icon || "circle",
        hidden: !!area.hidden,
      });
    } else {
      setForm(EMPTY);
    }
  }, [open, area]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.name.trim()) {
      setError("Give the area a name.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        tone: form.tone,
        icon: form.icon,
        hidden: form.hidden,
        archived: false,
      };
      if (area?.id) await base44.entities.LifeArea.update(area.id, payload);
      else await base44.entities.LifeArea.create(payload);
      onSaved?.();
      onOpenChange(false);
    } catch (err) {
      setError(err?.message || "Could not save that area.");
    } finally {
      setSaving(false);
    }
  };

  const archive = async () => {
    if (!area?.id) return;
    setSaving(true);
    try {
      await base44.entities.LifeArea.update(area.id, { archived: true });
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!area?.id) return;
    setSaving(true);
    try {
      await base44.entities.LifeArea.delete(area.id);
      onSaved?.();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {area ? "Edit life area" : "New life area"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="area-name">Name</Label>
            <Input
              id="area-name"
              value={form.name}
              onChange={(e) => set({ name: e.target.value })}
              placeholder="Home, Work, Health…"
              className="mt-1.5"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="area-desc">What lives here?</Label>
            <Textarea
              id="area-desc"
              value={form.description}
              onChange={(e) => set({ description: e.target.value })}
              rows={2}
              placeholder="Optional — one line is plenty."
              className="mt-1.5"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-medium">Colour</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {LIFE_AREA_TONES.map((tone) => (
                <button
                  key={tone}
                  type="button"
                  aria-label={tone}
                  aria-pressed={form.tone === tone}
                  onClick={() => set({ tone })}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-full border-2 transition-colors",
                    form.tone === tone ? "border-foreground/60" : "border-transparent"
                  )}
                >
                  <span className={cn("h-5 w-5 rounded-full", areaDot(tone))} aria-hidden="true" />
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-medium">Icon</legend>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {AREA_ICON_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  aria-label={key}
                  aria-pressed={form.icon === key}
                  onClick={() => set({ icon: key })}
                  className={cn(
                    "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
                    form.icon === key
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/70 text-muted-foreground hover:text-foreground"
                  )}
                >
                  <AreaIcon name={key} className="h-4 w-4" />
                </button>
              ))}
            </div>
          </fieldset>

          <div className="flex items-center justify-between rounded-xl border border-border/70 p-3">
            <div className="flex items-center gap-2">
              <EyeOff className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Hide from lists</p>
                <p className="text-xs text-muted-foreground">Keeps its history, just out of the way.</p>
              </div>
            </div>
            <Switch
              checked={form.hidden}
              onCheckedChange={(checked) => set({ hidden: checked })}
              aria-label="Hide this life area"
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {area ? (
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={archive}
                disabled={saving}
                className="gap-1.5 text-muted-foreground"
              >
                <Archive className="h-3.5 w-3.5" aria-hidden="true" />
                Archive
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={remove}
                disabled={saving}
                className="gap-1.5 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Delete
              </Button>
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={save} disabled={saving}>
              {saving ? "Saving…" : area ? "Save" : "Add area"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}