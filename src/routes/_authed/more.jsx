import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Bell,
  BookOpen,
  Brain,
  CheckSquare,
  FileText,
  HeartPulse,
  Inbox,
  Layers,
  ListChecks,
  Moon,
  NotebookPen,
  Repeat,
  Search,
  Settings,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Surface } from "@/components/shared/Surface";
import { useProfile } from "@/lib/data";
import { cn } from "@/lib/utils";

const CLUSTERS = [
  {
    title: "Capture & think",
    description: "For anything that arrives without structure.",
    items: [
      { to: "/brain-dump", label: "Brain dump", icon: Inbox, note: "Raw thoughts, organized with you" },
      { to: "/assistant", label: "AI assistant", icon: Sparkles, note: "Ask, plan, untangle" },
      { label: "Notes", icon: NotebookPen, soon: true },
      { label: "Documents", icon: FileText, soon: true },
    ],
  },
  {
    title: "Plan",
    description: "The structure underneath the day.",
    items: [
      { to: "/tasks", label: "Tasks", icon: ListChecks, note: "Everything you've written down" },
      { to: "/life-areas", label: "Life areas", icon: Layers, note: "How everything stays connected" },
      { label: "Goals", icon: Target, soon: true },
      { label: "Projects", icon: CheckSquare, soon: true },
    ],
  },
  {
    title: "Practice",
    description: "The small things that make a week work.",
    items: [
      { to: "/cognitive", label: "Cognitive activities", icon: Brain, note: "1–5 minute priming exercises" },
      { label: "Routines", icon: Repeat, soon: true },
      { label: "Habits", icon: TrendingUp, soon: true },
      { label: "Wellness", icon: HeartPulse, soon: true },
      { label: "Family & household", icon: Users, soon: true },
    ],
  },
  {
    title: "Review",
    description: "Look back so the next week is lighter.",
    items: [
      { to: "/evening", label: "Evening reset", icon: Moon, note: "Close the day gently" },
      { to: "/search", label: "Search", icon: Search, note: "Find anything you saved" },
      { to: "/notifications", label: "Notifications", icon: Bell },
      { label: "Weekly reset", icon: BookOpen, soon: true },
      { label: "Insights", icon: Wallet, soon: true },
    ],
  },
];

export const Route = createFileRoute("/_authed/more")({
  head: () => ({ meta: [{ title: "More · LifeOS" }] }),
  component: MorePage,
});

function MorePage() {
  const { profile } = useProfile();

  return (
    <div className="animate-fade-in space-y-7">
      <PageHeader
        eyebrow="Everything else"
        title="More"
        description="Grouped so it stays readable. You can reorder and hide these later."
      />

      {!profile?.onboarding_complete ? (
        <Surface className="flex flex-col gap-3 border-primary/25 bg-primary/[0.05] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium">Finish setting up your Life OS</p>
            <p className="mt-1 text-sm text-muted-foreground">
              About three minutes, and only what's useful to you.
            </p>
          </div>
          <Link
            to="/onboarding"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Continue setup
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Surface>
      ) : null}

      {CLUSTERS.map((cluster) => (
        <section key={cluster.title} aria-label={cluster.title} className="space-y-2">
          <div>
            <h2 className="text-sm font-medium">{cluster.title}</h2>
            <p className="text-xs text-muted-foreground">{cluster.description}</p>
          </div>
          <Surface className="divide-y divide-border/60 overflow-hidden p-0">
            {cluster.items.map((item) =>
              item.soon ? (
                <div
                  key={item.label}
                  aria-disabled="true"
                  className="flex items-center gap-3 px-4 py-3.5 opacity-70"
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1 text-sm">{item.label}</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted-foreground">
                    Soon
                  </span>
                </div>
              ) : (
                <Link
                  key={item.label}
                  to={item.to}
                  className={cn(
                    "group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    {item.note ? (
                      <span className="block text-xs text-muted-foreground">{item.note}</span>
                    ) : null}
                  </span>
                  <ArrowRight
                    className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              )
            )}
          </Surface>
        </section>
      ))}

      <section aria-label="Settings" className="space-y-2">
        <h2 className="text-sm font-medium">Your account</h2>
        <Surface className="divide-y divide-border/60 overflow-hidden p-0">
          <Link
            to="/settings"
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40"
          >
            <Settings className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 text-sm font-medium">Settings, privacy & AI memory</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Link>
          <Link
            to="/onboarding"
            className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-secondary/40"
          >
            <Sparkles className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <span className="flex-1 text-sm font-medium">Revisit your setup answers</span>
            <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </Link>
        </Surface>
      </section>

      <p className="pb-2 text-center text-xs text-muted-foreground">
        Areas marked Soon aren't built yet — nothing pretends to work.
      </p>
    </div>
  );
}