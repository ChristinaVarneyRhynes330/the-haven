import { useState } from "react";
import { createFileRoute, Link, Outlet, useMatchRoute, useNavigate } from "@tanstack/react-router";
import { MessagesSquare, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, LoadingBlock } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { Composer } from "@/components/assistant/Composer";
import { useCollection } from "@/lib/data";
import { useAssistantContext } from "@/lib/useAssistantContext";
import { runAssistantTurn, rememberFact } from "@/lib/assistant";
import { fmtDate } from "@/lib/format";

const STARTERS = [
  "What actually matters today?",
  "What am I forgetting?",
  "I'm overwhelmed. Simplify today.",
  "Help me plan tomorrow.",
  "What have I been putting off?",
];

export const Route = createFileRoute("/_authed/assistant")({
  head: () => ({ meta: [{ title: "Assistant · LifeOS" }] }),
  component: AssistantPage,
});

function AssistantPage() {
  const navigate = useNavigate();
  const { context, profile } = useAssistantContext();
  const { items: conversations, loading } = useCollection(
    "Conversation",
    {},
    { sort: "-last_message_at", limit: 20 }
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const matchRoute = useMatchRoute();
  const isDetail = !!matchRoute({ to: "/assistant/$conversationId" });

  const send = async (message) => {
    setBusy(true);
    setError("");
    try {
      const result = await runAssistantTurn({
        conversation: null,
        message,
        context,
        guidanceStyle: profile?.guidance_style,
      });
      if (result.memory && !profile?.ai_personalization_paused) {
        await rememberFact(result.memory);
      }
      navigate({ to: "/assistant/$conversationId", params: { conversationId: result.conversation.id } });
    } catch (err) {
      setError(err?.message || "The assistant couldn't respond just now. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  };

  if (isDetail) return <Outlet />;

  return (
    <div className="animate-fade-in space-y-7">
      <PageHeader
        eyebrow="Your intelligence layer"
        title="Ask me anything about your life"
        description="I can see the things you've written down — tasks, appointments, reminders, areas — and nothing else."
      />

      <Surface className="border-primary/20 bg-primary/[0.04] p-4 sm:p-6">
        <Composer onSend={send} busy={busy} suggestions={STARTERS} autoFocus />
        {error ? (
          <p role="alert" className="mt-3 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </Surface>

      <section aria-label="Recent conversations" className="space-y-3">
        <h2 className="text-base font-medium tracking-tight">Recent conversations</h2>
        {loading ? <LoadingBlock rows={2} /> : null}
        {!loading && !conversations.length ? (
          <EmptyState
            icon={MessagesSquare}
            title="No conversations yet"
            description="Start with one messy sentence. That's usually enough."
          />
        ) : null}
        <div className="space-y-2">
          {conversations.map((conversation) => (
            <Link
              key={conversation.id}
              to="/assistant/$conversationId"
              params={{ conversationId: conversation.id }}
              className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-colors hover:border-primary/30"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{conversation.title || "Conversation"}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {conversation.messages?.length || 0} messages ·{" "}
                  {fmtDate(conversation.last_message_at, "MMM d")}
                </p>
              </div>
              <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}