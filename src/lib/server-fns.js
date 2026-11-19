import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireUser } from "@/lib/auth-middleware";

const todayISO = () => new Date().toISOString().slice(0, 10);

const KINDS = [
  "task",
  "appointment",
  "reminder",
  "note",
  "idea",
  "goal",
  "shopping",
  "deadline",
  "question",
  "follow_up",
  "decision",
];
const PRIORITIES = ["must", "should", "could", "quick", "waiting", "future"];
const ENERGIES = ["very_low", "low", "moderate", "high", "deep"];

const clean = (value) => (typeof value === "string" ? value.trim() : "");

const normalizeForMatch = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Guards the promise that nothing is invented: an item only survives if the
 * model can point at the words it came from. Works whatever model is behind
 * the call.
 */
const isGrounded = (quote, source) => {
  const q = normalizeForMatch(quote);
  const s = normalizeForMatch(source);
  if (q.length < 4) return false;
  if (s.includes(q)) return true;
  const words = q.split(" ").filter((word) => word.length > 2);
  if (!words.length) return false;
  const hits = words.filter((word) => s.includes(word)).length;
  return hits / words.length >= 0.6;
};

function normalizeItem(item = {}) {
  const kind = KINDS.includes(item.kind) ? item.kind : "task";
  return {
    kind,
    title: clean(item.title).slice(0, 160),
    detail: clean(item.detail).slice(0, 500),
    area_hint: clean(item.area_hint).slice(0, 60),
    due_date: /^\d{4}-\d{2}-\d{2}$/.test(clean(item.due_date)) ? clean(item.due_date) : "",
    priority: PRIORITIES.includes(item.priority) ? item.priority : "should",
    energy: ENERGIES.includes(item.energy) ? item.energy : "moderate",
    estimate_min: Number.isFinite(Number(item.estimate_min)) ? Number(item.estimate_min) : null,
  };
}

/**
 * Brain dump → structured, reviewable items. Nothing is written to the
 * database here: the UI stores proposals and the user approves them.
 */
export const analyzeBrainDump = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ text: z.string().min(1).max(8000) }))
  .handler(async ({ data, context }) => {
    const result = await context.getBase44().asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are the structuring engine inside a private personal life operating system. The user pasted unstructured thoughts (a "brain dump"). Turn it into a small, useful set of concrete items without inventing anything.

Rules:
- Only extract what the text actually contains or directly implies. Never add generic life advice, example tasks, or anything the user did not write.
- Ground every item in the text: source_quote must be copied word-for-word from the user's message (a fragment is fine). If you cannot copy such a fragment, do not include that item.
- Split compound thoughts into separate items when they are separate commitments.
- kind must be one of: ${KINDS.join(", ")}.
- priority: "must" (time-critical or explicitly urgent), "should" (matters soon), "could", "quick" (under 10 minutes), "waiting" (someone else must act first), otherwise "future".
- energy: one of ${ENERGIES.join(", ")}. Guess from the nature of the work; default "moderate".
- due_date: "YYYY-MM-DD" only when the text implies a date (today, tomorrow, a weekday, a date). Otherwise "".
- area_hint: one short noun describing the life area (Work, Home, Health, Family, Finances...). "" when unclear.
- title: imperative, under 90 characters, no trailing period.
- detail: one sentence of context drawn from the user's own words, or "".
- Never diagnose, never moralise, never add advice. Keep the user's own wording where possible.
- Return at most 18 items, most important first.
- summary: one calm sentence describing what you found.

The user's message:
"""
${data.text}
"""

Today's date is ${todayISO()}.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          items: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: { type: "string" },
                title: { type: "string" },
                detail: { type: "string" },
                area_hint: { type: "string" },
                source_quote: { type: "string" },
                due_date: { type: "string" },
                priority: { type: "string" },
                energy: { type: "string" },
                estimate_min: { type: "number" },
              },
              required: ["kind", "title", "source_quote"],
            },
          },
        },
        required: ["summary", "items"],
      },
    });

    const payload = typeof result === "string" ? JSON.parse(result) : result;
    return {
      summary: clean(payload?.summary) || "Here's what I found in what you wrote.",
      items: (Array.isArray(payload?.items) ? payload.items : [])
        // Ungrounded items are dropped rather than guessed at.
        .filter((raw) => clean(raw?.source_quote).length > 2 && isGrounded(raw.source_quote, data.text))
        .map(normalizeItem)
        .filter((item) => item.title)
        .slice(0, 18),
    };
  });

/** Conversational assistant. Returns a reply plus confirmable proposals. */
export const assistantChat = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      message: z.string().min(1).max(4000),
      context: z.string().max(12000).default(""),
      history: z
        .array(z.object({ role: z.string().max(20), content: z.string().max(4000) }))
        .max(16)
        .default([]),
      guidanceStyle: z.enum(["gentle", "direct"]).default("gentle"),
    })
  )
  .handler(async ({ data, context }) => {
    const transcript = data.history
      .map((m) => `${m.role === "user" ? "User" : "You"}: ${m.content}`)
      .join("\n");

    const result = await context.getBase44().asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are Genius, the assistant inside a private personal life operating system. Calm, direct, practical. You never shame the user, never pile on lists, and never claim to have done something you have not done — the user confirms every change.

Tone: ${data.guidanceStyle === "direct" ? "direct and concise" : "warm and gentle, but still concise"}.
Today is ${todayISO()}.

Snapshot of the user's actual data:
---
${data.context || "(no records yet)"}
---

${transcript ? `Earlier in this conversation:\n${transcript}\n` : ""}
The user now says:
"${data.message}"

Return JSON:
- reply: 1-3 short sentences. Answer the actual question. If they ask what matters today, name one or two things and say why. If they are overwhelmed, reduce rather than expand. Never output markdown.
- actions: proposed changes the user must confirm. Only what is clearly implied by what the user said or by their own records. Each: {kind, title, detail, reason, priority, energy, due_date, estimate_min}. kind is one of task|appointment|reminder|note. reason is one short sentence explaining why. due_date is "YYYY-MM-DD" or "". Max 6. Never propose deletions. Never invent appointments, deadlines, tasks or facts.
- memory: one durable fact worth remembering about this person's preferences or life, or "" if nothing is worth keeping.`,
      response_json_schema: {
        type: "object",
        properties: {
          reply: { type: "string" },
          memory: { type: "string" },
          actions: {
            type: "array",
            items: {
              type: "object",
              properties: {
                kind: { type: "string" },
                title: { type: "string" },
                detail: { type: "string" },
                reason: { type: "string" },
                priority: { type: "string" },
                energy: { type: "string" },
                due_date: { type: "string" },
                estimate_min: { type: "number" },
              },
              required: ["kind", "title"],
            },
          },
        },
        required: ["reply", "actions"],
      },
    });

    const payload = typeof result === "string" ? JSON.parse(result) : result;
    return {
      reply: clean(payload?.reply) || "I'm here. What's on your mind?",
      memory: clean(payload?.memory),
      actions: (Array.isArray(payload?.actions) ? payload.actions : [])
        .map((a) => ({
          kind: ["task", "appointment", "reminder", "note"].includes(a.kind) ? a.kind : "task",
          title: clean(a.title).slice(0, 160),
          detail: clean(a.detail).slice(0, 400),
          reason: clean(a.reason).slice(0, 240),
          priority: PRIORITIES.includes(a.priority) ? a.priority : "should",
          energy: ENERGIES.includes(a.energy) ? a.energy : "moderate",
          due_date: /^\d{4}-\d{2}-\d{2}$/.test(clean(a.due_date)) ? clean(a.due_date) : "",
          estimate_min: Number.isFinite(Number(a.estimate_min)) ? Number(a.estimate_min) : null,
        }))
        .filter((a) => a.title)
        .slice(0, 6),
    };
  });

/** Daily briefing from real records. */
export const dailyBriefing = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(
    z.object({
      context: z.string().min(1).max(12000),
      guidanceStyle: z.enum(["gentle", "direct"]).default("gentle"),
    })
  )
  .handler(async ({ data, context }) => {
    const result = await context.getBase44().asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are preparing a short morning briefing inside a personal life operating system.
Tone: ${data.guidanceStyle === "direct" ? "direct" : "calm and gentle"}. Never shame the user. Never invent facts, deadlines or events that are not in the data.
Today is ${todayISO()}.

The user's real data:
---
${data.context}
---

Return JSON:
- headline: one short sentence naming the shape of the day (max 90 chars).
- summary: 2 sentences at most, what matters and what can wait.
- bullets: 2-4 short factual lines (appointments, deadlines, carried-over items, conflicts, preparation needed). Each under 110 chars.
- first_action: one concrete next step, under 110 chars.
- watch_out: one thing that could go wrong or is being forgotten, or "" if nothing.`,
      response_json_schema: {
        type: "object",
        properties: {
          headline: { type: "string" },
          summary: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          first_action: { type: "string" },
          watch_out: { type: "string" },
        },
        required: ["headline", "summary", "bullets", "first_action"],
      },
    });

    const payload = typeof result === "string" ? JSON.parse(result) : result;
    return {
      headline: clean(payload?.headline),
      summary: clean(payload?.summary),
      bullets: (Array.isArray(payload?.bullets) ? payload.bullets : [])
        .map(clean)
        .filter(Boolean)
        .slice(0, 4),
      first_action: clean(payload?.first_action),
      watch_out: clean(payload?.watch_out),
    };
  });

/** Voice capture: upload from the browser, transcribe on the server. */
export const transcribeCapture = createServerFn({ method: "POST" })
  .middleware([requireUser])
  .validator(z.object({ file_url: z.string().url().max(2000) }))
  .handler(async ({ data, context }) => {
    const text = await context.getBase44().asServiceRole.integrations.Core.TranscribeAudio({
      audio_url: data.file_url,
    });
    return { text: clean(text) };
  });