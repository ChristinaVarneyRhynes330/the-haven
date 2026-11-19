import { base44 } from "@/api/base44Client";
import { assistantChat } from "./server-fns";
import { saveProposals } from "./proposals";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `m-${Date.now()}-${Math.round(Math.random() * 1e6)}`;

/**
 * One assistant turn: persist the user's words first (never lose them), then
 * ask for a reply, then persist the reply with its confirmable proposals.
 */
export async function runAssistantTurn({ conversation, message, context, guidanceStyle }) {
  const now = new Date().toISOString();
  let convo = conversation;

  if (!convo?.id) {
    convo = await base44.entities.Conversation.create({
      title: message.slice(0, 70),
      messages: [],
      last_message_at: now,
    });
  }

  const existing = convo.messages || [];
  const userMessage = { id: uid(), role: "user", content: message, at: now };
  await base44.entities.Conversation.update(convo.id, {
    messages: [...existing, userMessage],
    last_message_at: now,
  });

  const result = await assistantChat({
    data: {
      message,
      context,
      history: existing.slice(-10).map((m) => ({ role: m.role, content: m.content })),
      guidanceStyle: guidanceStyle === "direct" ? "direct" : "gentle",
    },
  });

  const proposals = await saveProposals(result.actions, {
    source: "assistant",
    conversationId: convo.id,
  });

  const assistantMessage = {
    id: uid(),
    role: "assistant",
    content: result.reply,
    at: new Date().toISOString(),
    proposal_ids: proposals.map((p) => p.id),
  };

  const updated = await base44.entities.Conversation.update(convo.id, {
    messages: [...existing, userMessage, assistantMessage],
    last_message_at: assistantMessage.at,
  });

  return {
    conversation: updated || { ...convo, messages: [...existing, userMessage, assistantMessage] },
    proposals,
    memory: result.memory,
  };
}

export async function rememberFact(content, source = "assistant") {
  return base44.entities.AiMemory.create({ content, source, active: true });
}