import { base44 } from "@/api/base44Client";
import { combineDateTime, dayKey } from "./format";

/**
 * Turns an approved proposal into a real record.
 * Every consequential write in the AI layer goes through here — one place,
 * one shape, easy to audit.
 */
export async function createRecordFromProposal(proposal) {
  const base = {
    ...(proposal.area_id ? { area_id: proposal.area_id } : {}),
  };

  const kind = proposal.kind;

  if (kind === "appointment") {
    const start = proposal.due_date
      ? combineDateTime(proposal.due_date, "09:00")
      : new Date(new Date().setHours(9, 0, 0, 0)).toISOString();
    const end = new Date(new Date(start).getTime() + 60 * 60 * 1000).toISOString();
    const record = await base44.entities.Event.create({
      ...base,
      title: proposal.title,
      description: proposal.detail || "",
      start_at: start,
      end_at: end,
      recurrence: "none",
    });
    return { type: "Event", record };
  }

  if (kind === "reminder") {
    const remindAt = proposal.due_date
      ? combineDateTime(proposal.due_date, "09:00")
      : new Date(new Date().setHours(18, 0, 0, 0)).toISOString();
    const record = await base44.entities.Reminder.create({
      ...base,
      title: proposal.title,
      note: proposal.detail || "",
      remind_at: remindAt,
      kind: "follow_up",
      status: "pending",
      recurrence: "none",
    });
    return { type: "Reminder", record };
  }

  if (kind === "note" || kind === "idea" || kind === "decision") {
    const record = await base44.entities.Note.create({
      ...base,
      title: proposal.title,
      body: proposal.detail || "",
      kind: kind === "idea" ? "idea" : "general",
    });
    return { type: "Note", record };
  }

  // Everything else is actionable: task, shopping, deadline, follow_up, question, goal
  const record = await base44.entities.Task.create({
    ...base,
    title: proposal.title,
    description: proposal.detail || "",
    priority: proposal.priority || "should",
    energy: proposal.energy || "moderate",
    estimate_min: proposal.estimate_min || undefined,
    due_date: proposal.due_date || undefined,
    status: "open",
    source: proposal.source === "brain_dump" ? "brain_dump" : "assistant",
    tags: kind === "shopping" ? ["shopping"] : [],
  });
  return { type: "Task", record };
}

/** Persist a set of proposals from an AI response. */
export async function saveProposals(items, meta = {}) {
  if (!items?.length) return [];
  const rows = items.map((item, index) => ({
    source: meta.source || "brain_dump",
    dump_id: meta.dumpId || undefined,
    conversation_id: meta.conversationId || undefined,
    kind: item.kind || "task",
    title: item.title,
    detail: item.detail || "",
    reason: item.reason || "",
    area_id: item.area_id || undefined,
    due_date: item.due_date || undefined,
    priority: item.priority || "should",
    energy: item.energy || "moderate",
    estimate_min: item.estimate_min || undefined,
    status: "pending",
    order_index: index,
  }));
  return base44.entities.Proposal.bulkCreate(rows);
}

/** Approve one proposal: creates the record and marks the proposal approved. */
export async function approveProposal(proposal) {
  const { type, record } = await createRecordFromProposal(proposal);
  await base44.entities.Proposal.update(proposal.id, {
    status: "approved",
    created_record_type: type,
    created_record_id: record.id,
  });
  return { type, record };
}

export async function ignoreProposal(proposal) {
  return base44.entities.Proposal.update(proposal.id, { status: "ignored" });
}

/** Compact, factual snapshot handed to the assistant and the briefing. */
export function buildContext({ tasks = [], events = [], reminders = [], areas = [], checkin, profile }) {
  const today = dayKey();
  const areaName = (id) => areas.find((a) => a.id === id)?.name || "Unsorted";
  const open = tasks.filter((t) => t.status === "open");

  const lines = [];
  if (profile?.preferred_name) lines.push(`Preferred name: ${profile.preferred_name}`);
  if (checkin) {
    lines.push(
      `Today's check-in: energy ${checkin.energy ?? "-"}/5, mood ${checkin.mood ?? "-"}/5, overwhelm ${checkin.overwhelm ?? "-"}/5.`
    );
  }
  lines.push(`Today is ${today}.`);

  const todays = open.filter((t) => t.due_date && dayKey(t.due_date) === today);
  const overdue = open.filter(
    (t) => t.due_date && new Date(t.due_date) < new Date() && dayKey(t.due_date) !== today
  );
  const upcoming = open
    .filter((t) => t.due_date && new Date(t.due_date) > new Date())
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 8);

  lines.push(
    `Open tasks: ${open.length} (must: ${open.filter((t) => t.priority === "must").length}, waiting: ${open.filter((t) => t.priority === "waiting").length}).`
  );
  if (todays.length) {
    lines.push(
      "Due today:\n" +
        todays
          .map((t) => `- ${t.title} [${t.priority}] (${areaName(t.area_id)})${t.postponed_count ? ` — postponed ${t.postponed_count}x` : ""}`)
          .join("\n")
    );
  }
  if (overdue.length) {
    lines.push("Overdue:\n" + overdue.map((t) => `- ${t.title} (${areaName(t.area_id)})`).join("\n"));
  }
  if (upcoming.length) {
    lines.push(
      "Upcoming:\n" +
        upcoming.map((t) => `- ${t.title} — ${String(t.due_date).slice(0, 10)} (${areaName(t.area_id)})`).join("\n")
    );
  }

  const todaysEvents = events
    .filter((e) => e.start_at && dayKey(e.start_at) === today)
    .sort((a, b) => new Date(a.start_at) - new Date(b.start_at));
  if (todaysEvents.length) {
    lines.push(
      "Calendar today:\n" +
        todaysEvents
          .map(
            (e) =>
              `- ${new Date(e.start_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} ${e.title}`
          )
          .join("\n")
    );
  }

  const pending = reminders.filter((r) => r.status === "pending").slice(0, 6);
  if (pending.length) {
    lines.push("Reminders:\n" + pending.map((r) => `- ${r.title} (${String(r.remind_at || "").slice(0, 16)})`).join("\n"));
  }

  if (areas.filter((a) => !a.archived).length) {
    lines.push(`Life areas: ${areas.filter((a) => !a.archived).map((a) => a.name).join(", ")}.`);
  }

  return lines.join("\n");
}