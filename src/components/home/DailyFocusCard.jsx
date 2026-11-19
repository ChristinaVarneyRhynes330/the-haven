import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Clock, Sparkles, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/shared/Surface";
import { fmtDuration, fmtTime } from "@/lib/format";

export function DailyFocusCard({ task, workload, nextEvent, affirmation, emptyHint }) {
  return (
    <Surface className="animate-rise overflow-hidden border-primary/25 bg-primary p-5 text-primary-foreground shadow-lift sm:p-7">
      <div className="flex items-center gap-2 text-primary-foreground/70">
        <Star className="h-3.5 w-3.5" aria-hidden="true" />
        <p className="text-[11px] font-medium uppercase tracking-[0.18em]">Daily focus</p>
      </div>

      <h2 className="mt-3 max-w-2xl font-display text-[24px] leading-snug sm:text-[30px]">
        {task ? task.title : "Nothing is demanding you right now."}
      </h2>
      <p className="mt-2.5 max-w-xl text-sm leading-relaxed text-primary-foreground/80">
        {task
          ? task.description ||
            "This is the one thing that moves the day. Everything else can wait its turn."
          : emptyHint || "Add what's in your head, or let the day stay light."}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {task ? (
          <Button
            asChild
            className="gap-2 rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Link to="/focus/$taskId" params={{ taskId: task.id }}>
              Start focus
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        ) : (
          <Button
            asChild
            className="gap-2 rounded-full bg-primary-foreground text-primary hover:bg-primary-foreground/90"
          >
            <Link to="/brain-dump">
              Empty your head
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
        <Button
          asChild
          variant="ghost"
          className="gap-2 rounded-full text-primary-foreground/85 hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          <Link to="/assistant">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            Ask about today
          </Link>
        </Button>
      </div>

      <dl className="mt-6 grid grid-cols-3 gap-3 border-t border-primary-foreground/15 pt-4">
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/60">Must do</dt>
          <dd className="tabular mt-0.5 font-display text-xl">{workload.must}</dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/60">Planned</dt>
          <dd className="tabular mt-0.5 font-display text-xl">
            {workload.plannedMin ? fmtDuration(workload.plannedMin) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-[0.14em] text-primary-foreground/60">Overdue</dt>
          <dd className="tabular mt-0.5 font-display text-xl">{workload.overdue}</dd>
        </div>
      </dl>

      {nextEvent ? (
        <div className="mt-5 flex items-start gap-3 rounded-xl bg-primary-foreground/10 p-3.5">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary-foreground/70" aria-hidden="true" />
          <div className="text-sm">
            <p className="font-medium">{nextEvent.title}</p>
            <p className="text-primary-foreground/75">
              {fmtTime(nextEvent.start_at)}
              {nextEvent.location ? ` · ${nextEvent.location}` : ""}
            </p>
          </div>
        </div>
      ) : null}

      {affirmation ? (
        <p className="mt-5 border-t border-primary-foreground/15 pt-4 font-display text-[15px] italic leading-relaxed text-primary-foreground/85">
          {affirmation}
        </p>
      ) : null}
    </Surface>
  );
}

const ENERGY_WORDS = ["Empty", "Low", "Steady", "Good", "Full"];
const MOOD_WORDS = ["Heavy", "Low", "Steady", "Good", "Bright"];

export function QuickCheckin({ checkin, onChange, busy }) {
  const [local, setLocal] = useState({ energy: checkin?.energy || 0, mood: checkin?.mood || 0 });

  const set = (key, value) => {
    const next = { ...local, [key]: value };
    setLocal(next);
    onChange?.({ [key]: value });
  };

  return (
    <Surface className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <Scale
          label="Energy"
          words={ENERGY_WORDS}
          value={local.energy}
          onChange={(v) => set("energy", v)}
          busy={busy}
        />
        <span aria-hidden="true" className="hidden h-9 w-px bg-border/70 sm:block" />
        <Scale
          label="Mood"
          words={MOOD_WORDS}
          value={local.mood}
          onChange={(v) => set("mood", v)}
          busy={busy}
        />
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground sm:max-w-[13rem]">
        A quick check-in helps the day adapt to you, not the other way round.
      </p>
    </Surface>
  );
}

function Scale({ label, words, value, onChange, busy }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <p className="eyebrow">{label}</p>
        <span className="text-[11px] text-muted-foreground">{value ? words[value - 1] : "Not set"}</span>
      </div>
      <div role="group" aria-label={`${label} check-in`} className="flex items-center gap-1.5">
        {words.map((word, index) => {
          const n = index + 1;
          return (
            <button
              key={word}
              type="button"
              disabled={busy}
              aria-label={`${label}: ${n} of 5, ${word}`}
              aria-pressed={value === n}
              onClick={() => onChange(n)}
              className={
                value === n
                  ? "grid h-9 w-9 place-items-center rounded-full border border-primary bg-primary text-[11px] font-medium text-primary-foreground"
                  : "grid h-9 w-9 place-items-center rounded-full border border-border/80 text-[11px] font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              }
            >
              {n}
            </button>
          );
        })}
      </div>
    </div>
  );
}