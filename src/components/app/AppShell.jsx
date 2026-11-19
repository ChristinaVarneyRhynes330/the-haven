import { useRouterState } from "@tanstack/react-router";
import { MobileNav, SidebarNav } from "./Navigation";
import { ShellHeader } from "./ShellHeader";

/** Flows that take over the screen and hide the app chrome. */
const IMMERSIVE = ["/onboarding", "/morning", "/evening", "/focus"];

export function AppShell({ children }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const immersive = IMMERSIVE.some((p) => pathname.startsWith(p));

  return (
    <div className="min-h-screen bg-background">
      <a
        href="#main"
        className="sr-only-focusable fixed left-4 top-3 z-50 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
      >
        Skip to content
      </a>
      {!immersive && <SidebarNav />}
      <div className={immersive ? "" : "lg:pl-[17rem]"}>
        {!immersive && <ShellHeader />}
        <main
          id="main"
          className={
            immersive
              ? "mx-auto w-full max-w-3xl px-4 py-6 sm:px-6"
              : "mx-auto w-full max-w-6xl px-4 pb-32 pt-6 sm:px-6 lg:pb-16"
          }
        >
          {children}
        </main>
      </div>
      {!immersive && <MobileNav />}
    </div>
  );
}