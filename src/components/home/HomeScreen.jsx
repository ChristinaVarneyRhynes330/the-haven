import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Brain, Clock, Moon, Sunrise } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Surface, SectionHeader } from "@/components/shared/Surface";
import { DailyFocusCard, QuickCheckin } from "@/components/home/DailyFocusCard";
import { TodaySnapshot } from "@/components/home/TodaySnapshot";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { useCollection, useProfile } from "@/lib/data";
import { useAreas } from "@/lib/useAreas";
import { dayKey, greetingFor, isOverdue } from "@/lib/format";
import { cn } from "@/lib/utils";
import { areaDot } from "@/lib/design";

const FALLBACK_AFFIRMATIONS = [
  "You don't have to hold all of it in your head. It's written down now.",
  "Enough for today is enough.",
  "You can do the next right thing without doing everything.",
  "Slowness is allowed. So is starting again.",
];

export function HomePage() {
  const { profile } = useProfile();
  const { areas, byId } = useAreas();
  const { items: tasks, loading: tasksLoading, reload: reloadTasks } = useCollection(
    "Task",
    { status: "open" },
    { sort: "due_date", limit: 300 }
  );
  const { items: events, reload: reloadEvents } = useCollection(
    "Event",
    {},
    { sort: "start_at", limit: 200 }
  );
  const { items: reminders } = useCollection("Reminder", { status: "pending" }, { limit: 50 });
  const { items: affirmations } = useCollection(
    "Affirmation",
    { active: true },
    { limit: 20 }
  );
  const { items: checkins, reload: reloadCheckins } = useCollection(
    "Checkin",
    { day_key: dayKey(), kind: "quick" },
    { limit: 2 }
  );

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [savingCheckin, setSavingCheckin] = useState(false);

  const todayCheckin = checkins[0];
  const today = dayKey();

  const todaysEvents = useMemo(
    () =>
      events
        .filter((e) => e.start_at && dayKey(e.start_at) === today)
        .sort((a, b) => new Date(a.start_at) - new Date(b.start_at)),
    [events, today]
  );

  const mustDo = useMemo(
    () =>
      tasks
        .filter((t) => t.priority === "must")
        .sort((a, b) => new Date(a.due_date || 8.64e15) - new Date(b.due_date || 8.64e15)),
    [tasks]
  );

  const overdue = useMemo(
    () => tasks.filter((t) => t.due_date && isOverdue(t.due_date)),
    [tasks]
  );

  const priorityTask = useMemo(() => {
    const dueToday = mustDo.find((t) => t.due_date && dayKey(t.due_date) === today);
    return dueToday || mustDo[0] || overdue[0] || tasks.find((t) => t.priority === "should") || null;
  }, [mustDo, overdue, tasks, today]);

  const nextEvent = useMemo(() => {
    const now = Date.now();
    return (
      todaysEvents.find((e) => new Date(e.start_at).getTime() >= now) || todaysEvents[0] || null
    );
  }, [todaysEvents]);

  const workload = useMemo(() => {
    const planned = tasks
      .filter((t) => t.due_date && dayKey(t.due_date) === today)
      .reduce((sum, t) => sum + (Number(t.estimate_min) || 0), 0);
    return { must: mustDo.length, plannedMin: planned, overdue: overdue.length };
  }, [tasks, mustDo, overdue, today]);

  const affirmation = useMemo(() => {
    if (profile?.show_affirmations === false) return "";
    const favourite = affirmations.find((a) => a.favorite);
    return (
      favourite?.text ||
      affirmations[0]?.text ||
      FALLBACK_AFFIRMATIONS[new Date().getDate() % FALLBACK_AFFIRMATIONS.length]
    );
  }, [affirmations, profile]);

  const firstName = (profile?.preferred_name || "").trim();

  const saveCheckin = async (patch) => {
    setSavingCheckin(true);
    try {
      if (todayCheckin?.id) {
        await base44.entities.Checkin.update(todayCheckin.id, patch);
      } else {
        await base44.entities.Checkin.create({ day_key: today, kind: "quick", ...patch });
      }
      await reloadCheckins();
    } finally {
      setSavingCheckin(false);
    }
  };

  const toggleTask = async (task) => {
    await base44.entities.Task.update(task.id, { status: "done", completed_at: new Date().toISOString() });
    reloadTasks();
  };

  return (
    <div className="animate-fade-in space-y-8">
      <header className="pt-1">
        <p className="eyebrow">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="mt-2 font-display text-[32px] leading-[1.15] tracking-tight sm:text-[40px]">
          {greetingFor()}
          {firstName ? `, ${firstName}` : ""}.
        </h1>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-muted-foreground">
          Here's what actually matters today. Everything else can wait.
        </p>
      </header>

      <QuickCheckin checkin={todayCheckin} onChange={saveCheckin} busy={savingCheckin} />

      <DailyFocusCard
        task={priorityTask}
        workload={workload}
        nextEvent={nextEvent}
        affirmation={affirmation}
      />

      <section aria-label="Today at a glance" className="space-y-4">
        <SectionHeader
          eyebrow="Today at a glance"
          title="What's in front of you"
          action={
            <Button asChild variant="ghost" size="sm" className="gap-1 rounded-full text-muted-foreground">
              <Link to="/today">
                Open Today
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </Button>
          }
        />
        <TodaySnapshot
          events={todaysEvents}
          mustDo={mustDo}
          overdue={overdue}
          reminders={reminders}
          areaById={byId}
          onToggle={toggleTask}
          onNewTask={() => {
            setEditing(null);
            setSheetOpen(true);
          }}
        />
      </section>

      <section aria-label="Rituals" className="space-y-4">
        <SectionHeader eyebrow="Begin and end well" title="Rituals" />
        <div className="grid gap-3 sm:grid-cols-2">
          <RitualLink
            to="/morning"
            icon={Sunrise}
            title="Morning flow"
            description="Check in, a short priming exercise, then your briefing."
          />
          <RitualLink
            to="/evening"
            icon={Moon}
            title="Evening reset"
            description="Close the day gently and set tomorrow's one priority."
          />
        </div>
        <Surface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-secondary text-secondary-foreground">
              <Brain className="h-4 w-4" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-medium">A 3-minute priming exercise</p>
              <p className="text-sm text-muted-foreground">
                Optional, short, and never a test of your memory.
              </p>
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="shrink-0 rounded-full">
            <Link to="/cognitive">Try it</Link>
          </Button>
        </Surface>
      </section>

      <section aria-label="Life areas" className="space-y-3">
        <SectionHeader
          eyebrow="Your life"
          title="Areas"
          action={
            <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground">
              <Link to="/life-areas">Manage</Link>
            </Button>
          }
        />
        {areas.length ? (
          <div className="flex flex-wrap gap-2">
            {areas.map((area) => (
              <Link
                key={area.id}
                to="/life-areas/$areaId"
                params={{ areaId: area.id }}
                className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-1.5 text-xs font-medium shadow-soft transition-colors hover:border-primary/30"
              >
                <span className={cn("h-2 w-2 rounded-full", areaDot(area.tone))} aria-hidden="true" />
                {area.name}
              </Link>
            ))}
          </div>
        ) : (
          <Surface className="p-4">
            <p className="text-sm text-muted-foreground">
              No life areas yet — they're how everything stays connected.
            </p>
            <Button asChild size="sm" variant="ghost" className="mt-1 -ml-2 rounded-full text-primary">
              <Link to="/life-areas">Set them up</Link>
            </Button>
          </Surface>
        )}
      </section>

      <div className="flex items-center justify-center gap-2 pb-2 text-center text-xs text-muted-foreground">
        <Clock className="h-3 w-3" aria-hidden="true" />
        {tasksLoading ? "Reading your day…" : "Private to you · you control what the assistant remembers"}
      </div>

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        task={editing}
        areas={areas}
        onSaved={() => {
          reloadTasks();
          reloadEvents();
        }}
      />
    </div>
  );
}

function RitualLink({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="group rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-colors hover:border-primary/30 hover:bg-secondary/40"
    >
      <div className="flex items-center justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
        <ArrowRight
          className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </Link>
  );
}