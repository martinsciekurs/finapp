"use client";

import { useState, useTransition } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Lightbulb, X, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { dismissQuickTip } from "@/app/dashboard/tour-actions";
import type { QuickTipId } from "@/app/dashboard/tour-actions";

interface QuickTipProps {
  tipId: QuickTipId;
  title: string;
  description: string;
  href?: string;
  ctaLabel?: string;
  className?: string;
}

export function QuickTip({
  tipId,
  title,
  description,
  href,
  ctaLabel,
  className,
}: QuickTipProps) {
  const [visible, setVisible] = useState(true);
  const [isPending, startTransition] = useTransition();
  const prefersReducedMotion = useReducedMotion();

  function handleDismiss() {
    setVisible(false);
    startTransition(() => {
      void dismissQuickTip(tipId);
    });
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -4, height: 0, marginTop: 0, marginBottom: 0 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2, ease: "easeOut" }}
          className={cn(
            "relative overflow-hidden rounded-lg border border-primary/20 bg-primary/5 px-4 py-3",
            className,
          )}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <Lightbulb className="size-4 text-primary" />
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {description}
              </p>

              {/* Action row */}
              <div className="mt-2 flex items-center gap-2">
                {href && ctaLabel && (
                  <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
                    <Link href={href}>
                      {ctaLabel}
                      <ArrowRight className="size-3" />
                    </Link>
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-muted-foreground"
                  onClick={handleDismiss}
                  disabled={isPending}
                >
                  Got it
                </Button>
              </div>
            </div>

            {/* Close button */}
            <Button
              size="icon-sm"
              variant="ghost"
              className="shrink-0 text-muted-foreground hover:text-foreground"
              onClick={handleDismiss}
              disabled={isPending}
              aria-label="Dismiss tip"
            >
              <X className="size-3.5" />
            </Button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
