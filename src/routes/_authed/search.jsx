import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Inbox, Layers, ListChecks, NotebookPen, Search, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { AreaChip } from "@/components/shared/AreaChip";
import { useCollection } from "@/lib/data";
import { useAreas } from "@/lib/useAreas";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";

const TYPES = [
  { id: "all", label: "Everything" },
  { id: "task", label: "Tasks" },
  { id: "event", label: "Appointments" },
  { id: "note", label: "Notes" },
  { id: "dump", label: "Brain dumps" },
  { id: "area", label: "Life areas" },
  { id: "conversation", label: "Conversations" },
];

export const Route = createFileRoute("/_authed/search")({
  validateSearch: (search) => ({ q: search.q, type: search.type }),
  head: () => ({ meta: [{ title: "Search · LifeOS" }] }),
  component: SearchPage,
});

function SearchPage() {
  const { q = "", type = "all" } = Route.useSearch();
  const { byId } = useAreas();
  const [query, setQuery] = useState(q);

  const { items: tasks } = useCollection("Task", {}, { limit: 300 });
  const { items: events } = useCollection("Event", {}, { sort: "start_at", limit: 200 });
  const { items: notes } = useCollection("Note", {}, { limit: 200 });
  const { items: dumps } = useCollection("BrainDump", {}, { sort: "-created_date", limit: 100 });
  const { items: areas } = useCollection("LifeArea", { archived: { $ne: true } }, { limit: 100 });
  const { items: conversations } = useCollection("Conversation", {}, { sort: "-last_message_at", limit: 50 });

  const term = (q || "").trim().toLowerCase();

  const results = useMemo(() => {
    if (!term) return [];
    const has = (value) => (value || "").toLowerCase().includes(term);
    const include = (kind) => type === "all" || type === kind;

    const list = [];
    if (include("task")) {
      tasks
        .filter((t) => has(t.title) || has(t.description))
        .slice(0, 20)
        .forEach((t) =>
          list.push({
            key: `task-${t.id}`,
            kind: "task",
            title: t.title,
            meta: t.due_date ? `${t.status === "done" ? "Done · " : ""}${fmtDate(t.due_date, "MMM d")}` : t.status,
            area: byId[t.area_id],
            to: t.status === "open" ? `/focus/${t.id}` : "/tasks",
          })
        );
    }
    if (include("event")) {
      events
        .filter((e) => has(e.title) || has(e.description) || has(e.location))
        .slice(0, 20)
        .forEach((e) =>
          list.push({
            key: `event-${e.id}`,
            kind: "event",
            title: e.title,
            meta: `${fmtDate(e.start_at, "MMM d")} · ${fmtTime(e.start_at)}`,
            area: byId[e.area_id],
            to: "/calendar",
          })
        );
    }
    if (include("note")) {
      notes
        .filter((n) => has(n.title) || has(n.body))
        .slice(0, 20)
        .forEach((n) =>
          list.push({
            key: `note-${n.id}`,
            kind: "note",
            title: n.title,
            meta: (n.body || "").slice(0, 70),
            area: byId[n.area_id],
            to: `/life-areas/${n.area_id || ""}`,
          })
        );
    }
    if (include("dump")) {
      dumps
        .filter((d) => has(d.raw_text))
        .slice(0, 20)
        .forEach((d) =>
          list.push({
            key: `dump-${d.id}`,
            kind: "dump",
            title: (d.raw_text || "").slice(0, 90),
            meta: fmtDate(d.created_date, "MMM d"),
            to: `/brain-dump/${d.id}`,
          })
        );
    }
    if (include("area")) {
      areas
        .filter((a) => has(a.name) || has(a.description))
        .forEach((a) =>
          list.push({
            key: `area-${a.id}`,
            kind: "area",
            title: a.name,
            meta: a.description,
            area: a,
            to: `/life-areas/${a.id}`,
          })
        );
    }
    if (include("conversation")) {
      conversations
        .filter((c) => has(c.title))
        .slice(0, 20)
        .forEach((c) =>
          list.push({
            key: `conversation-${c.id}`,
            kind: "conversation",
            title: c.title,
            meta: fmtDate(c.last_message_at, "MMM d"),
            to: `/assistant/${c.id}`,
          })
        );
    }
    return list;
  }, [term, type, tasks, events, notes, dumps, areas, conversations, byId]);

  const submit = (value, nextType = type) => {
    setQuery(value);
    const params = new URLSearchParams();
    if (value) params.set("q", value);
    if (nextType !== "all") params.set("type", nextType);
    window.history.replaceState(null, "", `/search${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        eyebrow="Find anything"
        title="Search"
        description="Across tasks, appointments, notes, dumps, areas and conversations."
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit(query);
        }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => submit(e.target.value)}
            placeholder="Where did I put that…"
            aria-label="Search everything"
            className="h-11 w-full rounded-full border border-border/80 bg-card pl-10 pr-4 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40"
          />
        </div>
      </form>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {TYPES.map((item) => (
          <Link
            key={item.id}
            to="/search"
            search={{ q: query || undefined, type: item.id === "all" ? undefined : item.id }}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              type === item.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      {!term ? (
        <EmptyState
          icon={Search}
          title="Start typing"
          description="Search works on what you've already written down — nothing leaves your account to find it."
        />
      ) : null}

      {term && !results.length ? (
        <EmptyState icon={Inbox} title="Nothing matches that" description="Try a shorter word, or a different type." />
      ) : null}

      <div className="space-y-2">
        {results.map((result) => (
          <Surface key={result.key} className="p-3.5">
            <Link to={result.to} className="flex items-start gap-3">
              <TypeIcon kind={result.kind} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium leading-snug">{result.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    {result.kind}
                  </span>
                  {result.meta ? (
                    <span className="truncate text-[11px] text-muted-foreground">{result.meta}</span>
                  ) : null}
                  {result.area ? <AreaChip area={result.area} /> : null}
                </div>
              </div>
            </Link>
          </Surface>
        ))}
      </div>

      {results.length ? (
        <p className="px-1 text-xs text-muted-foreground">{results.length} result(s)</p>
      ) : null}
    </div>
  );
}

function TypeIcon({ kind }) {
  const map = {
    task: ListChecks,
    event: CalendarDays,
    note: NotebookPen,
    dump: Inbox,
    area: Layers,
    conversation: Sparkles,
  };
  const Icon = map[kind] || Search;
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-secondary text-secondary-foreground">
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
    </span>
  );
}