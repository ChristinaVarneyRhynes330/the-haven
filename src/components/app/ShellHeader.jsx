import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Plus, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { QuickCapture } from "@/components/capture/QuickCapture";
import { BRAND } from "@/lib/brand";
import { useAuth } from "@/lib/AuthContext";

export function ShellHeader() {
  const { user } = useAuth();
  const [captureOpen, setCaptureOpen] = useState(false);
  const initials = (user?.full_name || user?.email || "You")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-2 px-4 sm:px-6">
        <Link to="/" className="flex items-center gap-2 lg:hidden">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <span className="font-display text-lg tracking-tight">{BRAND.name}</span>
        </Link>

        <p className="hidden max-w-sm text-sm leading-snug text-muted-foreground lg:block">
          {BRAND.promise}
        </p>

        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => setCaptureOpen(true)}
            className="gap-1.5 rounded-full pl-2.5"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span className="hidden sm:inline">Capture</span>
            <span className="sr-only sm:hidden">Quick capture</span>
          </Button>
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/search" aria-label="Search everything">
              <Search className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="ghost" size="icon" className="rounded-full">
            <Link to="/notifications" aria-label="Notifications">
              <Bell className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Link
            to="/settings"
            aria-label="Your profile and settings"
            className="ml-0.5 rounded-full"
          >
            <Avatar className="h-8 w-8 border border-border/70">
              <AvatarFallback className="bg-secondary text-[11px] font-semibold text-secondary-foreground">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
      <QuickCapture open={captureOpen} onOpenChange={setCaptureOpen} />
    </header>
  );
}