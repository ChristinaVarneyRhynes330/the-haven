import { useState } from "react";
import { ArrowUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function Composer({ onSend, busy, placeholder, suggestions = [], autoFocus }) {
  const [text, setText] = useState("");

  const send = () => {
    const value = text.trim();
    if (!value || busy) return;
    setText("");
    onSend(value);
  };

  return (
    <div className="space-y-2">
      {suggestions.length && !text ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setText(suggestion)}
              className="rounded-full border border-border/80 bg-card px-3 py-1.5 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
            >
              {suggestion}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2 rounded-2xl border border-border/80 bg-card p-2 shadow-soft focus-within:border-primary/40">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          autoFocus={autoFocus}
          placeholder={placeholder || "What's on your mind?"}
          aria-label="Message the assistant"
          className="min-h-[44px] resize-none border-0 bg-transparent px-2 py-2.5 text-[15px] shadow-none focus-visible:outline-none"
        />
        <Button
          type="button"
          size="icon"
          onClick={send}
          disabled={!text.trim() || busy}
          aria-label="Send message"
          className="h-10 w-10 shrink-0 rounded-full"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <ArrowUp className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      <p className="px-1 text-[11px] text-muted-foreground">
        Suggestions only — nothing changes until you confirm it.
      </p>
    </div>
  );
}