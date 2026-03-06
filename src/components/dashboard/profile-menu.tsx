"use client";

import { useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { getInitials } from "@/lib/utils/get-initials";
import { SettingsDrawerContent } from "./settings-drawer-content";

interface ProfileMenuProps {
  displayName: string;
}

export function ProfileMenu({ displayName }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const initials = getInitials(displayName) || "U";

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          className="rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-ring"
          aria-label="Open profile menu"
        >
          <Avatar size="default">
            <AvatarFallback className="bg-primary/15 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DrawerTrigger>

      <SettingsDrawerContent displayName={displayName} />
    </Drawer>
  );
}
