"use client";

import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Placeholder NotificationBell — actual implementation in Phase 4C.
 * Renders a bell icon button with a spot for future unread-count badge.
 */
export function NotificationBell() {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className="relative text-muted-foreground hover:text-foreground"
      aria-label="Notifications"
    >
      <Bell className="size-5" />
      {/* Future: unread badge
      <span className="absolute -right-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
        3
      </span>
      */}
    </Button>
  );
}
