import { useMemo, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Moon } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Surface } from "@/components/shared/Surface";
import { EmptyState } from "@/components/shared/States";
import { useCollection } from "@/lib/data";
import { dayKey, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const STEPS = ["Close", "Unfinished", "Mental space", "Went well", "Tomorrow", "Preview"];

export const Route = createFileRoute("/_authed/evening")({
  head: () => ({ meta: [{ title: "Evening reset · LifeOS" }] }),
  component: EveningReset,
});

function EveningReset() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [mental, setMental] = useState("");
  const [wentWell, setWentWell] = useState("");
  const [tomorrowPriority, setTomorrowPriority] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const today = dayKey();
  const { items: tasks, reload } = useCollection("Task", {}, { limit: 300 });
  const { items: events } = useCollection("Event", {}, { sort: "start_at", limit: 100 });

  const doneToday = useMemo(
    () => tasks.filter((t) => t.status === "done" && t.completed_at && dayKey(t.completed_at) === today),
    [tasks, today]
  );
  const remaining = useMemo(
    () => tasks.filter((t) => t.status === "open" && t.due_date && dayKey(t.due_date) === today),
    [tasks, today]
  );
  const tomorrowEvents = useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return events.filter((e) => e.start_at && dayKey(e.start_at) === dayKey(date));
  }, [events]);

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  const moveTo = async (task, days) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    date.setHours(9, 0, 0, 0);
    await base44.entities.Task.update(task.id, {
      due_date: date.toISOString(),
      postponed_count: (task.postponed_count || 0) + 1,
    });
    reload();
  };

  const letGo = async (task) => {
    await base44.entities.Task.update(task.id, { status: "archived" });
    reload();
  };

  const finish = async () => {
    setSaving(true);
    setError("");
    try {
      if (mental.trim()) {
        await base44.entities.BrainDump.create({
          raw_text: mental.trim(),
          input_type: "text",
          status: "new",
          item_count: 0,
        });
      }
      if (tomorrowPriority.trim()) {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        date.setHours(9, 0, 0, 0);
        await base44.entities.Task.create({
          title: tomorrowPriority.trim(),
          priority: "must",
          status: "open",
          source: "manual",
          due_date: date.toISOString(),
          tags: [],
          subtasks: [],
        });
      }
      await base44.entities.Checkin.create({
        kind: "evening",
        day_key: today,
        went_well: wentWell.trim(),
        tomorrow_priority: tomorrowPriority.trim(),
        note: mental.trim(),
      });
      navigate({ to: "/" });
    } catch (err) {
      setError(err?.message || "Could not close the day. Try once more.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          Leave
        </Link>
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === step ? "w-5 bg-primary" : index < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-border"
              )}
            />
          ))}
        </div>
      </div>

      <p className="eyebrow">{STEPS[step]}</p>

      {step === 0 ? (
        <section className="space-y-4">
          <h1 className="font-display text-[32px] leading-tight tracking-tight">Closing the day</h1>
          <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Not a scorecard. Just a gentle handover to tomorrow.
          </p>
          <Surface className="p-5">
            <p className="text-sm font-medium">Done today</p>
            {doneToday.length ? (
              <ul className="mt-2 space-y-1.5">
                {doneToday.map((task) => (
                  <li key={task.id} className="flex items-start gap-2 text-sm text-muted-foreground">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-area-sage" aria-hidden="true" />
                    <span className="line-through decoration-muted-foreground/40">{task.title}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-muted-foreground">
                Nothing ticked off — some days are like that. Surviving counts.
              </p>
            )}
          </Surface>
          <Button onClick={next} className="gap-2 rounded-full">
            Continue
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">What's left?</h2>
          <p className="text-sm text-muted-foreground">
            Move it, keep it, or let it go. Nothing is judged here.
          </p>
          {remaining.length ? (
            <div className="space-y-2">
              {remaining.map((task) => (
                <Surface key={task.id} className="p-3.5">
                  <p className="text-sm font-medium leading-snug">{task.title}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <Button size="sm" variant="outline" className="h-7 rounded-full px-2.5 text-xs" onClick={() => moveTo(task, 1)}>
                      Tomorrow
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 rounded-full px-2.5 text-xs text-muted-foreground" onClick={() => moveTo(task, 7)}>
                      Next week
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 rounded-full px-2.5 text-xs text-muted-foreground"
                      onClick={() => letGo(task)}
                    >
                      Let it go
                    </Button>
                  </div>
                </Surface>
              ))}
            </div>
          ) : (
            <EmptyState icon={Check} title="Nothing left over" description="The day is closed." />
          )}
          <Button onClick={next} variant="outline" className="rounded-full">
            Continue
          </Button>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Anything still in your head?</h2>
          <p className="text-sm text-muted-foreground">
            Write it down and it stops circling. I'll keep it for tomorrow.
          </p>
          <Textarea
            value={mental}
            onChange={(e) => setMental(e.target.value)}
            rows={5}
            aria-label="Anything still occupying mental space"
            placeholder="I need to call the school about the trip. And I still haven't looked at the insurance letter…"
          />
          <Button onClick={next} className="rounded-full">
            Continue
          </Button>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">What went well?</h2>
          <Textarea
            value={wentWell}
            onChange={(e) => setWentWell(e.target.value)}
            rows={4}
            aria-label="What went well today"
            placeholder="Got through the proposal. Walked at lunch. Said no to one thing."
          />
          <Button onClick={next} className="rounded-full">
            Continue
          </Button>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Tomorrow's main priority</h2>
          <p className="text-sm text-muted-foreground">One thing. It becomes a must-do for tomorrow.</p>
          <Input
            value={tomorrowPriority}
            onChange={(e) => setTomorrowPriority(e.target.value)}
            placeholder="Finish the Halden proposal"
            aria-label="Tomorrow's main priority"
          />
          <Button onClick={next} className="rounded-full">
            Preview tomorrow
          </Button>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Tomorrow, at a glance</h2>
          <Surface className="p-5">
            <p className="eyebrow">Main priority</p>
            <p className="mt-1 text-sm font-medium">
              {tomorrowPriority || "Not set — you can decide in the morning."}
            </p>
            {tomorrowEvents.length ? (
              <>
                <p className="eyebrow mt-4">Appointments</p>
                <ul className="mt-1 space-y-1">
                  {tomorrowEvents.map((event) => (
                    <li key={event.id} className="text-sm">
                      <span className="tabular text-muted-foreground">{fmtTime(event.start_at)}</span>{" "}
                      {event.title}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
            <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Moon className="h-3.5 w-3.5" aria-hidden="true" />
              Nothing else needs you tonight.
            </p>
          </Surface>
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
          <Button onClick={finish} disabled={saving} className="rounded-full">
            {saving ? "Closing the day…" : "Finish and close the day"}
          </Button>
        </section>
      ) : null}
    </div>
  );
}