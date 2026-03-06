"use client";

import { Sparkles, X, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiPanel } from "./ai-panel-provider";
import { useState } from "react";

export function AiPanel() {
  const { open, close } = useAiPanel();
  const [input, setInput] = useState("");

  return (
    <aside
      aria-label="AI Assistant"
      aria-hidden={!open}
      className={`shrink-0 overflow-hidden transition-[width] duration-200 ease-in-out ${
        open ? "w-[380px] border-l border-border/50" : "w-0"
      }`}
    >
      <div className="flex h-dvh w-[380px] flex-col bg-background">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-border/50 px-4">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              AI Assistant
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-xs"
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close AI panel"
            onClick={close}
          >
            <X className="size-4" />
          </Button>
        </div>

        {/* Empty state */}
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-muted">
            <Sparkles className="size-5 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Coming soon</p>
          <p className="max-w-[220px] text-xs leading-relaxed text-muted-foreground">
            Ask questions about your spending, get budget advice, and more.
          </p>
        </div>

        {/* Input */}
        <div className="shrink-0 border-t border-border/50 p-4">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 bg-transparent py-1.5 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
            />
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              aria-label="Send message"
              disabled={!input.trim()}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </aside>
  );
}
