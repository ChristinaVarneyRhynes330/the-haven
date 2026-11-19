import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Surface } from "@/components/shared/Surface";
import { AreaIcon } from "@/components/shared/AreaIcon";
import { useProfile } from "@/lib/data";
import { analyzeBrainDump } from "@/lib/server-fns";
import { saveProposals } from "@/lib/proposals";
import { LIFE_AREA_TONES, areaDot } from "@/lib/design";
import { cn } from "@/lib/utils";

const PRESET_AREAS = [
  { name: "Personal", tone: "sage", icon: "user", on: true },
  { name: "Home", tone: "clay", icon: "home", on: true },
  { name: "Work", tone: "slate", icon: "briefcase", on: true },
  { name: "Health", tone: "moss", icon: "heart-pulse", on: true },
  { name: "Family", tone: "rose", icon: "users" },
  { name: "Children", tone: "sand", icon: "users" },
  { name: "Mental wellness", tone: "plum", icon: "brain" },
  { name: "Finances", tone: "sand", icon: "wallet" },
  { name: "Education", tone: "sky", icon: "book-open" },
  { name: "Legal", tone: "slate", icon: "scale" },
  { name: "Self-care", tone: "rose", icon: "sparkles" },
  { name: "Fitness", tone: "moss", icon: "dumbbell" },
  { name: "Relationships", tone: "plum", icon: "message-circle" },
  { name: "Creative projects", tone: "indigo", icon: "palette" },
  { name: "Faith / spirituality", tone: "indigo", icon: "church" },
  { name: "Social", tone: "sky", icon: "party-popper" },
  { name: "Travel", tone: "sky", icon: "plane" },
  { name: "Personal growth", tone: "moss", icon: "sprout" },
];

const HARDEST = [
  "Work",
  "Home",
  "Family",
  "Health",
  "Finances",
  "Mental load",
  "Time",
  "Admin / paperwork",
  "Self-care",
];

const STEPS = ["Welcome", "You", "Rhythm", "Guidance", "Areas", "Context", "First dump"];

export const Route = createFileRoute("/_authed/onboarding")({
  head: () => ({ meta: [{ title: "Set up · LifeOS" }] }),
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const { profile, loading, save } = useProfile();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
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
    notifications_in_app: true,
    notifications_email: false,
    reduced_motion: false,
    larger_text: false,
    hardest_areas: [],
    goals_now: "",
    dump: "",
    show_affirmations: true,
  });
  const [areas, setAreas] = useState(PRESET_AREAS.map((a) => ({ ...a, on: !!a.on })));

  useEffect(() => {
    if (typeof Intl !== "undefined" && !form.timezone) {
      setForm((f) => ({ ...f, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" }));
    }
  }, [form.timezone]);

  useEffect(() => {
    if (!profile) return;
    setForm((f) => ({
      ...f,
      preferred_name: profile.preferred_name || f.preferred_name,
      timezone: profile.timezone || f.timezone,
      wake_time: profile.wake_time || f.wake_time,
      bed_time: profile.bed_time || f.bed_time,
      work_start: profile.work_start || f.work_start,
      work_end: profile.work_end || f.work_end,
      planning_mode: profile.planning_mode || f.planning_mode,
      guidance_style: profile.guidance_style || f.guidance_style,
      list_tolerance: profile.list_tolerance || f.list_tolerance,
      peak_focus: profile.peak_focus || f.peak_focus,
      reminder_style: profile.reminder_style || f.reminder_style,
      hardest_areas: profile.hardest_areas || f.hardest_areas,
      goals_now: profile.goals_now || f.goals_now,
    }));
  }, [profile]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));
  const back = () => setStep((s) => Math.max(0, s - 1));

  const toggleArea = (name) =>
    setAreas((list) => list.map((a) => (a.name === name ? { ...a, on: !a.on } : a)));

  const toggleHardest = (value) =>
    set({
      hardest_areas: form.hardest_areas.includes(value)
        ? form.hardest_areas.filter((v) => v !== value)
        : [...form.hardest_areas, value],
    });

  const finish = async () => {
    setSaving(true);
    setError("");
    try {
      await save({
        ...form,
        onboarding_complete: true,
        timezone: form.timezone || "UTC",
      });

      const existing = await base44.entities.LifeArea.filter({}, { limit: 100 });
      const list = Array.isArray(existing) ? existing : existing?.items || [];
      const names = list.map((a) => (a.name || "").toLowerCase());
      const toCreate = areas
        .filter((a) => a.on && !names.includes(a.name.toLowerCase()))
        .map((a, index) => ({
          name: a.name,
          tone: a.tone,
          icon: a.icon,
          order: index,
          hidden: false,
          archived: false,
        }));
      if (toCreate.length) await base44.entities.LifeArea.bulkCreate(toCreate);

      if (!profile?.ai_personalization_paused) {
        const facts = [];
        if (form.hardest_areas.length)
          facts.push(`Hardest to manage: ${form.hardest_areas.join(", ")}.`);
        if (form.goals_now.trim()) facts.push(`Current goals: ${form.goals_now.trim()}`);
        if (facts.length) {
          await base44.entities.AiMemory.create({
            content: facts.join(" "),
            source: "onboarding",
            active: true,
          });
        }
      }

      if (form.dump.trim()) {
        const dump = await base44.entities.BrainDump.create({
          raw_text: form.dump.trim(),
          input_type: "text",
          status: "new",
          item_count: 0,
        });
        try {
          const analysis = await analyzeBrainDump({ data: { text: form.dump.trim() } });
          await saveProposals(analysis.items, { source: "brain_dump", dumpId: dump.id });
          await base44.entities.BrainDump.update(dump.id, { item_count: analysis.items.length });
        } catch {
          // The dump is saved either way; organizing can be retried from the review screen.
        }
        navigate({ to: "/brain-dump/$dumpId", params: { dumpId: dump.id } });
        return;
      }

      navigate({ to: "/" });
    } catch (err) {
      setError(err?.message || "Couldn't save your setup. Nothing was lost — try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        Preparing your setup…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-10">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg tracking-tight">Setting up your Life OS</span>
        </div>
        <span className="text-[11px] text-muted-foreground">
          {step + 1} / {STEPS.length}
        </span>
      </div>

      <div className="flex gap-1.5" aria-hidden="true">
        {STEPS.map((label, index) => (
          <span
            key={label}
            className={cn(
              "h-1 flex-1 rounded-full",
              index <= step ? "bg-primary" : "bg-border"
            )}
          />
        ))}
      </div>

      {step === 0 ? (
        <section className="space-y-4">
          <h1 className="font-display text-[32px] leading-tight tracking-tight sm:text-[38px]">
            You don't have to organize yourself first.
          </h1>
          <p className="max-w-lg text-[15px] leading-relaxed text-muted-foreground">
            Tell me a few things about how you live, and the app will shape itself around that. Everything
            here can change later, and you can skip any question that doesn't apply.
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              No streaks, no scoring, no guilt.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              The assistant suggests; you confirm.
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              Private to your account.
            </li>
          </ul>
          <Button onClick={next} className="gap-2 rounded-full">
            Let's begin
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">What should I call you?</h2>
          <Surface className="space-y-4 p-5">
            <div>
              <Label htmlFor="onb-name">Preferred name</Label>
              <Input
                id="onb-name"
                value={form.preferred_name}
                onChange={(e) => set({ preferred_name: e.target.value })}
                placeholder="Rowan"
                className="mt-1.5"
                autoFocus
              />
            </div>
            <div>
              <Label htmlFor="onb-tz">Time zone</Label>
              <Input
                id="onb-tz"
                value={form.timezone}
                onChange={(e) => set({ timezone: e.target.value })}
                placeholder="America/New_York"
                className="mt-1.5"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                Used for your day boundaries and reminders.
              </p>
            </div>
          </Surface>
          <StepButtons onNext={next} onBack={back} />
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">What does your day look like?</h2>
          <Surface className="grid grid-cols-2 gap-3 p-5">
            <div>
              <Label htmlFor="onb-wake">Wake</Label>
              <Input id="onb-wake" type="time" value={form.wake_time} onChange={(e) => set({ wake_time: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="onb-bed">Bed</Label>
              <Input id="onb-bed" type="time" value={form.bed_time} onChange={(e) => set({ bed_time: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="onb-workstart">Work starts</Label>
              <Input id="onb-workstart" type="time" value={form.work_start} onChange={(e) => set({ work_start: e.target.value })} className="mt-1.5" />
            </div>
            <div>
              <Label htmlFor="onb-workend">Work ends</Label>
              <Input id="onb-workend" type="time" value={form.work_end} onChange={(e) => set({ work_end: e.target.value })} className="mt-1.5" />
            </div>
          </Surface>
          <StepButtons onNext={next} onBack={back} />
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">How do you want to be helped?</h2>
          <div className="space-y-4">
            <Choices
              label="Guidance style"
              value={form.guidance_style}
              onChange={(v) => set({ guidance_style: v })}
              options={[
                { value: "gentle", label: "Gentle", hint: "Softly, with room to breathe" },
                { value: "direct", label: "Direct", hint: "Just tell me what matters" },
              ]}
            />
            <Choices
              label="Do long lists overwhelm you?"
              value={form.list_tolerance}
              onChange={(v) => set({ list_tolerance: v })}
              options={[
                { value: "loves_lists", label: "No — show me everything" },
                { value: "neutral", label: "Sometimes" },
                { value: "overwhelmed_by_lists", label: "Yes — keep it short" },
              ]}
            />
            <Choices
              label="I plan best by"
              value={form.planning_mode}
              onChange={(v) => set({ planning_mode: v })}
              options={[
                { value: "priority", label: "Priority" },
                { value: "time", label: "Time" },
                { value: "energy", label: "Energy" },
                { value: "category", label: "Category" },
              ]}
            />
            <Choices
              label="When are you most focused?"
              value={form.peak_focus}
              onChange={(v) => set({ peak_focus: v })}
              options={[
                { value: "early_morning", label: "Early morning" },
                { value: "morning", label: "Morning" },
                { value: "afternoon", label: "Afternoon" },
                { value: "evening", label: "Evening" },
                { value: "night", label: "Late night" },
              ]}
            />
            <Choices
              label="Reminders should feel"
              value={form.reminder_style}
              onChange={(v) => set({ reminder_style: v })}
              options={[
                { value: "gentle", label: "Gentle" },
                { value: "firm", label: "A bit firmer" },
                { value: "minimal", label: "As rare as possible" },
              ]}
            />
          </div>
          <StepButtons onNext={next} onBack={back} />
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Which parts of life matter here?</h2>
          <p className="text-sm text-muted-foreground">
            Pick what applies. You can rename, recolour, reorder, hide or add your own later.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {areas.map((area) => (
              <button
                key={area.name}
                type="button"
                aria-pressed={area.on}
                onClick={() => toggleArea(area.name)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition-colors",
                  area.on
                    ? "border-primary/40 bg-primary/[0.06] text-foreground"
                    : "border-border/70 text-muted-foreground hover:border-primary/30"
                )}
              >
                <span className={cn("grid h-7 w-7 shrink-0 place-items-center rounded-lg", area.on ? "bg-primary/10 text-primary" : "bg-secondary")}>
                  <AreaIcon name={area.icon} className="h-3.5 w-3.5" />
                </span>
                <span className="min-w-0 flex-1 leading-tight">{area.name}</span>
                {area.on ? (
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", areaDot(area.tone))} aria-hidden="true" />
                ) : null}
              </button>
            ))}
          </div>
          <StepButtons onNext={next} onBack={back} />
        </section>
      ) : null}

      {step === 5 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">What's hardest right now?</h2>
          <p className="text-sm text-muted-foreground">
            Optional, and only used to shape the app. Nothing is shared anywhere.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {HARDEST.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={form.hardest_areas.includes(item)}
                onClick={() => toggleHardest(item)}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                  form.hardest_areas.includes(item)
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border/80 text-muted-foreground hover:text-foreground"
                )}
              >
                {item}
              </button>
            ))}
          </div>
          <div>
            <Label htmlFor="onb-goals">What matters most to you right now?</Label>
            <Textarea
              id="onb-goals"
              value={form.goals_now}
              onChange={(e) => set({ goals_now: e.target.value })}
              rows={3}
              className="mt-1.5"
              placeholder="Get through the next quarter at work. Be more present at home. Sleep better."
            />
          </div>
          <StepButtons onNext={next} onBack={back} />
        </section>
      ) : null}

      {step === 6 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">One last thing, if you want</h2>
          <p className="text-sm text-muted-foreground">
            What's currently taking up space in your mind? Write it messy. I'll show you what I found before
            anything is added.
          </p>
          <Textarea
            value={form.dump}
            onChange={(e) => set({ dump: e.target.value })}
            rows={6}
            aria-label="First brain dump"
            placeholder="The boiler, the school trip money, Mum's birthday, the invoice, I keep forgetting to book the car in…"
          />

          <div className="grid gap-2 sm:grid-cols-2">
            <ToggleLine
              label="Morning flow"
              checked={form.notifications_in_app}
              onChange={(v) => set({ notifications_in_app: v })}
            />
            <ToggleLine
              label="Show affirmations"
              checked={form.show_affirmations}
              onChange={(v) => set({ show_affirmations: v })}
            />
            <ToggleLine
              label="Larger text"
              checked={form.larger_text}
              onChange={(v) => set({ larger_text: v })}
            />
            <ToggleLine
              label="Reduce motion"
              checked={form.reduced_motion}
              onChange={(v) => set({ reduced_motion: v })}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={finish} disabled={saving} className="gap-2 rounded-full">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {saving ? "Setting things up…" : form.dump.trim() ? "Organize and finish" : "Finish setup"}
            </Button>
            <Button variant="ghost" onClick={back} className="rounded-full text-muted-foreground">
              Back
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function StepButtons({ onNext, onBack }) {
  return (
    <div className="flex gap-2 pt-1">
      <Button onClick={onNext} className="gap-2 rounded-full">
        Continue
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      <Button variant="ghost" onClick={onBack} className="rounded-full text-muted-foreground">
        Back
      </Button>
    </div>
  );
}

function Choices({ label, value, onChange, options }) {
  return (
    <fieldset>
      <legend className="text-sm font-medium">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              value === option.value
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {option.label}
            {option.hint ? (
              <span className="ml-1.5 hidden font-normal opacity-70 sm:inline">— {option.hint}</span>
            ) : null}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ToggleLine({ label, checked, onChange }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}