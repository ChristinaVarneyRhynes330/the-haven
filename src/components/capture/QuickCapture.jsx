import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { analyzeBrainDump } from "@/lib/server-fns";
import { saveProposals } from "@/lib/proposals";

/**
 * Persistent quick capture. Raw thought in, structured proposal out — the
 * user always reviews before anything is created.
 */
export function QuickCapture({ open, onOpenChange }) {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  const close = () => {
    if (busy) return;
    setText("");
    setError("");
    onOpenChange(false);
  };

  const createDump = async (status) =>
    base44.entities.BrainDump.create({
      raw_text: text.trim(),
      input_type: "text",
      status,
      item_count: 0,
    });

  const organize = async () => {
    if (!text.trim()) return;
    setBusy("organizing");
    setError("");
    try {
      const dump = await createDump("new");
      const analysis = await analyzeBrainDump({ data: { text: text.trim() } });
      await saveProposals(analysis.items, { source: "brain_dump", dumpId: dump.id });
      await base44.entities.BrainDump.update(dump.id, { item_count: analysis.items.length });
      setText("");
      onOpenChange(false);
      navigate({ to: "/brain-dump/$dumpId", params: { dumpId: dump.id } });
    } catch (err) {
      setError(err?.message || "Something went wrong while organizing. Your words are safe — try again.");
    } finally {
      setBusy("");
    }
  };

  const keepRaw = async () => {
    if (!text.trim()) return;
    setBusy("saving");
    setError("");
    try {
      const dump = await createDump("new");
      setText("");
      onOpenChange(false);
      navigate({ to: "/brain-dump/$dumpId", params: { dumpId: dump.id } });
    } catch (err) {
      setError(err?.message || "Could not save that.");
    } finally {
      setBusy("");
    }
  };

  return (
    <Sheet open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <SheetContent side="bottom" className="rounded-t-3xl px-4 pb-6 pt-5 sm:px-6">
        <SheetHeader className="text-left">
          <SheetTitle className="font-display text-xl">Get it out of your head</SheetTitle>
          <SheetDescription className="text-sm leading-relaxed">
            No structure needed. Write it as it comes — I'll sort it out with you afterwards.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            autoFocus
            aria-label="What's on your mind?"
            placeholder="Call the dentist. Mum's birthday next week. Need to send the invoice before Friday. I keep forgetting to book the car in…"
            className="resize-none text-[15px] leading-relaxed"
          />
          <div className="mt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              {text.trim() ? `${text.trim().split(/\s+/).length} words` : "Nothing is created until you approve it"}
            </p>
          </div>
          {error ? (
            <p role="alert" className="mt-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            onClick={organize}
            disabled={!text.trim() || !!busy}
            className="gap-2 rounded-full sm:flex-1"
          >
            {busy === "organizing" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Sparkles className="h-4 w-4" aria-hidden="true" />
            )}
            {busy === "organizing" ? "Organizing…" : "Organize with AI"}
            {!busy ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : null}
          </Button>
          <Button
            variant="ghost"
            onClick={keepRaw}
            disabled={!text.trim() || !!busy}
            className="rounded-full text-muted-foreground"
          >
            Just save it
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}