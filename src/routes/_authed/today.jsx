import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CalendarDays, CheckCircle2, ListChecks, Moon, Plus, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { SectionHeader, Surface } from "@/components/shared/Surface";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { AreaChip } from "@/components/shared/AreaChip";
import { useCollection } from "@/lib/data";
import { useAreas } from "@/lib/useAreas";
import { dayKey, dueLabel, fmtTime, isOverdue } from "@/lib/format";
import { ENERGY_LEVELS, PRIORITY_GROUPS } from "@/lib/design";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "timeline", label: "Timeline" },
  { id: "priority", label: "Priority" },
  { id: "energy", label: "Energy" },
  { id: "checklist", label: "Checklist" },
];

export const Route = createFileRoute("/_authed/today")({
  validateSearch: (search) => ({ view: search.view }),
  head: () => ({ meta: [{ title: "Today · LifeOS" }] }),
  component: TodayPage,
});

function TodayPage() {
  const { view = "timeline" } = Route.useSearch();
  const navigate = useNavigate();
  const { areas, byId } = useAreas();
  const { items: tasks, loading, reload } = useCollection(
    "Task",
    { status: "open" },
    { sort: "due_date", limit: 300 }
  );
  const { items: events } = useCollection("Event", {}, { sort: "start_at", limit: 200 });
  const { items: checkins, reload: reloadCheckins } = useCollection(
    "Checkin",
    { day_key: dayKey(), kind: "quick" },
    { limit: 2 }
  );

  const [energy, setEnergy] = useState(checkins[0]?.energy || null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const today = dayKey();
  const todaysEvents = useMemo(
    () =>
      events
        .filter((e) => e.start_at && dayKey(e.start_at) === today)
        .sort((a, b) => new Date(a.start_at) - new Date(b.start_at)),
    [events, today]
  );

  const todaysTasks = useMemo(
    () =>
      tasks.filter(
        (t) =>
          (t.due_date && dayKey(t.due_date) === today) ||
          (t.due_date && isOverdue(t.due_date)) ||
          !t.due_date
      ),
    [tasks, today]
  );

  const toggle = async (task) => {
    const done = task.status === "done";
    await base44.entities.Task.update(task.id, {
      status: done ? "open" : "done",
      completed_at: done ? "" : new Date().toISOString(),
    });
    reload();
  };

  const tomorrow = async (task) => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
    await base44.entities.Task.update(task.id, {
      due_date: date.toISOString(),
      postponed_count: (task.postponed_count || 0) + 1,
    });
    reload();
  };

  const remove = async (task) => {
    await base44.entities.Task.delete(task.id);
    reload();
  };

  const openTask = (task) => {
    setEditing(task);
    setSheetOpen(true);
  };

  const setEnergyAndSave = async (level) => {
    setEnergy(level);
    const existing = checkins[0];
    if (existing?.id) {
      await base44.entities.Checkin.update(existing.id, { energy: level });
    } else {
      await base44.entities.Checkin.create({ day_key: today, kind: "quick", energy: level });
    }
    reloadCheckins();
  };

  return (
    <div className="animate-fade-in space-y-7">
      <PageHeader
        eyebrow={new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        title="Today"
        description="Everything in front of you, arranged so you don't have to hold it."
        actions={
          <Button
            size="sm"
            className="gap-1.5 rounded-full"
            onClick={() => {
              setEditing(null);
              setSheetOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            New task
          </Button>
        }
      />

      <Surface className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium">Energy mode</p>
          <p className="text-xs text-muted-foreground">
            {energy
              ? ENERGY_LEVELS.find((e) => e.id === energy)?.description
              : "Tell me how much you have, and I'll match the work."}
          </p>
        </div>
        <div role="group" aria-label="Energy level" className="flex flex-wrap gap-1.5">
          {ENERGY_LEVELS.map((level) => (
            <button
              key={level.id}
              type="button"
              aria-pressed={energy === level.id}
              onClick={() => setEnergyAndSave(level.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                energy === level.id
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border/80 text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              {level.label}
            </button>
          ))}
        </div>
      </Surface>

      <div
        role="tablist"
        aria-label="Today views"
        className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1"
      >
        {VIEWS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={view === item.id}
            onClick={() => navigate({ to: "/today", search: { view: item.id } })}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              view === item.id
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock rows={4} />
      ) : view === "energy" ? (
        <EnergyView tasks={todaysTasks} energy={energy || "moderate"} areaById={byId} onToggle={toggle} onOpen={openTask} onTomorrow={tomorrow} onDelete={remove} />
      ) : view === "priority" ? (
        <PriorityView tasks={todaysTasks} areaById={byId} onToggle={toggle} onOpen={openTask} onTomorrow={tomorrow} onDelete={remove} />
      ) : view === "checklist" ? (
        <ChecklistView tasks={todaysTasks} areaById={byId} onToggle={toggle} onOpen={openTask} onTomorrow={tomorrow} onDelete={remove} />
      ) : (
        <TimelineView
          events={todaysEvents}
          tasks={todaysTasks}
          areaById={byId}
          onToggle={toggle}
          onOpen={openTask}
          onTomorrow={tomorrow}
          onDelete={remove}
        />
      )}

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        task={editing}
        areas={areas}
        onSaved={reload}
      />
    </div>
  );
}

function TimelineView({ events, tasks, areaById, ...handlers }) {
  const items = [
    ...events.map((e) => ({ kind: "event", time: e.start_at, record: e })),
    ...tasks
      .filter((t) => t.due_date)
      .map((t) => ({ kind: "task", time: t.due_date, record: t })),
  ].sort((a, b) => new Date(a.time) - new Date(b.time));

  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="In order"
        title="Your timeline"
        description="Appointments and tasks side by side, so the day reads truthfully."
      />
      {items.length ? (
        <Surface className="divide-y divide-border/70 p-2 sm:p-3">
          {items.map((item) =>
            item.kind === "event" ? (
              <div key={`e-${item.record.id}`} className="flex gap-3 px-2 py-3">
                <div className="w-14 shrink-0 pt-0.5 text-right">
                  <span className="tabular text-xs text-muted-foreground">
                    {fmtTime(item.record.start_at)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                    <p className="text-sm font-medium leading-snug">{item.record.title}</p>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <AreaChip area={areaById[item.record.area_id]} />
                    {item.record.location ? (
                      <span className="text-[11px] text-muted-foreground">{item.record.location}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <TaskRow
                key={`t-${item.record.id}`}
                task={item.record}
                area={areaById[item.record.area_id]}
                onToggle={handlers.onToggle}
                onOpen={handlers.onOpen}
                onTomorrow={handlers.onTomorrow}
                onDelete={handlers.onDelete}
              />
            )
          )}
        </Surface>
      ) : (
        <EmptyState
          icon={CalendarDays}
          title="Nothing scheduled today"
          description="A clear day. Add a task, or leave it as it is."
        />
      )}
    </div>
  );
}

function PriorityView({ tasks, areaById, ...handlers }) {
  const groups = PRIORITY_GROUPS.map((group) => ({
    ...group,
    items: tasks.filter((t) => (t.priority || "should") === group.id),
  })).filter((g) => g.items.length);

  if (!groups.length) {
    return (
      <EmptyState
        icon={ListChecks}
        title="No open work"
        description="Everything in front of you is either done or not written down yet."
      />
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.id} aria-label={group.label}>
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-medium">
              {group.label}
              <span className="ml-2 text-xs font-normal text-muted-foreground">{group.hint}</span>
            </h3>
            <span className="tabular text-xs text-muted-foreground">{group.items.length}</span>
          </div>
          <Surface className="p-2">
            <ul>
              {group.items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  area={areaById[task.area_id]}
                  showPriority={false}
                  onToggle={handlers.onToggle}
                  onOpen={handlers.onOpen}
                  onTomorrow={handlers.onTomorrow}
                  onDelete={handlers.onDelete}
                />
              ))}
            </ul>
          </Surface>
        </section>
      ))}
    </div>
  );
}

function ChecklistView({ tasks, areaById, ...handlers }) {
  return (
    <div className="space-y-3">
      <Surface className="p-2">
        <ul>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              area={areaById[task.area_id]}
              showPriority={false}
              onToggle={handlers.onToggle}
              onOpen={handlers.onOpen}
              onTomorrow={handlers.onTomorrow}
              onDelete={handlers.onDelete}
            />
          ))}
        </ul>
      </Surface>
      <p className="px-1 text-xs text-muted-foreground">
        {tasks.length} open item{tasks.length === 1 ? "" : "s"} · tick them off, nothing else to decide
      </p>
    </div>
  );
}

const ENERGY_MATCH = {
  very_low: { accepts: ["very_low"], maxMinutes: 15 },
  low: { accepts: ["very_low", "low"], maxMinutes: 30 },
  moderate: { accepts: ["low", "moderate"], maxMinutes: 90 },
  high: { accepts: ["moderate", "high"], maxMinutes: 240 },
  deep: { accepts: ["high", "deep"], maxMinutes: 600 },
};

function EnergyView({ tasks, energy, areaById, ...handlers }) {
  const rule = ENERGY_MATCH[energy] || ENERGY_MATCH.moderate;
  const rank = Object.fromEntries(PRIORITY_GROUPS.map((g) => [g.id, g.rank]));

  const matches = tasks
    .filter((t) => rule.accepts.includes(t.energy || "moderate"))
    .filter((t) => !t.estimate_min || t.estimate_min <= rule.maxMinutes)
    .sort((a, b) => (rank[a.priority] || 9) - (rank[b.priority] || 9))
    .slice(0, 4);

  return (
    <div className="space-y-4">
      <Surface className="border-primary/25 bg-primary/[0.06] p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium">
              Matched to {ENERGY_LEVELS.find((e) => e.id === energy)?.label?.toLowerCase()} energy
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Only work that fits what you have, up to about {rule.maxMinutes} minutes. This is a
              suggestion — the rest of the day is still there when you want it.
            </p>
          </div>
        </div>
      </Surface>

      {matches.length ? (
        <Surface className="p-2">
          <ul>
            {matches.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                area={areaById[task.area_id]}
                onToggle={handlers.onToggle}
                onOpen={handlers.onOpen}
                onTomorrow={handlers.onTomorrow}
                onDelete={handlers.onDelete}
              />
            ))}
          </ul>
        </Surface>
      ) : (
        <EmptyState
          icon={Moon}
          title="Nothing fits this energy right now"
          description="That's not a failure. Rest, or pick something small and unrelated."
          action={
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <a href="/today?view=priority">See everything anyway</a>
            </Button>
          }
        />
      )}
      <p className="px-1 text-[11px] text-muted-foreground">
        {tasks.length} open item{tasks.length === 1 ? "" : "s"} today ·{" "}
        {tasks.filter((t) => t.due_date && dueLabel(t.due_date) === "Tomorrow").length} for tomorrow
      </p>
      <CheckCircle2 className="hidden" aria-hidden="true" />
    </div>
  );
}