import { useState } from "react";
import { Check, Pencil, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AreaChip } from "./AreaChip";
import { dueLabel } from "@/lib/format";

const KIND_LABEL = {
  task: "Task",
  appointment: "Appointment",
  reminder: "Reminder",
  note: "Note",
  idea: "Idea",
  goal: "Goal",
  shopping: "Shopping",
  deadline: "Deadline",
  question: "Question",
  follow_up: "Follow-up",
  decision: "Decision",
};

/**
 * Nothing enters the life OS silently: AI output lands here first.
 */
export function ProposalCard({ proposal, area, onApprove, onIgnore, onEdit, busy }) {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(proposal.title);

  return (
    <div
      className={cn(
        "rounded-xl border border-border/70 bg-card p-3.5 transition-opacity",
        busy && "opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="eyebrow">{KIND_LABEL[proposal.kind] || "Item"}</p>
          {editing ? (
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              aria-label="Item title"
              className="mt-1.5 h-9"
            />
          ) : (
            <p className="mt-1 text-sm font-medium leading-snug">{proposal.title}</p>
          )}
          {proposal.detail ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{proposal.detail}</p>
          ) : null}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <AreaChip area={area} />
        {proposal.due_date ? (
          <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] text-secondary-foreground">
            {dueLabel(proposal.due_date)}
          </span>
        ) : null}
        {proposal.estimate_min ? (
          <span className="text-[11px] text-muted-foreground">{proposal.estimate_min} min</span>
        ) : null}
      </div>

      {proposal.reason ? (
        <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground">
          <Sparkles className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
          {proposal.reason}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <Button
          size="sm"
          className="h-8 gap-1.5 rounded-full px-3"
          disabled={busy}
          onClick={() => onApprove({ ...proposal, title })}
        >
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Add
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 rounded-full px-3 text-muted-foreground"
          onClick={() => {
            if (editing) {
              setEditing(false);
              onEdit?.({ ...proposal, title });
            } else {
              setEditing(true);
            }
          }}
        >
          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
          {editing ? "Save" : "Edit"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 gap-1.5 rounded-full px-3 text-muted-foreground"
          disabled={busy}
          onClick={() => onIgnore(proposal)}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
          Ignore
        </Button>
      </div>
    </div>
  );
}