import { Sparkles } from "lucide-react";
import { ProposalCard } from "@/components/shared/ProposalCard";
import { cn } from "@/lib/utils";
import { fmtTime } from "@/lib/format";

export function MessageThread({ messages = [], proposals = [], byId, onApprove, onIgnore, onEdit, busyId }) {
  return (
    <div className="space-y-4">
      {messages.map((message) => {
        const mine = message.role === "user";
        const attached = proposals.filter((p) =>
          (message.proposal_ids || []).includes(p.id)
        );
        return (
          <div key={message.id} className={cn("flex flex-col gap-2", mine ? "items-end" : "items-start")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed",
                mine
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md border border-border/70 bg-card text-foreground"
              )}
            >
              {!mine ? (
                <span className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  Genius
                </span>
              ) : null}
              <p className="whitespace-pre-wrap">{message.content}</p>
            </div>

            {attached.length ? (
              <div className="w-full space-y-2 pt-1">
                {attached.map((proposal) => (
                  <ProposalCard
                    key={proposal.id}
                    proposal={proposal}
                    area={byId[proposal.area_id]}
                    busy={busyId === proposal.id}
                    onApprove={onApprove}
                    onIgnore={onIgnore}
                    onEdit={onEdit}
                  />
                ))}
              </div>
            ) : null}

            <span className="px-1 text-[10px] text-muted-foreground">{fmtTime(message.at)}</span>
          </div>
        );
      })}
    </div>
  );
}