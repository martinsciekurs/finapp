"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BannerPreset } from "@/lib/config/banners";

// ── Animation Variants ─────────────────────────────────────
const gridVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const swatchVariants = {
  hidden: { opacity: 0, scale: 0.8 },
  show: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

// ── Main Component ─────────────────────────────────────────
interface BannerStepProps {
  presets: BannerPreset[];
  selected: { type: "color" | "gradient"; value: string };
  onSelect: (banner: { type: "color" | "gradient"; value: string }) => void;
}

export function BannerStep({ presets, selected, onSelect }: BannerStepProps) {
  const colors = presets.filter((p) => p.type === "color");
  const gradients = presets.filter((p) => p.type === "gradient");

  return (
    <div className="space-y-8 py-4">
      {/* Header */}
      <div className="text-center">
        <motion.h2
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="font-serif text-2xl font-bold md:text-3xl"
        >
          Choose your cover
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-2 text-muted-foreground"
        >
          Pick a banner for your dashboard. You can change this anytime.
        </motion.p>
      </div>

      {/* Preview */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="overflow-hidden rounded-xl border border-border/50 shadow-sm"
      >
        <motion.div
          className="h-36 w-full"
          animate={{ background: selected.value }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
          style={{ background: selected.value }}
        />
        <div className="bg-card p-4">
          <div className="h-3 w-32 rounded-full bg-muted" />
          <div className="mt-2 h-2 w-48 rounded-full bg-muted/60" />
        </div>
      </motion.div>

      {/* Solid Colors */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Solid Colors
        </p>
        <motion.div
          className="grid grid-cols-4 gap-3 sm:grid-cols-8"
          variants={gridVariants}
          initial="hidden"
          animate="show"
        >
          {colors.map((preset) => (
            <motion.div key={preset.value} variants={swatchVariants}>
              <BannerSwatch
                preset={preset}
                isSelected={
                  selected.type === preset.type &&
                  selected.value === preset.value
                }
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      {/* Gradients */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.45 }}
      >
        <p className="mb-3 text-sm font-medium text-muted-foreground">
          Gradients
        </p>
        <motion.div
          className="grid grid-cols-4 gap-3 sm:grid-cols-8"
          variants={gridVariants}
          initial="hidden"
          animate="show"
        >
          {gradients.map((preset) => (
            <motion.div key={preset.value} variants={swatchVariants}>
              <BannerSwatch
                preset={preset}
                isSelected={
                  selected.type === preset.type &&
                  selected.value === preset.value
                }
                onSelect={onSelect}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Banner Swatch ──────────────────────────────────────────
function BannerSwatch({
  preset,
  isSelected,
  onSelect,
}: {
  preset: BannerPreset;
  isSelected: boolean;
  onSelect: (banner: { type: "color" | "gradient"; value: string }) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onSelect({ type: preset.type, value: preset.value })}
      whileTap={{ scale: 0.9 }}
      whileHover={{ scale: 1.08 }}
      className={cn(
        "relative h-12 w-full rounded-lg border-2 transition-all duration-200",
        isSelected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-transparent hover:border-primary/30"
      )}
      style={{ background: preset.value }}
      title={preset.label}
    >
      {isSelected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 400, damping: 15 }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <Check className="h-5 w-5 text-white drop-shadow-md" />
        </motion.div>
      )}
    </motion.button>
  );
}
