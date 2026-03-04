"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInView, useMotionValue, useSpring, useReducedMotion } from "framer-motion";

interface AnimatedCounterProps {
  /** Target numeric value to animate toward */
  value: number;
  /** Formatting function applied to the animated number */
  formatValue: (n: number) => string;
  /** Spring animation duration in ms (default: 800) */
  duration?: number;
  /** Additional class names for the <span> element */
  className?: string;
}

/**
 * Animated number counter using framer-motion springs.
 * Animates from 0 to `value` when the element scrolls into view.
 * Respects `prefers-reduced-motion` — shows the final value immediately.
 */
export function AnimatedCounter({
  value,
  formatValue,
  duration = 800,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, {
    duration,
    bounce: 0,
  });
  const isInView = useInView(ref, { once: true, margin: "0px 0px -10% 0px" });
  const prefersReducedMotion = useReducedMotion();

  // Memoize formatValue to avoid unnecessary effect re-runs.
  // Callers should pass a stable reference (useCallback or module-level fn).
  const formatFn = useCallback(
    (n: number) => formatValue(n),
    [formatValue]
  );

  // Kick off the animation when the element comes into view
  useEffect(() => {
    if (isInView) {
      if (prefersReducedMotion) {
        // Immediately set final value — no animation
        if (ref.current) {
          ref.current.textContent = formatFn(value);
        }
      } else {
        motionValue.set(value);
      }
    }
  }, [isInView, value, motionValue, prefersReducedMotion, formatFn]);

  // Subscribe to spring updates and write to the DOM directly
  // (avoids React re-renders on every animation frame)
  useEffect(() => {
    if (prefersReducedMotion) return;

    const unsubscribe = springValue.on("change", (latest) => {
      if (ref.current) {
        ref.current.textContent = formatFn(latest);
      }
    });
    return unsubscribe;
  }, [springValue, prefersReducedMotion, formatFn]);

  return (
    <span ref={ref} className={className} aria-live="polite">
      {formatFn(prefersReducedMotion ? value : 0)}
    </span>
  );
}
