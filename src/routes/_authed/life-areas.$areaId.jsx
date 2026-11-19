import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, ListChecks, NotebookPen } from "lucide-react";
import { PageHeader, BackLink } from "@/components/shared/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { TaskRow } from "@/components/tasks/TaskRow";
import { AreaIcon } from "@/components/shared/AreaIcon";
import { useRecord, useCollection } from "@/lib/data";
import { useAreas } from "@/lib/useAreas";
import { areaSoft } from "@/lib/design";
import { cn } from "@/lib/utils";
import { fmtDate, fmtTime, isOverdue } from "@/lib/format";
import { base44 } from "@/api/base44Client";

export const Route = createFileRoute("/_authed/life-areas/$areaId")({
  head: () => ({ meta: [{ title: "Life area · LifeOS" }] }),
  component: LifeAreaPage,
});

function LifeAreaPage() {
  const { areaId } = Route.useParams();
  const { record: area, loading } = useRecord("LifeArea", areaId);
  const { byId } = useAreas();
  const { items: tasks, reload } = useCollection("Task", { area_id: areaId }, { sort: "due_date", limit: 200 });
  const { items: events } = useCollection("Event", { area_id: areaId }, { sort: "start_at", limit: 100 });
  const { items: notes } = useCollection("Note", { area_id: areaId }, { limit: 20 });

  const open = tasks.filter((t) => t.status === "open");
  const done = tasks.filter((t) => t.status === "done");
  const upcomingEvents = useMemo(
    () => events.filter((e) => e.start_at && new Date(e.start_at) >= new Date()).slice(0, 5),
    [events]
  );
  const overdue = open.filter((t) => t.due_date && isOverdue(t.due_date));

  const toggle = async (task) => {
    await base44.entities.Task.update(task.id, {
      status: task.status === "done" ? "open" : "done",
      completed_at: new Date().toISOString(),
    });
    reload();
  };

  if (loading) return <LoadingBlock rows={4} />;

  if (!area) {
    return (
      <EmptyState
        icon={ListChecks}
        title="That area isn't here"
        description="It may have been archived or deleted."
        action={
          <Link to="/life-areas" className="text-sm text-primary">
            Back to life areas
          </Link>
        }
      />
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      <div className="space-y-3">
        <BackLink to="/life-areas">Life areas</BackLink>
        <div className="flex items-center gap-3">
          <span className={cn("grid h-12 w-12 place-items-center rounded-2xl", areaSoft(area.tone))}>
            <AreaIcon name={area.icon} className="h-5 w-5" />
          </span>
          <PageHeader title={area.name} description={area.description} />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Open" value={open.length} />
        <Stat label="Done" value={done.length} />
        <Stat label="Overdue" value={overdue.length} />
      </div>

      <section aria-label="Tasks" className="space-y-2">
        <h2 className="text-sm font-medium">Open work</h2>
        {open.length ? (
          <Surface className="p-2">
            <ul>
              {open.map((task) => (
                <TaskRow key={task.id} task={task} area={area} onToggle={toggle} />
              ))}
            </ul>
          </Surface>
        ) : (
          <EmptyState icon={ListChecks} title="Nothing open here" description="Quiet, in the best way." />
        )}
      </section>

      <section aria-label="Appointments" className="space-y-2">
        <h2 className="text-sm font-medium">Coming up</h2>
        {upcomingEvents.length ? (
          <Surface className="divide-y divide-border/60 p-0">
            {upcomingEvents.map((event) => (
              <div key={event.id} className="flex items-center gap-3 px-4 py-3">
                <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm">{event.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {fmtDate(event.start_at, "MMM d")} · {fmtTime(event.start_at)}
                  </p>
                </div>
              </div>
            ))}
          </Surface>
        ) : (
          <EmptyState icon={CalendarDays} title="No appointments booked" />
        )}
      </section>

      <section aria-label="Notes" className="space-y-2">
        <h2 className="text-sm font-medium">Notes</h2>
        {notes.length ? (
          <Surface className="divide-y divide-border/60 p-0">
            {notes.map((note) => (
              <div key={note.id} className="px-4 py-3">
                <p className="text-sm font-medium">{note.title}</p>
                {note.body ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{note.body}</p>
                ) : null}
              </div>
            ))}
          </Surface>
        ) : (
          <EmptyState icon={NotebookPen} title="No notes yet" />
        )}
      </section>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <Surface className="p-3 text-center">
      <p className="tabular font-display text-xl">{value}</p>
      <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
    </Surface>
  );
}