import { cn } from "@/lib/utils";

export function EmptyState({ icon: Icon, title, description, action, className }) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-2xl border border-dashed border-border/80 bg-card/50 p-6 sm:items-center sm:text-center",
        className
      )}
    >
      {Icon ? (
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-secondary-foreground">
          <Icon className="h-4.5 w-4.5" aria-hidden="true" />
        </span>
      ) : null}
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description ? (
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}

export function LoadingBlock({ rows = 3, className }) {
  return (
    <div className={cn("space-y-2", className)} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {Array.from({ length: rows }).map((_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-xl bg-secondary/70"
          style={{ animationDelay: `${index * 80}ms` }}
        />
      ))}
    </div>
  );
}

export function ErrorBlock({ message = "That didn't load.", onRetry }) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/[0.05] p-4 text-sm">
      <p className="font-medium text-destructive">Something didn't load</p>
      <p className="mt-1 text-muted-foreground">{message}</p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 text-sm font-medium text-destructive underline-offset-4 hover:underline"
        >
          Try again
        </button>
      ) : null}
    </div>
  );
}