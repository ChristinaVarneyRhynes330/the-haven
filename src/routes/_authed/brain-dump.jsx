import { useMemo, useState } from "react";
import { createFileRoute, Link, Outlet, useMatchRoute } from "@tanstack/react-router";
import { ArrowRight, Inbox, Loader2, Mic, Search, Sparkles, Square } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState, ErrorBlock, LoadingBlock } from "@/components/shared/States";
import { Surface } from "@/components/shared/Surface";
import { useCollection } from "@/lib/data";
import { useVoiceCapture } from "@/lib/useVoiceCapture";
import { analyzeBrainDump } from "@/lib/server-fns";
import { saveProposals } from "@/lib/proposals";
import { fmtDate, fmtTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { useNavigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authed/brain-dump")({
  head: () => ({ meta: [{ title: "Brain dump · LifeOS" }] }),
  component: BrainDumpPage,
});

function BrainDumpPage() {
  const navigate = useNavigate();
  const matchRoute = useMatchRoute();
  const isDetail = !!matchRoute({ to: "/brain-dump/$dumpId" });
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");

  const { items: dumps, loading, reload } = useCollection(
    "BrainDump",
    {},
    { sort: "-created_date", limit: 60 }
  );

  const voice = useVoiceCapture({ onText: (t) => setText((prev) => (prev ? `${prev}\n${t}` : t)) });

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return dumps;
    return dumps.filter((d) => (d.raw_text || "").toLowerCase().includes(q));
  }, [dumps, filter]);

  if (isDetail) return <Outlet />;

  const organize = async () => {
    if (!text.trim()) return;
    setBusy("organizing");
    setError("");
    try {
      const dump = await base44.entities.BrainDump.create({
        raw_text: text.trim(),
        input_type: voice.transcribing ? "voice" : "text",
        status: "new",
        item_count: 0,
      });
      const analysis = await analyzeBrainDump({ data: { text: text.trim() } });
      await saveProposals(analysis.items, { source: "brain_dump", dumpId: dump.id });
      await base44.entities.BrainDump.update(dump.id, { item_count: analysis.items.length });
      setText("");
      navigate({ to: "/brain-dump/$dumpId", params: { dumpId: dump.id } });
    } catch (err) {
      setError(err?.message || "Something went wrong while organizing. Your words are still here.");
    } finally {
      setBusy("");
    }
  };

  const keepRaw = async () => {
    if (!text.trim()) return;
    setBusy("saving");
    setError("");
    try {
      const dump = await base44.entities.BrainDump.create({
        raw_text: text.trim(),
        input_type: "text",
        status: "new",
        item_count: 0,
      });
      setText("");
      await reload();
      navigate({ to: "/brain-dump/$dumpId", params: { dumpId: dump.id } });
    } catch (err) {
      setError(err?.message || "Could not save that.");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="animate-fade-in space-y-7">
      <PageHeader
        eyebrow="Capture first, organize second"
        title="Brain dump"
        description="Write it exactly as it arrives. Mess is allowed here — sorting is my job, not yours."
      />

      <Surface className="p-4 sm:p-6">
        <label htmlFor="dump-text" className="text-sm font-medium">
          What's currently taking up space in your mind?
        </label>
        <Textarea
          id="dump-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder={
            "The boiler needs servicing. Mum's birthday is a week on Saturday and I haven't thought about a gift. Send the invoice before Friday. I keep meaning to look into the school trip payment. Feeling behind on the bathroom renovation…"
          }
          className="mt-2 resize-none text-[15px] leading-relaxed"
        />

        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={voice.recording ? "default" : "outline"}
              onClick={() => (voice.recording ? voice.stop() : voice.start())}
              disabled={!!busy || voice.transcribing}
              className={cn("gap-2 rounded-full", voice.recording && "bg-destructive hover:bg-destructive/90")}
            >
              {voice.recording ? (
                <>
                  <Square className="h-3.5 w-3.5" aria-hidden="true" />
                  Stop recording
                </>
              ) : (
                <>
                  <Mic className="h-3.5 w-3.5" aria-hidden="true" />
                  Speak it instead
                </>
              )}
            </Button>
            {voice.transcribing ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                Transcribing…
              </span>
            ) : null}
            <span className="text-[11px] text-muted-foreground">
              {text.trim() ? `${text.trim().split(/\s+/).length} words` : "Nothing is created until you approve it"}
            </span>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              onClick={organize}
              disabled={!text.trim() || !!busy}
              className="gap-2 rounded-full"
            >
              {busy === "organizing" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Sparkles className="h-4 w-4" aria-hidden="true" />
              )}
              {busy === "organizing" ? "Organizing…" : "Organize with AI"}
            </Button>
            <Button
              variant="ghost"
              onClick={keepRaw}
              disabled={!text.trim() || !!busy}
              className="rounded-full text-muted-foreground"
            >
              {busy === "saving" ? "Saving…" : "Save without organizing"}
            </Button>
          </div>
        </div>

        {voice.error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {voice.error}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="mt-2 text-sm text-destructive">
            {error}
          </p>
        ) : null}
      </Surface>

      <section aria-label="Brain dump history" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium tracking-tight">History</h2>
          <div className="relative w-full sm:w-64">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search past dumps…"
              aria-label="Search brain dump history"
              className="h-9 w-full rounded-full border border-border/80 bg-card pl-8 pr-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary/40"
            />
          </div>
        </div>

        {loading ? <LoadingBlock rows={3} /> : null}
        {!loading && !visible.length ? (
          <EmptyState
            icon={Inbox}
            title={dumps.length ? "Nothing matches that" : "Nothing captured yet"}
            description={
              dumps.length
                ? "Try a different word."
                : "Your first dump can be three words or three pages. Both are fine."
            }
          />
        ) : null}

        <div className="space-y-2">
          {visible.map((dump) => (
            <Link
              key={dump.id}
              to="/brain-dump/$dumpId"
              params={{ dumpId: dump.id }}
              className="group block rounded-2xl border border-border/70 bg-card p-4 shadow-soft transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="line-clamp-2 text-sm leading-relaxed">{dump.raw_text}</p>
                <ArrowRight
                  className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span>{fmtDate(dump.created_date, "MMM d")}</span>
                <span aria-hidden="true">·</span>
                <span>{fmtTime(dump.created_date)}</span>
                <span aria-hidden="true">·</span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5",
                    dump.status === "reviewed"
                      ? "bg-area-sage/12 text-area-sage"
                      : "bg-secondary text-secondary-foreground"
                  )}
                >
                  {dump.status === "reviewed" ? "Reviewed" : "Waiting for you"}
                </span>
                {dump.item_count ? <span>{dump.item_count} items found</span> : null}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}