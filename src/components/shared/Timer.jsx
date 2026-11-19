import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pad = (n) => String(n).padStart(2, "0");

export function Timer({ minutes = 5, onComplete, compact }) {
  const total = Math.max(1, minutes) * 60;
  const [remaining, setRemaining] = useState(total);
  const [running, setRunning] = useState(false);
  const doneRef = useRef(onComplete);

  useEffect(() => {
    doneRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    setRemaining(total);
    setRunning(false);
  }, [total]);

  useEffect(() => {
    if (!running) return undefined;
    const id = setInterval(() => {
      setRemaining((value) => {
        if (value <= 1) {
          clearInterval(id);
          setRunning(false);
          doneRef.current?.();
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running]);

  const progress = 1 - remaining / total;

  return (
    <div className={cn("flex flex-col items-center", compact ? "gap-2" : "gap-4")}>
      <div className="relative grid place-items-center">
        <svg viewBox="0 0 120 120" className={compact ? "h-24 w-24" : "h-44 w-44"} aria-hidden="true">
          <circle cx="60" cy="60" r="54" className="fill-none stroke-border" strokeWidth="4" />
          <circle
            cx="60"
            cy="60"
            r="54"
            className="fill-none stroke-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={2 * Math.PI * 54}
            strokeDashoffset={2 * Math.PI * 54 * (1 - progress)}
            transform="rotate(-90 60 60)"
          />
        </svg>
        <span
          className={cn(
            "tabular absolute font-display",
            compact ? "text-lg" : "text-4xl"
          )}
          aria-live="polite"
        >
          {pad(Math.floor(remaining / 60))}:{pad(remaining % 60)}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          size={compact ? "sm" : "default"}
          onClick={() => setRunning((r) => !r)}
          className="gap-1.5 rounded-full"
        >
          {running ? (
            <>
              <Pause className="h-4 w-4" aria-hidden="true" />
              Pause
            </>
          ) : (
            <>
              <Play className="h-4 w-4" aria-hidden="true" />
              {remaining === total ? "Start" : "Resume"}
            </>
          )}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size={compact ? "sm" : "default"}
          onClick={() => {
            setRunning(false);
            setRemaining(total);
          }}
          className="gap-1.5 rounded-full text-muted-foreground"
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reset
        </Button>
      </div>
    </div>
  );
}