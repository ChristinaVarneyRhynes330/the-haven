import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Sparkles, Volume2 } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/shared/Surface";
import { CheckinScale, ENERGY_WORDS, MOOD_WORDS } from "@/components/shared/CheckinScale";
import { Timer } from "@/components/shared/Timer";
import { useAssistantContext } from "@/lib/useAssistantContext";
import { useCollection } from "@/lib/data";
import { dailyBriefing } from "@/lib/server-fns";
import { dayKey } from "@/lib/format";
import { COGNITIVE_ACTIVITIES } from "@/lib/design";
import { cn } from "@/lib/utils";

const STEPS = ["Start", "Check in", "Affirmation", "Priming", "Briefing", "Focus"];

export const Route = createFileRoute("/_authed/morning")({
  head: () => ({ meta: [{ title: "Morning flow · LifeOS" }] }),
  component: MorningFlow,
});

function MorningFlow() {
  const navigate = useNavigate();
  const { context, profile, tasks } = useAssistantContext();
  const { items: affirmations, reload: reloadAffirmations } = useCollection(
    "Affirmation",
    { active: true },
    { limit: 20 }
  );
  const [step, setStep] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [mood, setMood] = useState(0);
  const [briefing, setBriefing] = useState(null);
  const [briefingLoading, setBriefingLoading] = useState(false);
  const [briefingError, setBriefingError] = useState("");
  const [activity, setActivity] = useState(COGNITIVE_ACTIVITIES[0]);
  const [minutes, setMinutes] = useState(1);
  const [saved, setSaved] = useState(false);

  const affirmation =
    affirmations.find((a) => a.favorite)?.text ||
    affirmations[0]?.text ||
    "You don't have to hold all of it in your head. It's written down now.";

  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  const loadBriefing = useCallback(
    async (style) => {
      setBriefingLoading(true);
      setBriefingError("");
      try {
        const result = await dailyBriefing({
          data: { context, guidanceStyle: style || profile?.guidance_style || "gentle" },
        });
        setBriefing(result);
      } catch (err) {
        setBriefingError(err?.message || "Couldn't build the briefing just now. You can still work from Today.");
      } finally {
        setBriefingLoading(false);
      }
    },
    [context, profile]
  );

  useEffect(() => {
    if (step === 4 && !briefing && !briefingLoading && !briefingError) loadBriefing();
  }, [step, briefing, briefingLoading, briefingError, loadBriefing]);

  const saveCheckin = async () => {
    if (saved) return;
    await base44.entities.Checkin.create({
      kind: "morning",
      day_key: dayKey(),
      energy: energy || undefined,
      mood: mood || undefined,
    });
    setSaved(true);
  };

  const speak = () => {
    if (typeof window === "undefined" || !window.speechSynthesis || !briefing) return;
    const text = [briefing.headline, briefing.summary, ...(briefing.bullets || []), briefing.first_action]
      .filter(Boolean)
      .join(". ");
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
  };

  const favouriteAffirmation = async () => {
    const existing = affirmations.find((a) => a.text === affirmation);
    if (!existing) {
      await base44.entities.Affirmation.create({ text: affirmation, active: true, favorite: true, custom: false });
    } else {
      await base44.entities.Affirmation.update(existing.id, { favorite: !existing.favorite });
    }
    reloadAffirmations();
  };

  const focusTask =
    tasks.find((t) => t.priority === "must" && t.due_date && dayKey(t.due_date) === dayKey()) ||
    tasks.find((t) => t.priority === "must") ||
    null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">
          Leave the flow
        </Link>
        <div className="flex items-center gap-1.5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
          {STEPS.map((label, index) => (
            <span
              key={label}
              className={cn(
                "h-1.5 rounded-full transition-all",
                index === step ? "w-5 bg-primary" : index < step ? "w-1.5 bg-primary/40" : "w-1.5 bg-border"
              )}
            />
          ))}
        </div>
      </div>

      <p className="eyebrow">{STEPS[step]}</p>

      {step === 0 ? (
        <section className="space-y-4">
          <h1 className="font-display text-[32px] leading-tight tracking-tight sm:text-[38px]">
            Good morning{profile?.preferred_name ? `, ${profile.preferred_name}` : ""}.
          </h1>
          <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
            Three minutes, no performance required. You can skip anything that isn't useful today.
          </p>
          <Button onClick={next} className="mt-2 gap-2 rounded-full">
            Begin
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </section>
      ) : null}

      {step === 1 ? (
        <section className="space-y-5">
          <h2 className="font-display text-2xl tracking-tight">How are you arriving today?</h2>
          <Surface className="space-y-5 p-5">
            <CheckinScale label="Energy" value={energy} onChange={setEnergy} labels={ENERGY_WORDS} hint="Tap 1–5" />
            <CheckinScale label="Mood" value={mood} onChange={setMood} labels={MOOD_WORDS} hint="Tap 1–5" />
          </Surface>
          <div className="flex gap-2">
            <Button
              onClick={async () => {
                await saveCheckin();
                next();
              }}
              className="rounded-full"
            >
              Continue
            </Button>
            <Button variant="ghost" onClick={next} className="rounded-full text-muted-foreground">
              Skip
            </Button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-5">
          <h2 className="font-display text-2xl tracking-tight">Something to hold onto</h2>
          <Surface className="border-primary/25 bg-primary p-6 text-primary-foreground">
            <p className="font-display text-[22px] italic leading-relaxed">{affirmation}</p>
          </Surface>
          <div className="flex flex-wrap gap-2">
            <Button onClick={next} className="rounded-full">
              Continue
            </Button>
            <Button variant="outline" onClick={favouriteAffirmation} className="rounded-full">
              Save as favourite
            </Button>
            <Button variant="ghost" onClick={next} className="rounded-full text-muted-foreground">
              Skip
            </Button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="space-y-5">
          <h2 className="font-display text-2xl tracking-tight">A short priming exercise</h2>
          <Surface className="space-y-4 p-5">
            <div className="flex flex-wrap gap-1.5">
              {COGNITIVE_ACTIVITIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={activity.id === item.id}
                  onClick={() => setActivity(item)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                    activity.id === item.id
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 text-muted-foreground hover:text-foreground"
                  )}
                >
                  {item.title}
                </button>
              ))}
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">{activity.prompt}</p>
            <div className="flex justify-center gap-1.5">
              {[1, 3, 5].map((value) => (
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
            <Timer minutes={minutes} onComplete={next} />
          </Surface>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={next} className="rounded-full text-muted-foreground">
              Skip for today
            </Button>
            <Link to="/cognitive" className="self-center text-xs text-muted-foreground underline-offset-4 hover:underline">
              More activities
            </Link>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-4">
          <h2 className="font-display text-2xl tracking-tight">Your briefing</h2>
          {briefingLoading ? (
            <Surface className="flex items-center gap-3 p-5 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Reading your day…
            </Surface>
          ) : null}
          {briefingError ? (
            <Surface className="border-destructive/30 bg-destructive/[0.05] p-4 text-sm">
              <p className="font-medium text-destructive">The briefing didn't build</p>
              <p className="mt-1 text-muted-foreground">{briefingError}</p>
              <Button size="sm" variant="outline" onClick={() => loadBriefing()} className="mt-2 rounded-full">
                Try again
              </Button>
            </Surface>
          ) : null}
          {briefing ? (
            <Surface className="space-y-4 p-5 sm:p-6">
              <div>
                <p className="eyebrow">Today</p>
                <h3 className="mt-1 font-display text-xl leading-snug">{briefing.headline}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{briefing.summary}</p>
              </div>
              {briefing.bullets?.length ? (
                <ul className="space-y-1.5 border-t border-border/60 pt-3">
                  {briefing.bullets.map((line) => (
                    <li key={line} className="flex gap-2 text-sm">
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-muted-foreground" aria-hidden="true" />
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}
              {briefing.watch_out ? (
                <p className="rounded-xl bg-secondary/60 p-3 text-sm">
                  <span className="font-medium">Worth watching: </span>
                  {briefing.watch_out}
                </p>
              ) : null}
              {briefing.first_action ? (
                <p className="border-t border-border/60 pt-3 text-sm">
                  <span className="font-medium">First action: </span>
                  {briefing.first_action}
                </p>
              ) : null}
            </Surface>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button onClick={next} className="rounded-full">
              Continue
            </Button>
            <Button variant="outline" onClick={speak} className="gap-1.5 rounded-full">
              <Volume2 className="h-4 w-4" aria-hidden="true" />
              Listen
            </Button>
            <Button
              variant="outline"
              onClick={() => loadBriefing("direct")}
              disabled={briefingLoading}
              className="rounded-full"
            >
              Simplify
            </Button>
            <Button asChild variant="ghost" className="rounded-full text-muted-foreground">
              <Link to="/today">Edit priorities</Link>
            </Button>
          </div>
        </section>
      ) : null}

      {step === 5 ? (
        <section className="space-y-5">
          <h2 className="font-display text-2xl tracking-tight">Today's one thing</h2>
          <Surface className="border-primary/25 bg-primary p-6 text-primary-foreground">
            <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/70">Focus</p>
            <p className="mt-2 font-display text-2xl leading-snug">
              {focusTask ? focusTask.title : "Nothing is demanding you today."}
            </p>
            {focusTask?.estimate_min ? (
              <p className="mt-2 text-sm text-primary-foreground/75">{focusTask.estimate_min} minutes</p>
            ) : null}
          </Surface>
          <div className="flex flex-wrap gap-2">
            {focusTask ? (
              <Button asChild className="gap-2 rounded-full">
                <Link to="/focus/$taskId" params={{ taskId: focusTask.id }}>
                  Start focus
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            ) : (
              <Button asChild className="rounded-full">
                <Link to="/brain-dump">Add something</Link>
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => navigate({ to: "/" })}
              className="rounded-full"
            >
              Back to Home
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Suggestions only — the day stays yours.
          </p>
        </section>
      ) : null}
    </div>
  );
}