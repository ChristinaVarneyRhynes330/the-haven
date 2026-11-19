import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function PageHeader({ eyebrow, title, description, actions, className, children }) {
  return (
    <header className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-1.5 font-display text-[28px] leading-[1.15] tracking-tight sm:text-[34px]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </header>
  );
}

export function BackLink({ to, children = "Back" }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}