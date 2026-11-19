import { Link } from "@tanstack/react-router";
import { Check, Clock, MoreHorizontal, Pencil, Sun, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { dueLabel, fmtDuration, isOverdue } from "@/lib/format";
import { AreaChip } from "@/components/shared/AreaChip";
import { energyLabel } from "@/lib/design";

const PRIORITY_MARK = {
  must: { label: "Must", className: "text-destructive" },
  should: { label: "Should", className: "text-foreground/70" },
  could: { label: "Could", className: "text-muted-foreground" },
  quick: { label: "Quick win", className: "text-area-sage" },
  waiting: { label: "Waiting", className: "text-area-plum" },
  future: { label: "Future", className: "text-muted-foreground" },
};

export function TaskRow({ task, area, onToggle, onOpen, onDelete, onTomorrow, showPriority = true }) {
  const done = task.status === "done";
  const overdue = task.status === "open" && task.due_date && isOverdue(task.due_date);
  const subtasks = task.subtasks || [];
  const doneSubs = subtasks.filter((s) => s.done).length;
  const mark = PRIORITY_MARK[task.priority] || PRIORITY_MARK.should;

  return (
    <li className="group flex items-start gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-secondary/40">
      <button
        type="button"
        onClick={() => onToggle?.(task)}
        aria-pressed={done}
        aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
        className={cn(
          "mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border transition-colors",
          done
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/40 hover:border-primary"
        )}
      >
        {done ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
      </button>

      <button
        type="button"
        onClick={() => onOpen?.(task)}
        className="min-w-0 flex-1 rounded-md text-left"
      >
        <span
          className={cn(
            "block text-sm leading-snug",
            done && "text-muted-foreground line-through decoration-muted-foreground/50"
          )}
        >
          {task.title}
        </span>

        <span className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <AreaChip area={area} />
          {showPriority && task.priority ? (
            <span className={cn("text-[11px] font-medium", mark.className)}>{mark.label}</span>
          ) : null}
          {task.due_date ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-[11px]",
                overdue ? "font-medium text-destructive" : "text-muted-foreground"
              )}
            >
              <Clock className="h-3 w-3" aria-hidden="true" />
              {dueLabel(task.due_date)}
            </span>
          ) : null}
          {task.estimate_min ? (
            <span className="text-[11px] text-muted-foreground">{fmtDuration(task.estimate_min)}</span>
          ) : null}
          {subtasks.length ? (
            <span className="tabular text-[11px] text-muted-foreground">
              {doneSubs}/{subtasks.length} steps
            </span>
          ) : null}
          {task.waiting_on ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-area-plum">
              <UserCheck className="h-3 w-3" aria-hidden="true" />
              {task.waiting_on}
            </span>
          ) : null}
          {task.postponed_count > 1 ? (
            <span className="text-[11px] text-muted-foreground">
              postponed {task.postponed_count}×
            </span>
          ) : null}
          {task.energy === "deep" ? (
            <span className="text-[11px] text-muted-foreground">Deep focus</span>
          ) : task.energy === "very_low" ? (
            <span className="text-[11px] text-muted-foreground">Low energy</span>
          ) : null}
        </span>
      </button>

      <div className="flex shrink-0 items-center opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
        {task.status === "open" ? (
          <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full">
            <Link to="/focus/$taskId" params={{ taskId: task.id }} aria-label={`Focus on ${task.title}`}>
              <Sun className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" aria-label="Task options">
              <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => onOpen?.(task)}>
              <Pencil className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onTomorrow?.(task)}>
              <Clock className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Move to tomorrow
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete?.(task)}
              className="text-destructive focus:text-destructive"
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {task.energy ? <span className="sr-only">Energy: {energyLabel(task.energy)}</span> : null}
    </li>
  );
}