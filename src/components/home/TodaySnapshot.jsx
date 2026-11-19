import { Link } from "@tanstack/react-router";
import { ArrowRight, Bell, CalendarDays, Check, Plus, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/shared/Surface";
import { AreaChip } from "@/components/shared/AreaChip";
import { cn } from "@/lib/utils";
import { areaDot } from "@/lib/design";
import { dueLabel, fmtTime, isOverdue } from "@/lib/format";

export function TodaySnapshot({
  events = [],
  mustDo = [],
  overdue = [],
  reminders = [],
  areaById,
  onToggle,
  onNewTask,
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Surface className="p-5 sm:p-6 lg:col-span-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-base font-medium tracking-tight">Your day</h3>
          </div>
          <Button asChild variant="ghost" size="sm" className="rounded-full text-muted-foreground">
            <Link to="/calendar">Calendar</Link>
          </Button>
        </div>

        {events.length ? (
          <ol className="mt-4 space-y-1">
            {events.map((event) => {
              const area = areaById[event.area_id];
              return (
                <li key={event.id} className="flex gap-3">
                  <div className="w-14 shrink-0 pt-2.5 text-right">
                    <span className="tabular text-xs text-muted-foreground">
                      {fmtTime(event.start_at)}
                    </span>
                  </div>
                  <div className="relative flex-1 border-l border-border/70 pb-3 pl-4">
                    <span
                      aria-hidden="true"
                      className={cn(
                        "absolute -left-[4.5px] top-[14px] h-2 w-2 rounded-full ring-4 ring-card",
                        areaDot(area?.tone)
                      )}
                    />
                    <div className="rounded-xl border border-transparent px-2 py-2">
                      <p className="text-sm font-medium leading-snug">{event.title}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                        <AreaChip area={area} />
                        {event.location ? <span>{event.location}</span> : null}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="mt-4 rounded-xl border border-dashed border-border/80 p-4">
            <p className="text-sm text-muted-foreground">
              Nothing on the calendar today. That's space, not emptiness.
            </p>
            <Button asChild size="sm" variant="ghost" className="mt-1 -ml-2 rounded-full text-primary">
              <Link to="/calendar">Add something</Link>
            </Button>
          </div>
        )}
      </Surface>

      <div className="space-y-4">
        <Surface className="p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-medium tracking-tight">Must do</h3>
            <span className="tabular rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
              {mustDo.length}
            </span>
          </div>
          {mustDo.length ? (
            <ul className="mt-3 space-y-0.5">
              {mustDo.slice(0, 4).map((task) => (
                <li key={task.id}>
                  <div className="flex items-start gap-2.5 rounded-lg px-1 py-2 transition-colors hover:bg-secondary/50">
                    <button
                      type="button"
                      onClick={() => onToggle?.(task)}
                      aria-label={`Mark "${task.title}" as done`}
                      className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border border-muted-foreground/40 hover:border-primary"
                    >
                      <Check className="h-2.5 w-2.5 text-transparent" aria-hidden="true" />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm leading-snug">{task.title}</p>
                      <p className="mt-0.5 flex items-center gap-1.5">
                        <AreaChip area={areaById[task.area_id]} />
                        {task.due_date ? (
                          <span className="text-[11px] text-muted-foreground">{dueLabel(task.due_date)}</span>
                        ) : null}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              Nothing marked must-do. A calmer day than you thought.
            </p>
          )}
          <Button
            type="button"
            onClick={onNewTask}
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-between rounded-lg text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              Add a task
            </span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Button>
        </Surface>

        {overdue.length ? (
          <Surface className="border-destructive/25 bg-destructive/[0.04] p-5">
            <div className="flex items-center gap-2">
              <TriangleAlert className="h-4 w-4 text-destructive" aria-hidden="true" />
              <h3 className="text-base font-medium tracking-tight">Carried forward</h3>
            </div>
            <ul className="mt-2 space-y-1.5">
              {overdue.slice(0, 2).map((task) => (
                <li key={task.id} className="text-sm leading-snug">
                  {task.title}
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <AreaChip area={areaById[task.area_id]} />
                    {dueLabel(task.due_date)}
                  </span>
                </li>
              ))}
            </ul>
            <Button asChild size="sm" variant="outline" className="mt-3 rounded-full">
              <Link to="/today">Go through them</Link>
            </Button>
          </Surface>
        ) : null}

        {reminders.length ? (
          <Surface className="p-5">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <h3 className="text-base font-medium tracking-tight">Reminders</h3>
            </div>
            <ul className="mt-2 space-y-2">
              {reminders.slice(0, 2).map((reminder) => (
                <li key={reminder.id} className="text-sm leading-snug">
                  {reminder.title}
                  <span className="block text-[11px] text-muted-foreground">
                    {reminder.remind_at ? dueLabel(reminder.remind_at) : "No time set"}
                  </span>
                </li>
              ))}
            </ul>
          </Surface>
        ) : null}
      </div>
    </div>
  );
}

export function upcomingOverdue(tasks) {
  return tasks.filter((t) => t.due_date && isOverdue(t.due_date));
}