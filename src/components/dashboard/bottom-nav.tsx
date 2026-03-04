"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isNavItemActive } from "./nav-items";

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 block lg:hidden"
      aria-label="Mobile navigation"
    >
      <div className="mx-auto max-w-lg px-4 pb-[env(safe-area-inset-bottom)]">
        <div className="mb-3 flex items-center justify-around rounded-2xl border border-border/50 bg-background/80 px-2 py-2 shadow-lg backdrop-blur-lg">
          {NAV_ITEMS.map((item) => {
            const isActive = isNavItemActive(item.href, pathname);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex min-h-[44px] min-w-[44px] flex-col items-center justify-center rounded-xl px-2 py-1.5 text-xs transition-colors",
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                )}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
              >
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-xl bg-primary/10"
                    layoutId="bottomNavActive"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <item.icon className="relative size-5" />
                {isActive && (
                  <motion.span
                    className="relative mt-0.5 font-medium"
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
