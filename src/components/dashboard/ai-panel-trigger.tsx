"use client";

import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAiPanel } from "./ai-panel-provider";
import { cn } from "@/lib/utils";

export function AiPanelTrigger() {
  const { open, toggle } = useAiPanel();

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn(
        "relative text-muted-foreground hover:text-foreground",
        open && "bg-accent text-foreground"
      )}
      aria-label="AI Assistant"
      aria-expanded={open}
      onClick={toggle}
    >
      <Sparkles className="size-5" />
    </Button>
  );
}
