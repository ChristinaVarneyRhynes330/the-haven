import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin, Plus, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { AreaChip } from "@/components/shared/AreaChip";
import { EventSheet } from "@/components/calendar/EventSheet";
import { useCollection } from "@/lib/data";
import { useAreas } from "@/lib/useAreas";
import { fmtTime, toDate } from "@/lib/format";
import { areaDot } from "@/lib/design";
import { cn } from "@/lib/utils";

const VIEWS = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "agenda", label: "Agenda" },
];

export const Route = createFileRoute("/_authed/calendar")({
  validateSearch: (search) => ({ view: search.view, date: search.date }),
  head: () => ({ meta: [{ title: "Calendar · LifeOS" }] }),
  component: CalendarPage,
});

function CalendarPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { items: events, reload } = useCollection("Event", {}, { sort: "start_at", limit: 300 });
  const { areas, byId } = useAreas();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const view = search.view || "month";
  const selected = toDate(search.date) || new Date();
  const setSearch = (patch) =>
    navigate({
      to: "/calendar",
      search: {
        view: patch.view ?? view,
        date: format(patch.date ?? selected, "yyyy-MM-dd"),
      },
      replace: true,
    });

  const forDay = (day) =>
    events
      .filter((e) => e.start_at && isSameDay(toDate(e.start_at), day))
      .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));

  const monthStart = startOfMonth(selected);
  const gridDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(monthStart, { weekStartsOn: 0 }),
        end: endOfWeek(endOfMonth(monthStart), { weekStartsOn: 0 }),
      }),
    [monthStart]
  );

  const weekDays = useMemo(
    () =>
      eachDayOfInterval({
        start: startOfWeek(selected, { weekStartsOn: 0 }),
        end: endOfWeek(selected, { weekStartsOn: 0 }),
      }),
    [selected]
  );

  const agendaDays = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return eachDayOfInterval({ start, end: addDays(start, 45) })
      .map((day) => ({ day, items: forDay(day) }))
      .filter((entry) => entry.items.length);
  }, [events]);

  const openNew = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  return (
    <div className="animate-fade-in space-y-5">
      <PageHeader
        eyebrow="Time, honestly held"
        title="Calendar"
        description="Your own appointments, with preparation and travel counted. External calendars aren't connected yet."
        actions={
          <Button size="sm" className="gap-1.5 rounded-full" onClick={openNew}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New event
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label="Previous"
            onClick={() => {
              const next = view === "month" ? subMonths(selected, 1) : addDays(selected, view === "week" ? -7 : -1);
              setSearch({ date: next });
            }}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-full"
            aria-label="Next"
            onClick={() => {
              const next = view === "month" ? addMonths(selected, 1) : addDays(selected, view === "week" ? 7 : 1);
              setSearch({ date: next });
            }}
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="rounded-full text-muted-foreground"
            onClick={() => setSearch({ date: new Date() })}
          >
            Today
          </Button>
        </div>

        <p className="font-display text-lg tracking-tight">
          {view === "day"
            ? format(selected, "EEEE, MMMM d")
            : view === "week"
              ? `${format(weekDays[0], "MMM d")} – ${format(weekDays[6], "MMM d")}`
              : format(monthStart, "MMMM yyyy")}
        </p>

        <div role="tablist" aria-label="Calendar views" className="flex gap-1">
          {VIEWS.map((item) => (
            <button
              key={item.id}
              role="tab"
              aria-selected={view === item.id}
              onClick={() => setSearch({ view: item.id })}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                view === item.id ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {view === "month" ? (
        <Surface className="overflow-hidden p-2 sm:p-3">
          <div className="grid grid-cols-7 pb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((label) => (
              <div key={label} className="px-1 pb-1 text-center text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                {label}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {gridDays.map((day) => {
              const items = forDay(day);
              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => setSearch({ view: "day", date: day })}
                  className={cn(
                    "min-h-[74px] rounded-lg border border-transparent p-1.5 text-left transition-colors hover:border-border/80 hover:bg-secondary/40",
                    !isSameMonth(day, monthStart) && "opacity-45",
                    isSameDay(day, selected) && "border-primary/40 bg-primary/[0.06]"
                  )}
                >
                  <span
                    className={cn(
                      "tabular inline-grid h-5 w-5 place-items-center rounded-full text-[11px]",
                      isToday(day) && "bg-primary text-primary-foreground"
                    )}
                  >
                    {format(day, "d")}
                  </span>
                  <span className="mt-1 block space-y-0.5">
                    {items.slice(0, 2).map((event) => (
                      <span
                        key={event.id}
                        className="flex items-center gap-1 truncate text-[10px] leading-tight text-muted-foreground"
                      >
                        <span
                          className={cn("h-1.5 w-1.5 shrink-0 rounded-full", areaDot(byId[event.area_id]?.tone))}
                          aria-hidden="true"
                        />
                        <span className="truncate">{event.title}</span>
                      </span>
                    ))}
                    {items.length > 2 ? (
                      <span className="block text-[10px] text-muted-foreground">+{items.length - 2}</span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </Surface>
      ) : null}

      {view === "week" ? (
        <div className="grid gap-2 sm:grid-cols-7">
          {weekDays.map((day) => (
            <Surface key={day.toISOString()} className={cn("p-2.5", isToday(day) && "border-primary/40")}>
              <button
                type="button"
                onClick={() => setSearch({ view: "day", date: day })}
                className="w-full text-left"
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                  {format(day, "EEE")}
                </p>
                <p className={cn("tabular text-sm font-medium", isToday(day) && "text-primary")}>
                  {format(day, "d")}
                </p>
              </button>
              <div className="mt-2 space-y-1.5">
                {forDay(day).map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => {
                      setEditing(event);
                      setSheetOpen(true);
                    }}
                    className="block w-full rounded-md bg-secondary/60 px-1.5 py-1 text-left"
                  >
                    <span className="block text-[10px] leading-tight text-muted-foreground">
                      {fmtTime(event.start_at)}
                    </span>
                    <span className="block text-[11px] leading-snug">{event.title}</span>
                  </button>
                ))}
              </div>
            </Surface>
          ))}
        </div>
      ) : null}

      {view === "day" ? (
        <div className="space-y-3">
          {forDay(selected).length ? (
            forDay(selected).map((event) => (
              <EventRow
                key={event.id}
                event={event}
                area={byId[event.area_id]}
                onOpen={() => {
                  setEditing(event);
                  setSheetOpen(true);
                }}
              />
            ))
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Nothing on this day"
              description="Open space. Add something only if it earns its place."
              action={
                <Button size="sm" variant="outline" className="rounded-full" onClick={openNew}>
                  Add an appointment
                </Button>
              }
            />
          )}
        </div>
      ) : null}

      {view === "agenda" ? (
        <div className="space-y-5">
          {agendaDays.length ? (
            agendaDays.map(({ day, items }) => (
              <section key={day.toISOString()} aria-label={format(day, "EEEE, MMMM d")}>
                <h2 className="mb-2 px-1 text-sm font-medium">
                  {format(day, "EEEE")}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {format(day, "MMM d")}
                  </span>
                </h2>
                <div className="space-y-2">
                  {items.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      area={byId[event.area_id]}
                      onOpen={() => {
                        setEditing(event);
                        setSheetOpen(true);
                      }}
                    />
                  ))}
                </div>
              </section>
            ))
          ) : (
            <EmptyState
              icon={CalendarDays}
              title="Nothing scheduled in the next six weeks"
              description="Either a very calm season, or nothing written down yet."
            />
          )}
        </div>
      ) : null}

      <EventSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        event={editing}
        areas={areas}
        onSaved={reload}
      />
    </div>
  );
}

function EventRow({ event, area, onOpen }) {
  return (
    <Surface className="p-4">
      <button type="button" onClick={onOpen} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium leading-snug">{event.title}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
              <span className="tabular inline-flex items-center gap-1">
                <Clock className="h-3 w-3" aria-hidden="true" />
                {fmtTime(event.start_at)}
                {event.end_at ? ` – ${fmtTime(event.end_at)}` : ""}
              </span>
              <AreaChip area={area} />
              {event.location ? (
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {event.location}
                </span>
              ) : null}
              {event.meeting_link ? (
                <span className="inline-flex items-center gap-1">
                  <Video className="h-3 w-3" aria-hidden="true" />
                  Link attached
                </span>
              ) : null}
            </p>
            {event.prep_min || event.travel_min ? (
              <p className="mt-1.5 text-[11px] text-muted-foreground">
                {event.prep_min ? `${event.prep_min} min prep` : ""}
                {event.prep_min && event.travel_min ? " · " : ""}
                {event.travel_min ? `${event.travel_min} min travel` : ""}
              </p>
            ) : null}
          </div>
        </div>
      </button>
    </Surface>
  );
}