"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Tags, User, Palette, Bell, LogOut, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { logout } from "@/app/dashboard/settings/actions";

interface ProfileMenuProps {
  displayName: string;
}

const SETTINGS_LINKS = [
  {
    href: "/dashboard/settings/categories",
    label: "Categories",
    description: "Expense and income categories",
    icon: Tags,
  },
  {
    href: "/dashboard/settings/profile",
    label: "Profile",
    description: "Name, currency, and account",
    icon: User,
  },
  {
    href: "/dashboard/settings/appearance",
    label: "Appearance",
    description: "Theme and display preferences",
    icon: Palette,
    comingSoon: true,
  },
  {
    href: "/dashboard/settings/notifications",
    label: "Notifications",
    description: "Email and in-app alerts",
    icon: Bell,
    comingSoon: true,
  },
] as const;

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((word) => word[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function ProfileMenu({ displayName }: ProfileMenuProps) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const pathname = usePathname();
  const initials = getInitials(displayName) || "U";

  async function handleLogout() {
    setIsLoggingOut(true);
    const result = await logout();
    if (!result.success) {
      setIsLoggingOut(false);
    }
  }

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

      <DrawerContent>
        <DrawerHeader className="pb-2">
          <div className="flex items-center gap-3">
            <Avatar size="lg">
              <AvatarFallback className="bg-primary/15 text-sm font-medium text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 text-left">
              <DrawerTitle className="truncate">{displayName}</DrawerTitle>
              <p className="text-xs text-muted-foreground">Settings & Account</p>
            </div>
          </div>
        </DrawerHeader>

        <div className="space-y-1 px-4 pb-2">
          {SETTINGS_LINKS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            if (item.comingSoon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 opacity-40"
                >
                  <Icon className="size-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">Coming soon</p>
                  </div>
                </div>
              );
            }

            return (
              <DrawerClose key={item.href} asChild>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                    isActive
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                >
                  <Icon className="size-5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                </Link>
              </DrawerClose>
            );
          })}
        </div>

        <div className="border-t px-4 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            {isLoggingOut ? (
              <Loader2 className="size-5 shrink-0 animate-spin" />
            ) : (
              <LogOut className="size-5 shrink-0" />
            )}
            <span className="text-sm font-medium">Log out</span>
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
