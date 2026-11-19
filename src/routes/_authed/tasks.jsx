import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ListChecks, Plus } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskSheet } from "@/components/tasks/TaskSheet";
import { useCollection } from "@/lib/data";
import { useAreas } from "@/lib/useAreas";
import { dayKey, isOverdue } from "@/lib/format";
import { PRIORITY_GROUPS, ENERGY_LEVELS } from "@/lib/design";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "today", label: "Today" },
  { id: "upcoming", label: "Upcoming" },
  { id: "overdue", label: "Overdue" },
  { id: "unscheduled", label: "Unscheduled" },
  { id: "waiting", label: "Waiting on" },
  { id: "completed", label: "Completed" },
];

const GROUPINGS = [
  { id: "none", label: "No grouping" },
  { id: "area", label: "By life area" },
  { id: "priority", label: "By priority" },
  { id: "energy", label: "By energy" },
];

export const Route = createFileRoute("/_authed/tasks")({
  validateSearch: (search) => ({ view: search.view, group: search.group }),
  head: () => ({ meta: [{ title: "Tasks · LifeOS" }] }),
  component: TasksPage,
});

function TasksPage() {
  const { view = "today", group = "none" } = Route.useSearch();
  const navigate = useNavigate();
  const { areas, byId } = useAreas();
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { items: openTasks, loading, error, reload } = useCollection(
    "Task",
    { status: "open" },
    { sort: "due_date", limit: 300 }
  );
  const { items: doneTasks, reload: reloadDone } = useCollection(
    "Task",
    { status: "done" },
    { sort: "-completed_at", limit: 100 }
  );

  const today = dayKey();
  const source = view === "completed" ? doneTasks : openTasks;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = source.filter((t) => !q || t.title.toLowerCase().includes(q));

    if (view === "today") {
      list = list.filter((t) => (t.due_date && dayKey(t.due_date) === today) || (!t.due_date && t.priority === "must"));
    } else if (view === "upcoming") {
      list = list.filter((t) => t.due_date && new Date(t.due_date) > new Date() && dayKey(t.due_date) !== today);
    } else if (view === "overdue") {
      list = list.filter((t) => t.due_date && isOverdue(t.due_date));
    } else if (view === "unscheduled") {
      list = list.filter((t) => !t.due_date);
    } else if (view === "waiting") {
      list = list.filter((t) => t.priority === "waiting" || t.waiting_on);
    }

    return list.sort((a, b) => {
      if (view === "completed") {
        return new Date(b.completed_at || b.updated_date || 0) - new Date(a.completed_at || a.updated_date || 0);
      }
      return new Date(a.due_date || 8.64e15) - new Date(b.due_date || 8.64e15);
    });
  }, [source, query, view, today]);

  const grouped = useMemo(() => {
    if (group === "none") return [{ key: "all", label: "", items: filtered }];
    if (group === "area") {
      const buckets = new Map();
      filtered.forEach((task) => {
        const key = task.area_id || "none";
        if (!buckets.has(key)) buckets.set(key, []);
        buckets.get(key).push(task);
      });
      return Array.from(buckets.entries()).map(([key, items]) => ({
        key,
        label: byId[key]?.name || "Unsorted",
        items,
      }));
    }
    if (group === "priority") {
      return PRIORITY_GROUPS.map((p) => ({
        key: p.id,
        label: p.label,
        items: filtered.filter((t) => (t.priority || "should") === p.id),
      })).filter((g) => g.items.length);
    }
    return ENERGY_LEVELS.map((e) => ({
      key: e.id,
      label: e.label,
      items: filtered.filter((t) => (t.energy || "moderate") === e.id),
    })).filter((g) => g.items.length);
  }, [filtered, group, byId]);

  const toggle = async (task) => {
    const done = task.status === "done";
    await base44.entities.Task.update(task.id, {
      status: done ? "open" : "done",
      completed_at: done ? "" : new Date().toISOString(),
    });
    reload();
    reloadDone();
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
    reloadDone();
  };

  const handlers = {
    onToggle: toggle,
    onOpen: (task) => {
      setEditing(task);
      setSheetOpen(true);
    },
    onTomorrow: tomorrow,
    onDelete: remove,
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        eyebrow="Everything, in one place"
        title="Tasks"
        description="Only what you've written down. Nothing is invented for you."
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

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter tasks…"
          aria-label="Filter tasks"
          className="h-10 w-full rounded-full border border-border/80 bg-card px-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40 sm:max-w-xs"
        />
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="sr-only sm:not-sr-only">Group</span>
          <select
            value={group}
            onChange={(e) => navigate({ to: "/tasks", search: { view, group: e.target.value } })}
            className="h-10 rounded-full border border-border/80 bg-card px-3 text-xs text-foreground outline-none focus:border-primary/40"
          >
            {GROUPINGS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div role="tablist" aria-label="Task views" className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
        {VIEWS.map((item) => (
          <button
            key={item.id}
            role="tab"
            aria-selected={view === item.id}
            onClick={() => navigate({ to: "/tasks", search: { view: item.id, group } })}
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

      {error ? <ErrorBlock message={error.message} onRetry={reload} /> : null}
      {loading ? <LoadingBlock rows={4} /> : null}

      {!loading && !filtered.length ? (
        <EmptyState
          icon={ListChecks}
          title={view === "completed" ? "Nothing completed yet" : "Nothing here"}
          description={
            view === "completed"
              ? "Ticked-off work will collect here, quietly."
              : "Capture a thought and it can become a task in one step."
          }
          action={
            <Button asChild size="sm" variant="outline" className="rounded-full">
              <a href="/brain-dump">Open brain dump</a>
            </Button>
          }
        />
      ) : null}

      <div className="space-y-5">
        {grouped.map((section) => (
          <section key={section.key} aria-label={section.label || "Tasks"}>
            {section.label ? (
              <div className="mb-2 flex items-baseline justify-between px-1">
                <h2 className="text-sm font-medium">{section.label}</h2>
                <span className="tabular text-xs text-muted-foreground">{section.items.length}</span>
              </div>
            ) : null}
            <Surface className="p-2">
              <ul>
                {section.items.map((task) => (
                  <TaskRow key={task.id} task={task} area={byId[task.area_id]} {...handlers} />
                ))}
              </ul>
            </Surface>
          </section>
        ))}
      </div>

      {filtered.length ? (
        <p className="px-1 text-xs text-muted-foreground">
          {filtered.length} item{filtered.length === 1 ? "" : "s"}
          {view === "waiting" ? " · these move when someone else does" : ""}
        </p>
      ) : null}

      <TaskSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        task={editing}
        areas={areas}
        onSaved={() => {
          reload();
          reloadDone();
        }}
      />
    </div>
  );
}