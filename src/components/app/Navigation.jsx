import { Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Home,
  LayoutGrid,
  ListChecks,
  Search,
  Settings,
  Sparkles,
  Sun,
  Inbox,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BRAND } from "@/lib/brand";

const PRIMARY = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/today", label: "Today", icon: Sun },
  { to: "/assistant", label: "Assistant", icon: Sparkles, center: true },
  { to: "/calendar", label: "Calendar", icon: CalendarDays },
  { to: "/more", label: "More", icon: LayoutGrid },
];

const SECONDARY = [
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/brain-dump", label: "Brain dump", icon: Inbox },
  { to: "/life-areas", label: "Life areas", icon: Layers },
  { to: "/search", label: "Search", icon: Search },
];

const itemClass =
  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-secondary/80 hover:text-foreground";
const activeClass = "bg-secondary text-foreground font-medium";

export function SidebarNav() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[17rem] flex-col border-r border-border/60 bg-sidebar px-4 py-6 lg:flex">
      <Link to="/" className="flex items-center gap-2.5 px-2" aria-label={`${BRAND.name} home`}>
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary text-primary-foreground">
          <Sparkles className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="font-display text-[21px] tracking-tight">{BRAND.name}</span>
      </Link>

      <nav aria-label="Primary" className="mt-8 space-y-1">
        {PRIMARY.filter((i) => !i.center).map(({ to, label, icon: Icon, exact }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: !!exact }}
            className={itemClass}
            activeProps={{ className: cn(itemClass, activeClass), "aria-current": "page" }}
          >
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 border-t border-border/60 pt-4">
        <p className="px-3 pb-2 eyebrow">Browse</p>
        <nav aria-label="Browse" className="space-y-1">
          {SECONDARY.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className={itemClass}
              activeProps={{ className: cn(itemClass, activeClass), "aria-current": "page" }}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-auto border-t border-border/60 pt-4">
        <Link
          to="/settings"
          className={itemClass}
          activeProps={{ className: cn(itemClass, activeClass), "aria-current": "page" }}
        >
          <Settings className="h-4 w-4" aria-hidden="true" />
          Settings
        </Link>
        <p className="mt-4 px-3 text-[11px] leading-relaxed text-muted-foreground">
          Private to you. Everything here is yours alone.
        </p>
      </div>
    </aside>
  );
}

export function MobileNav() {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2 pb-2 pt-1.5">
        {PRIMARY.map(({ to, label, icon: Icon, center, exact }) => {
          if (center) {
            return (
              <li key={to} className="flex justify-center">
                <Link
                  to={to}
                  aria-label={label}
                  className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lift ring-4 ring-background transition-transform active:scale-95"
                >
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </Link>
              </li>
            );
          }
          return (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: !!exact }}
                className="flex min-h-[52px] flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-[10.5px] font-medium text-muted-foreground"
                activeProps={{ className: "text-primary" }}
              >
                {({ isActive }) => (
                  <>
                    <Icon
                      className="h-[21px] w-[21px]"
                      strokeWidth={isActive ? 2.2 : 1.6}
                      aria-hidden="true"
                    />
                    <span>{label}</span>
                  </>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}