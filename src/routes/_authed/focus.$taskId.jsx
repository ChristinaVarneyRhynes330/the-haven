import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Circle, Coffee, Loader2, Plus, Sparkles, Trash2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BackLink } from "@/components/shared/PageHeader";
import { LoadingBlock, EmptyState } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { Timer } from "@/components/shared/Timer";
import { AreaChip } from "@/components/shared/AreaChip";
import { useRecord } from "@/lib/data";
import { useAreas } from "@/lib/useAreas";
import { analyzeBrainDump } from "@/lib/server-fns";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/focus/$taskId")({
  head: () => ({ meta: [{ title: "Focus · LifeOS" }] }),
  component: FocusPage,
});

function FocusPage() {
  const { taskId } = Route.useParams();
  const { record: task, loading, reload } = useRecord("Task", taskId);
  const { byId } = useAreas();
  const [subtasks, setSubtasks] = useState([]);
  const [newStep, setNewStep] = useState("");
  const [notes, setNotes] = useState("");
  const [minutes, setMinutes] = useState(25);
  const [breaking, setBreaking] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [breakMode, setBreakMode] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!task) return;
    setSubtasks(task.subtasks || []);
    setNotes(task.notes || task.description || "");
    setMinutes(task.estimate_min && task.estimate_min <= 120 ? task.estimate_min : 25);
  }, [task]);

  const done = task?.status === "done";
  const doneCount = subtasks.filter((s) => s.done).length;
  const progress = subtasks.length ? Math.round((doneCount / subtasks.length) * 100) : done ? 100 : 0;

  const persistSubtasks = async (next) => {
    setSubtasks(next);
    await base44.entities.Task.update(taskId, { subtasks: next });
    reload();
  };

  const addStep = async (title) => {
    const clean = title.trim();
    if (!clean) return;
    const next = [...subtasks, { id: `s-${Date.now()}-${Math.round(Math.random() * 1e4)}`, title: clean, done: false }];
    await persistSubtasks(next);
    setNewStep("");
  };

  const toggleStep = async (id) => {
    const next = subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s));
    await persistSubtasks(next);
  };

  const removeStep = async (id) => {
    await persistSubtasks(subtasks.filter((s) => s.id !== id));
  };

  const saveNotes = async () => {
    await base44.entities.Task.update(taskId, { notes });
    reload();
  };

  const completeTask = async () => {
    await base44.entities.Task.update(taskId, {
      status: done ? "open" : "done",
      completed_at: done ? "" : new Date().toISOString(),
    });
    reload();
  };

  const breakItDown = async () => {
    if (!task) return;
    setBreaking(true);
    setError("");
    try {
      const result = await analyzeBrainDump({
        data: {
          text: `Break this single task into 3 to 6 concrete next steps. Do not add anything unrelated.
Task: ${task.title}
Context: ${task.description || "none"}`,
        },
      });
      setSuggestions(result.items);
    } catch (err) {
      setError(err?.message || "Couldn't break that down just now.");
    } finally {
      setBreaking(false);
    }
  };

  if (loading) return <LoadingBlock rows={4} />;

  if (!task) {
    return (
      <EmptyState
        icon={Circle}
        title="That task isn't here"
        description="It may have been deleted."
        action={
          <Link to="/today" className="text-sm text-primary">
            Back to Today
          </Link>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <BackLink to="/today">Today</BackLink>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <AreaChip area={byId[task.area_id]} />
          {task.estimate_min ? (
            <span className="text-[11px] text-muted-foreground">{task.estimate_min} min estimate</span>
          ) : null}
        </div>
        <h1
          className={cn(
            "font-display text-[28px] leading-tight tracking-tight",
            done && "text-muted-foreground line-through"
          )}
        >
          {task.title}
        </h1>
        {task.description ? (
          <p className="text-sm leading-relaxed text-muted-foreground">{task.description}</p>
        ) : null}
      </div>

      {breakMode ? (
        <Surface className="space-y-3 p-5">
          <div className="flex items-center gap-2">
            <Coffee className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm font-medium">Take five</p>
          </div>
          <Timer minutes={5} onComplete={() => setBreakMode(false)} />
        </Surface>
      ) : (
        <Surface className="space-y-4 p-5">
          <Timer minutes={minutes} onComplete={() => {}} />
          <div className="flex justify-center gap-1.5">
            {[15, 25, 50].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setMinutes(value)}
                aria-pressed={minutes === value}
                className={cn(
                  "rounded-full px-3 py-1 text-xs",
                  minutes === value ? "bg-secondary text-foreground" : "text-muted-foreground"
                )}
              >
                {value} min
              </button>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setBreakMode(true)} className="gap-1.5 rounded-full">
              <Coffee className="h-3.5 w-3.5" aria-hidden="true" />
              Take a break
            </Button>
            <Button
              size="sm"
              onClick={completeTask}
              variant={done ? "outline" : "default"}
              className="gap-1.5 rounded-full"
            >
              <Check className="h-3.5 w-3.5" aria-hidden="true" />
              {done ? "Reopen" : "Mark done"}
            </Button>
          </div>
        </Surface>
      )}

      <Surface className="p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">Steps</p>
          {subtasks.length ? (
            <p className="tabular text-[11px] text-muted-foreground">
              {doneCount}/{subtasks.length} · {progress}%
            </p>
          ) : null}
        </div>

        {subtasks.length ? (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
        ) : null}

        <ul className="mt-3 space-y-1">
          {subtasks.map((step) => (
            <li key={step.id} className="flex items-center gap-2 rounded-lg px-1 py-1.5 hover:bg-secondary/40">
              <button
                type="button"
                onClick={() => toggleStep(step.id)}
                aria-pressed={step.done}
                aria-label={step.done ? `Mark ${step.title} not done` : `Mark ${step.title} done`}
                className={cn(
                  "grid h-4 w-4 shrink-0 place-items-center rounded-full border",
                  step.done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40"
                )}
              >
                {step.done ? <Check className="h-2.5 w-2.5" aria-hidden="true" /> : null}
              </button>
              <span className={cn("flex-1 text-sm", step.done && "text-muted-foreground line-through")}>
                {step.title}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full opacity-60"
                aria-label={`Remove step ${step.title}`}
                onClick={() => removeStep(step.id)}
              >
                <Trash2 className="h-3 w-3" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>

        <div className="mt-3 flex gap-2">
          <Input
            value={newStep}
            onChange={(e) => setNewStep(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addStep(newStep);
              }
            }}
            placeholder="Add a step…"
            aria-label="Add a step"
          />
          <Button type="button" variant="outline" onClick={() => addStep(newStep)} className="shrink-0 rounded-full">
            <Plus className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>

        <div className="mt-4 border-t border-border/60 pt-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={breakItDown}
            disabled={breaking}
            className="gap-1.5 rounded-full px-0 text-primary hover:bg-transparent"
          >
            {breaking ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            I'm stuck — break this down
          </Button>

          {suggestions.length ? (
            <ul className="mt-2 space-y-1.5">
              {suggestions.map((item, index) => (
                <li key={`${item.title}-${index}`} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                  <span className="text-sm leading-snug">{item.title}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 shrink-0 rounded-full px-2 text-xs text-primary"
                    onClick={() => addStep(item.title)}
                  >
                    Add
                  </Button>
                </li>
              ))}
            </ul>
          ) : null}
          {error ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </Surface>

      <Surface className="p-5">
        <label htmlFor="focus-notes" className="text-sm font-medium">
          Notes
        </label>
        <Textarea
          id="focus-notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          className="mt-2"
          placeholder="Anything you'd otherwise keep in your head while working."
        />
        <Button variant="outline" size="sm" onClick={saveNotes} className="mt-2 rounded-full">
          Save notes
        </Button>
      </Surface>
    </div>
  );
}