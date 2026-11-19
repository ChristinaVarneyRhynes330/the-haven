import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Wind } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { Surface } from "@/components/shared/Surface";
import { Timer } from "@/components/shared/Timer";
import { COGNITIVE_ACTIVITIES } from "@/lib/design";
import { dayKey } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authed/cognitive")({
  head: () => ({ meta: [{ title: "Cognitive activities · LifeOS" }] }),
  component: CognitivePage,
});

function CognitivePage() {
  const [activity, setActivity] = useState(null);
  const [minutes, setMinutes] = useState(3);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await base44.entities.Checkin.create({
      kind: "quick",
      day_key: dayKey(),
      note: note.trim() ? `${activity.title}: ${note.trim()}` : `${activity.title} completed`,
    });
    setSaved(true);
  };

  if (activity) {
    return (
      <div className="mx-auto max-w-xl space-y-6">
        <button
          type="button"
          onClick={() => {
            setActivity(null);
            setSaved(false);
            setNote("");
          }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          All activities
        </button>

        <PageHeader eyebrow={`${minutes} minute session`} title={activity.title} description={activity.prompt} />

        <Surface className="p-6">
          {activity.id === "breathing" ? (
            <div className="mb-6 flex justify-center">
              <div
                className="h-24 w-24 rounded-full bg-primary/15 motion-safe:animate-pulse"
                aria-hidden="true"
              />
            </div>
          ) : null}
          <Timer minutes={minutes} onComplete={() => {}} />
          <div className="mt-4 flex justify-center gap-1.5">
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
        </Surface>

        <Surface className="space-y-3 p-5">
          <label htmlFor="session-note" className="text-sm font-medium">
            Anything worth keeping from that?
          </label>
          <Textarea
            id="session-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Optional."
          />
          {saved ? (
            <p className="flex items-center gap-1.5 text-sm text-area-sage">
              <Check className="h-4 w-4" aria-hidden="true" />
              Saved to your day
            </p>
          ) : (
            <Button onClick={save} variant="outline" className="rounded-full">
              Save this session
            </Button>
          )}
        </Surface>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Optional priming"
        title="Cognitive activities"
        description="Short, low-stakes exercises for attention and reflection. Not a test, and not medical advice."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {COGNITIVE_ACTIVITIES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setActivity(item)}
            className="rounded-2xl border border-border/70 bg-card p-4 text-left shadow-soft transition-colors hover:border-primary/30 hover:bg-secondary/40"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <Wind className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="text-[11px] text-muted-foreground">{item.minutes} min</span>
            </div>
            <p className="mt-3 text-sm font-medium">{item.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{item.prompt}</p>
          </button>
        ))}
      </div>

      <p className="px-1 text-xs leading-relaxed text-muted-foreground">
        These are optional attention exercises. Nothing here measures or diagnoses anything —{" "}
        <Link to="/settings" className="underline underline-offset-4">
          tell me anytime
        </Link>{" "}
        if you'd rather not see them.
      </p>
    </div>
  );
}