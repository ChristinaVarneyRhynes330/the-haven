import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { base44 } from "@/api/base44Client";
import { BackLink } from "@/components/shared/PageHeader";
import { LoadingBlock, ErrorBlock } from "@/components/shared/States";
import { Composer } from "@/components/assistant/Composer";
import { MessageThread } from "@/components/assistant/MessageThread";
import { useRecord } from "@/lib/data";
import { useAssistantContext } from "@/lib/useAssistantContext";
import { runAssistantTurn, rememberFact } from "@/lib/assistant";
import { approveProposal, ignoreProposal } from "@/lib/proposals";
import { fmtDate } from "@/lib/format";

export const Route = createFileRoute("/_authed/assistant/$conversationId")({
  head: () => ({ meta: [{ title: "Assistant · LifeOS" }] }),
  component: ConversationPage,
});

function ConversationPage() {
  const { conversationId } = Route.useParams();
  const { context, profile, byId } = useAssistantContext();
  const { record: conversation, loading, error, reload } = useRecord("Conversation", conversationId);
  const [proposals, setProposals] = useState([]);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [sendError, setSendError] = useState("");
  const [memoryNote, setMemoryNote] = useState("");

  const loadProposals = useCallback(async () => {
    const result = await base44.entities.Proposal.filter(
      { conversation_id: conversationId },
      { sort: "order_index", limit: 80 }
    );
    setProposals(Array.isArray(result) ? result : result?.items || []);
  }, [conversationId]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const send = async (message) => {
    setBusy(true);
    setSendError("");
    setMemoryNote("");
    try {
      const result = await runAssistantTurn({
        conversation,
        message,
        context,
        guidanceStyle: profile?.guidance_style,
      });
      if (result.memory && !profile?.ai_personalization_paused) {
        await rememberFact(result.memory);
        setMemoryNote(result.memory);
      }
      await reload();
      await loadProposals();
    } catch (err) {
      setSendError(err?.message || "That didn't send. Your message is saved — try again.");
      await reload();
    } finally {
      setBusy(false);
    }
  };

  const approve = async (proposal) => {
    setBusyId(proposal.id);
    try {
      const areaId =
        proposal.area_id ||
        (typeof proposal.area_id === "string" ? proposal.area_id : "");
      await approveProposal({ ...proposal, area_id: areaId });
      await loadProposals();
    } finally {
      setBusyId("");
    }
  };

  const ignore = async (proposal) => {
    setBusyId(proposal.id);
    try {
      await ignoreProposal(proposal);
      await loadProposals();
    } finally {
      setBusyId("");
    }
  };

  const saveEdit = async (proposal) => {
    await base44.entities.Proposal.update(proposal.id, { title: proposal.title });
    await loadProposals();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <BackLink to="/assistant">Assistant</BackLink>
        <LoadingBlock rows={4} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <BackLink to="/assistant">Assistant</BackLink>
        <ErrorBlock message={error.message} onRetry={reload} />
      </div>
    );
  }

  return (
    <div className="flex min-h-[calc(100vh-10rem)] flex-col">
      <div className="space-y-1 border-b border-border/60 pb-3">
        <BackLink to="/assistant">All conversations</BackLink>
        <h1 className="font-display text-xl tracking-tight">{conversation?.title || "Conversation"}</h1>
        <p className="text-[11px] text-muted-foreground">
          Started {fmtDate(conversation?.created_date, "MMM d, yyyy")} · suggestions only
        </p>
      </div>

      <div className="flex-1 space-y-4 py-5">
        {conversation?.messages?.length ? (
          <MessageThread
            messages={conversation.messages}
            proposals={proposals}
            byId={byId}
            onApprove={approve}
            onIgnore={ignore}
            onEdit={saveEdit}
            busyId={busyId}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            Nothing here yet. Ask something like "what am I forgetting?"
          </p>
        )}

        {memoryNote ? (
          <p className="rounded-xl bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">
            Remembered for next time: {memoryNote}
          </p>
        ) : null}

        {sendError ? (
          <p role="alert" className="text-sm text-destructive">
            {sendError}
          </p>
        ) : null}
      </div>

      <div className="sticky bottom-20 border-t border-border/60 bg-background/90 pt-3 backdrop-blur lg:bottom-0">
        <Composer onSend={send} busy={busy} placeholder="Ask, or think out loud…" />
      </div>
    </div>
  );
}