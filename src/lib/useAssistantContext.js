import { useMemo } from "react";
import { useCollection, useProfile } from "./data";
import { useAreas } from "./useAreas";
import { buildContext } from "./proposals";
import { dayKey as dayKeyFn } from "./format";

/** The factual snapshot the assistant and briefing reason over. */
export function useAssistantContext() {
  const { profile } = useProfile();
  const { areas, byId } = useAreas();
  const { items: tasks } = useCollection("Task", { status: "open" }, { limit: 200 });
  const { items: events } = useCollection("Event", {}, { sort: "start_at", limit: 100 });
  const { items: reminders } = useCollection("Reminder", { status: "pending" }, { limit: 50 });
  const { items: checkins } = useCollection("Checkin", { day_key: dayKeyFn() }, { limit: 2 });
  const { items: memories } = useCollection("AiMemory", { active: true }, { limit: 40 });

  const context = useMemo(() => {
    const base = buildContext({
      tasks,
      events,
      reminders,
      areas,
      checkin: checkins[0],
      profile,
    });
    const memoryLines = memories.map((m) => `- ${m.content}`).join("\n");
    return memoryLines ? `${base}\n\nThings worth remembering about this person:\n${memoryLines}` : base;
  }, [tasks, events, reminders, areas, checkins, profile, memories]);

  return {
    context,
    areas,
    byId,
    profile,
    memories,
    tasks,
    events,
    checkins,
    today: dayKeyFn(),
  };
}