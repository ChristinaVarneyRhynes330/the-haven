import { cn } from "@/lib/utils";

/**
 * The one layered surface primitive. Keeps depth and hairlines consistent
 * instead of styling cards per page.
 */
export function Surface({ as: As = "div", className, children, ...props }) {
  return (
    <As
      className={cn(
        "rounded-2xl border border-border/70 bg-card shadow-soft",
        className
      )}
      {...props}
    >
      {children}
    </As>
  );
}

export function SectionHeader({ eyebrow, title, description, action, className }) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1 text-xl tracking-tight sm:text-[22px]">{title}</h2>
        {description ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}