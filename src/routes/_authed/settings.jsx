import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Download,
  Eye,
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingBlock } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { useProfile } from "@/lib/data";
import { useAuth } from "@/lib/AuthContext";
import { useCollection } from "@/lib/data";
import { dayKey } from "@/lib/format";

const DATA_ENTITIES = [
  "Task",
  "Event",
  "Reminder",
  "Note",
  "BrainDump",
  "Proposal",
  "Checkin",
  "Affirmation",
  "Conversation",
  "AiMemory",
  "LifeArea",
  "Notification",
];

const DEFAULTS = {
  preferred_name: "",
  timezone: "",
  wake_time: "07:00",
  bed_time: "23:00",
  work_start: "09:00",
  work_end: "17:30",
  planning_mode: "priority",
  guidance_style: "gentle",
  list_tolerance: "neutral",
  peak_focus: "morning",
  reminder_style: "gentle",
  morning_flow_enabled: true,
  evening_reset_enabled: true,
  show_affirmations: true,
  notifications_in_app: true,
  notifications_email: false,
  reduced_motion: false,
  larger_text: false,
  ai_personalization_paused: false,
};

export const Route = createFileRoute("/_authed/settings")({
  head: () => ({ meta: [{ title: "Settings · LifeOS" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { profile, loading, save } = useProfile();
  const { user, logout } = useAuth();
  const { items: memories, reload: reloadMemories } = useCollection("AiMemory", { active: true }, { limit: 100 });
  const [form, setForm] = useState(DEFAULTS);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");
  const [newMemory, setNewMemory] = useState("");
  const [working, setWorking] = useState("");

  useEffect(() => {
    if (!profile) return;
    setForm({
      ...DEFAULTS,
      preferred_name: profile.preferred_name || "",
      timezone: profile.timezone || "",
      wake_time: profile.wake_time || "07:00",
      bed_time: profile.bed_time || "23:00",
      work_start: profile.work_start || "09:00",
      work_end: profile.work_end || "17:30",
      planning_mode: profile.planning_mode || "priority",
      guidance_style: profile.guidance_style || "gentle",
      list_tolerance: profile.list_tolerance || "neutral",
      peak_focus: profile.peak_focus || "morning",
      reminder_style: profile.reminder_style || "gentle",
      morning_flow_enabled: profile.morning_flow_enabled !== false,
      evening_reset_enabled: profile.evening_reset_enabled !== false,
      show_affirmations: profile.show_affirmations !== false,
      notifications_in_app: profile.notifications_in_app !== false,
      notifications_email: !!profile.notifications_email,
      reduced_motion: !!profile.reduced_motion,
      larger_text: !!profile.larger_text,
      ai_personalization_paused: !!profile.ai_personalization_paused,
    });
  }, [profile]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));

  const savePreferences = async () => {
    if (!form) return;
    setSaving(true);
    setError("");
    try {
      await save(form);
      setSavedAt(new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }));
    } catch (err) {
      setError(err?.message || "Couldn't save your preferences.");
    } finally {
      setSaving(false);
    }
  };

  const exportData = async () => {
    setWorking("export");
    try {
      const payload = { exported_at: new Date().toISOString(), profile };
      for (const name of DATA_ENTITIES) {
        const result = await base44.entities[name].filter({}, { limit: 1000 });
        payload[name] = Array.isArray(result) ? result : result?.items || [];
      }
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `lifeos-export-${dayKey()}.json`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err?.message || "Export failed.");
    } finally {
      setWorking("");
    }
  };

  const deleteEverything = async () => {
    setWorking("delete");
    try {
      for (const name of DATA_ENTITIES) {
        await base44.entities[name].deleteMany({});
      }
      await base44.auth.logout();
    } catch (err) {
      setError(err?.message || "Could not delete everything.");
      setWorking("");
    }
  };

  const addMemory = async () => {
    if (!newMemory.trim()) return;
    await base44.entities.AiMemory.create({
      content: newMemory.trim(),
      source: "manual",
      active: true,
    });
    setNewMemory("");
    reloadMemories();
  };

  const forgetMemory = async (memory) => {
    await base44.entities.AiMemory.update(memory.id, { active: false });
    reloadMemories();
  };

  if (loading) return <LoadingBlock rows={5} />;

  return (
    <div className="animate-fade-in space-y-6">
      <PageHeader
        eyebrow="Yours, and private"
        title="Settings"
        description="What you tell me here shapes how the app behaves — not what it decides for you."
      />

      <Section title="You" description="How you're greeted and when your day starts.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Preferred name" htmlFor="pref-name">
            <Input id="pref-name" value={form.preferred_name} onChange={(e) => set({ preferred_name: e.target.value })} placeholder="Rowan" />
          </Field>
          <Field label="Time zone" htmlFor="tz">
            <Input id="tz" value={form.timezone} onChange={(e) => set({ timezone: e.target.value })} placeholder="America/New_York" />
          </Field>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2">
            <Field label="Wake time" htmlFor="wake">
              <Input id="wake" type="time" value={form.wake_time} onChange={(e) => set({ wake_time: e.target.value })} />
            </Field>
            <Field label="Bedtime" htmlFor="bed">
              <Input id="bed" type="time" value={form.bed_time} onChange={(e) => set({ bed_time: e.target.value })} />
            </Field>
            <Field label="Work starts" htmlFor="work-start">
              <Input id="work-start" type="time" value={form.work_start} onChange={(e) => set({ work_start: e.target.value })} />
            </Field>
            <Field label="Work ends" htmlFor="work-end">
              <Input id="work-end" type="time" value={form.work_end} onChange={(e) => set({ work_end: e.target.value })} />
            </Field>
          </div>
        </div>
      </Section>

      <Section title="How you want to be helped" description="The assistant reads this before it says anything.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Guidance style">
            <Select value={form.guidance_style} onValueChange={(v) => set({ guidance_style: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gentle">Gentle — soften it</SelectItem>
                <SelectItem value="direct">Direct — straight to it</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Long lists">
            <Select value={form.list_tolerance} onValueChange={(v) => set({ list_tolerance: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="loves_lists">I like seeing everything</SelectItem>
                <SelectItem value="neutral">Somewhere in between</SelectItem>
                <SelectItem value="overwhelmed_by_lists">They overwhelm me</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="I plan best by">
            <Select value={form.planning_mode} onValueChange={(v) => set({ planning_mode: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="priority">Priority</SelectItem>
                <SelectItem value="time">Time</SelectItem>
                <SelectItem value="energy">Energy</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Most focused">
            <Select value={form.peak_focus} onValueChange={(v) => set({ peak_focus: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="early_morning">Early morning</SelectItem>
                <SelectItem value="morning">Morning</SelectItem>
                <SelectItem value="afternoon">Afternoon</SelectItem>
                <SelectItem value="evening">Evening</SelectItem>
                <SelectItem value="night">Late night</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Reminders should be">
            <Select value={form.reminder_style} onValueChange={(v) => set({ reminder_style: v })}>
              <SelectTrigger className="mt-1.5">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gentle">Gentle</SelectItem>
                <SelectItem value="firm">A little firmer</SelectItem>
                <SelectItem value="minimal">As few as possible</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </div>
      </Section>

      <Section title="Rituals and notifications" description="All optional, all reversible.">
        <div className="space-y-1">
          <ToggleRow
            label="Morning flow"
            description="A short arrival ritual with a briefing."
            checked={form.morning_flow_enabled}
            onChange={(v) => set({ morning_flow_enabled: v })}
          />
          <ToggleRow
            label="Evening reset"
            description="Close the day and set tomorrow's priority."
            checked={form.evening_reset_enabled}
            onChange={(v) => set({ evening_reset_enabled: v })}
          />
          <ToggleRow
            label="Show affirmations"
            description="One line of encouragement on Home."
            checked={form.show_affirmations}
            onChange={(v) => set({ show_affirmations: v })}
          />
          <ToggleRow
            label="In-app notifications"
            description="Briefings and reminders inside the app."
            checked={form.notifications_in_app}
            onChange={(v) => set({ notifications_in_app: v })}
          />
          <ToggleRow
            label="Email notifications"
            description="Only what you ask for. Nothing marketing."
            checked={form.notifications_email}
            onChange={(v) => set({ notifications_email: v })}
          />
        </div>
      </Section>

      <Section title="Appearance and accessibility" description="Comfort matters more than consistency.">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">Follows your device by default.</p>
          </div>
          <ThemeToggle />
        </div>
        <div className="mt-3 space-y-1">
          <ToggleRow
            label="Reduce motion"
            description="Turns off non-essential animation."
            checked={form.reduced_motion}
            onChange={(v) => set({ reduced_motion: v })}
          />
          <ToggleRow
            label="Larger text"
            description="Increases the base text size across the app."
            checked={form.larger_text}
            onChange={(v) => set({ larger_text: v })}
          />
        </div>
      </Section>

      <Section title="AI memory" description="What the assistant is allowed to carry between conversations.">
        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Pause personalization</p>
              <p className="text-xs text-muted-foreground">Stops saving new memories. Existing ones stay.</p>
            </div>
          </div>
          <Switch
            checked={form.ai_personalization_paused}
            onCheckedChange={(v) => set({ ai_personalization_paused: v })}
            aria-label="Pause personalization"
          />
        </div>

        <div className="mt-3 flex gap-2">
          <Input
            value={newMemory}
            onChange={(e) => setNewMemory(e.target.value)}
            placeholder="Something to remember, e.g. I hate morning meetings."
            aria-label="New memory"
          />
          <Button type="button" variant="outline" onClick={addMemory} className="shrink-0 gap-1.5 rounded-full">
            <Plus className="h-4 w-4" aria-hidden="true" />
            Remember
          </Button>
        </div>

        <ul className="mt-3 space-y-2">
          {memories.length ? (
            memories.map((memory) => (
              <li key={memory.id} className="flex items-start justify-between gap-2 rounded-xl bg-secondary/50 px-3 py-2">
                <p className="text-sm leading-relaxed">{memory.content}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-full"
                  aria-label={`Forget: ${memory.content}`}
                  onClick={() => forgetMemory(memory)}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </li>
            ))
          ) : (
            <li className="text-sm text-muted-foreground">
              Nothing remembered yet. I'll ask before keeping anything.
            </li>
          )}
        </ul>
      </Section>

      <Section title="Privacy and data" description="You can take everything with you, or remove it entirely.">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
            <div className="flex items-start gap-2">
              <Download className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Export your data</p>
                <p className="text-xs text-muted-foreground">A single JSON file with every record.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={exportData} disabled={working === "export"} className="rounded-full">
              {working === "export" ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : "Export"}
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Your records are yours alone</p>
                <p className="text-xs text-muted-foreground">
                  Every record is scoped to your account. Workspace administrators retain platform-level access.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/[0.04] p-3">
            <div className="flex items-start gap-2">
              <Trash2 className="mt-0.5 h-4 w-4 text-destructive" aria-hidden="true" />
              <div>
                <p className="text-sm font-medium">Delete all data</p>
                <p className="text-xs text-muted-foreground">Permanently removes your records, then signs you out.</p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="rounded-full border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive">
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete everything?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This removes all tasks, appointments, notes, dumps, check-ins and memories. It cannot be undone.
                    Export first if you might want a copy.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Keep my data</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteEverything} disabled={working === "delete"}>
                    {working === "delete" ? "Deleting…" : "Delete everything"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border/70 p-3">
            <KeyRound className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <div>
              <p className="text-sm font-medium">Sign-in and device security</p>
              <p className="text-xs text-muted-foreground">
                Password, two-factor authentication and connected devices are managed at the platform level,
                alongside your account. Account deletion is handled there too — contact support if you need it.
              </p>
            </div>
          </div>
        </div>
      </Section>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
        <div className="flex items-center gap-2">
          <Button onClick={savePreferences} disabled={saving} className="rounded-full">
            {saving ? "Saving…" : "Save preferences"}
          </Button>
          {savedAt ? (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" aria-hidden="true" />
              Saved at {savedAt}
            </span>
          ) : null}
        </div>
        <Button variant="ghost" onClick={() => logout()} className="gap-1.5 rounded-full text-muted-foreground">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </Button>
      </div>

      <p className="text-center text-[11px] text-muted-foreground">
        Signed in as {user?.email} ·{" "}
        <Link to="/more" className="underline underline-offset-4">
          back to more
        </Link>
      </p>
    </div>
  );
}

function Section({ title, description, children }) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-base font-medium tracking-tight">{title}</h2>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Surface className="p-4 sm:p-5">{children}</Surface>
    </section>
  );
}

function Field({ label, htmlFor, children }) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

function ToggleRow({ label, description, checked, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-1 py-2.5">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}