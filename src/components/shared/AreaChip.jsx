import { cn } from "@/lib/utils";
import { areaDot, areaSoft } from "@/lib/design";

/** Life area marker: dot + label, so colour is never the only signal. */
export function AreaChip({ area, className, muted = false }) {
  if (!area) {
    return (
      <span className={cn("inline-flex items-center gap-1.5 text-xs text-muted-foreground", className)}>
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50" aria-hidden="true" />
        Unsorted
      </span>
    );
  }
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
        muted ? "text-muted-foreground" : areaSoft(area.tone),
        className
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", areaDot(area.tone))} aria-hidden="true" />
      {area.name}
    </span>
  );
}

export function AreaDot({ tone, className }) {
  return (
    <span
      className={cn("inline-block h-2 w-2 shrink-0 rounded-full", areaDot(tone), className)}
      aria-hidden="true"
    />
  );
}