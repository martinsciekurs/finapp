"use client";

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { DEFAULT_BANNER, type BannerData } from "@/lib/config/banners";

interface HeroBannerProps {
  displayName: string;
  banner: BannerData | null;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function HeroBanner({ displayName, banner }: HeroBannerProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const activeBanner = banner ?? DEFAULT_BANNER;
  const isVisible = isHovered || isFocused;

  const greeting = useMemo(() => getGreeting(), []);

  const bannerStyle = useMemo(() => {
    if (activeBanner.type === "gradient") {
      return { background: activeBanner.value };
    }
    return { backgroundColor: activeBanner.value };
  }, [activeBanner]);

  // Determine if text should be light or dark based on banner.
  // Uses luminance check for solid colors; gradients default to light text.
  // Note: raw color classes (text-white, text-gray-900) are intentional here
  // because banner colors are user-chosen and outside the design token system.
  const isLightBanner = useMemo(() => {
    if (activeBanner.type === "gradient") return false;
    const hex = activeBanner.value.replace("#", "");
    if (hex.length !== 6) return false;
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6;
  }, [activeBanner]);

  const animate = !prefersReducedMotion;

  return (
    <motion.div
      data-tour="hero-banner"
      className="relative w-full overflow-hidden rounded-2xl"
      style={bannerStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={animate ? { opacity: 0, y: -8 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={animate ? { duration: 0.25, ease: "easeOut" } : { duration: 0 }}
    >
      {/* Dark overlay for readability in dark mode */}
      <div className="absolute inset-0 dark:bg-black/20" />

      <div className="relative flex min-h-[140px] items-end px-6 pb-5 sm:min-h-[160px] sm:px-8">
        <div>
          <motion.h1
            className={cn(
              "font-serif text-2xl font-bold sm:text-3xl",
              isLightBanner ? "text-gray-900" : "text-white"
            )}
            initial={animate ? { opacity: 0, y: 12 } : false}
            animate={{ opacity: 1, y: 0 }}
            transition={animate ? { duration: 0.25, ease: "easeOut", delay: 0.05 } : { duration: 0 }}
          >
            {greeting}, {displayName}
          </motion.h1>
        </div>
      </div>

      {/* "Change cover" button on hover/focus — placeholder for Phase 4F */}
      <motion.button
        type="button"
        className={cn(
          "absolute right-4 top-4 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isLightBanner
            ? "bg-black/10 text-gray-900 hover:bg-black/20"
            : "bg-white/15 text-white hover:bg-white/25"
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: isVisible ? 1 : 0 }}
        transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.15 }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        aria-label="Change cover"
      >
        Change cover
      </motion.button>
    </motion.div>
  );
}
