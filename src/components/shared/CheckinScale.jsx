import { cn } from "@/lib/utils";

/**
 * 1–5 supportive scale. Numbers carry the meaning; the label beside it keeps
 * it readable without colour.
 */
export function CheckinScale({ label, hint, value, onChange, labels, className }) {
  return (
    <div className={className}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">
          {value ? labels?.[value - 1] : hint || "Not set"}
        </p>
      </div>
      <div role="group" aria-label={label} className="mt-2 flex gap-1.5">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label}: ${n} of 5${labels?.[n - 1] ? `, ${labels[n - 1]}` : ""}`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "h-10 flex-1 rounded-lg border text-xs font-medium transition-colors",
              value === n
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border/80 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export const ENERGY_WORDS = ["Empty", "Low", "Steady", "Good", "Full"];
export const MOOD_WORDS = ["Heavy", "Low", "Steady", "Good", "Bright"];
export const STRESS_WORDS = ["Calm", "Mild", "Some", "High", "Very high"];
export const OVERWHELM_WORDS = ["Clear", "Slight", "Some", "Heavy", "Flooded"];