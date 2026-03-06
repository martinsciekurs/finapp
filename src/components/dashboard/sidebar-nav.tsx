"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { PanelLeftClose, PanelLeft, Settings } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Drawer, DrawerTrigger } from "@/components/ui/drawer";
import { SettingsDrawerContent } from "./settings-drawer-content";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

interface SidebarNavProps {
  displayName: string;
}

export function SidebarNav({ displayName }: SidebarNavProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  return (
    <aside
      data-tour="sidebar-nav"
      className={cn(
        "hidden lg:flex lg:flex-col lg:border-r lg:border-sidebar-border lg:bg-sidebar",
        collapsed ? "lg:w-[68px]" : "lg:w-[240px]"
      )}
      style={{ transition: reduceMotion ? "none" : "width 0.2s ease" }}
      aria-label="Sidebar"
    >
      {/* Header */}
      <div
        className={cn(
          "flex h-14 items-center border-b border-sidebar-border px-4",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        {!collapsed && (
          <span className="font-serif text-lg font-bold text-sidebar-foreground">
            Simplony
          </span>
        )}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground/60 hover:text-sidebar-foreground"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <PanelLeft className="size-4" />
          ) : (
            <PanelLeftClose className="size-4" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => {
          const isActive = isNavItemActive(item.href, pathname);

          const linkContent = (
            <Link
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-2",
                isActive
                  ? "text-sidebar-primary"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
              aria-label={collapsed ? item.label : undefined}
            >
              {isActive &&
                (reduceMotion ? (
                  <div className="absolute inset-0 rounded-lg bg-sidebar-accent" />
                ) : (
                  <motion.div
                    className="absolute inset-0 rounded-lg bg-sidebar-accent"
                    layoutId="sidebarNavActive"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                ))}
              <item.icon className="relative size-5 shrink-0" />
              {!collapsed && (
                <span className="relative">{item.label}</span>
              )}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href} delayDuration={0}>
                <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  {item.label}
                </TooltipContent>
              </Tooltip>
            );
          }

          return (
            <div key={item.href}>{linkContent}</div>
          );
        })}
      </nav>

      {/* Settings */}
      <Drawer open={settingsOpen} onOpenChange={setSettingsOpen}>
        <div className="border-t border-sidebar-border p-3">
          {(() => {
            const isHighlighted =
              settingsOpen || pathname.startsWith("/dashboard/settings");
            const settingsButton = (
              <DrawerTrigger asChild>
                <button
                  className={cn(
                    "relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    collapsed && "justify-center px-2",
                    isHighlighted
                      ? "text-sidebar-primary"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  aria-label={collapsed ? "Settings" : undefined}
                >
                  {isHighlighted &&
                    (reduceMotion ? (
                      <div className="absolute inset-0 rounded-lg bg-sidebar-accent" />
                    ) : (
                      <motion.div
                        className="absolute inset-0 rounded-lg bg-sidebar-accent"
                        layoutId="sidebarNavActive"
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 30,
                        }}
                      />
                    ))}
                  <Settings className="relative size-5 shrink-0" />
                  {!collapsed && <span className="relative">Settings</span>}
                </button>
              </DrawerTrigger>
            );

            if (collapsed) {
              return (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>{settingsButton}</TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8}>
                    Settings
                  </TooltipContent>
                </Tooltip>
              );
            }

            return settingsButton;
          })()}
        </div>

        <SettingsDrawerContent displayName={displayName} />
      </Drawer>
    </aside>
  );
}
