"use client";

import { createElement } from "react";
import { motion } from "framer-motion";
import type { CategoryPreset } from "@/lib/config/categories";
import { cn } from "@/lib/utils";
import {
  ShoppingCart,
  Home,
  Zap,
  Car,
  Shield,
  Utensils,
  Film,
  ShoppingBag,
  Repeat,
  Sparkles,
  HeartPulse,
  Dumbbell,
  BookOpen,
  Banknote,
  Landmark,
  Plane,
  Gift,
  Dog,
  Baby,
  Circle,
  Briefcase,
  Laptop,
  Building2,
  TrendingUp,
  Key,
  GraduationCap,
  RotateCcw,
  CirclePlus,
  Check,
  type LucideIcon,
} from "lucide-react";

// ── Icon Map ───────────────────────────────────────────────
const ICON_MAP: Record<string, LucideIcon> = {
  "shopping-cart": ShoppingCart,
  home: Home,
  zap: Zap,
  car: Car,
  shield: Shield,
  utensils: Utensils,
  film: Film,
  "shopping-bag": ShoppingBag,
  repeat: Repeat,
  sparkles: Sparkles,
  "heart-pulse": HeartPulse,
  dumbbell: Dumbbell,
  "book-open": BookOpen,
  banknote: Banknote,
  landmark: Landmark,
  plane: Plane,
  gift: Gift,
  dog: Dog,
  baby: Baby,
  circle: Circle,
  briefcase: Briefcase,
  laptop: Laptop,
  "building-2": Building2,
  "trending-up": TrendingUp,
  key: Key,
  "graduation-cap": GraduationCap,
  "rotate-ccw": RotateCcw,
  "circle-plus": CirclePlus,
};

// ── Animation Variants ─────────────────────────────────────
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.025,
    },
  },
};

const chipVariants = {
  hidden: { opacity: 0, scale: 0.85, y: 8 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { duration: 0.25, ease: "easeOut" as const },
  },
};

// ── Main Component ─────────────────────────────────────────
interface CategoriesStepProps {
  expenseGroups: Record<string, CategoryPreset[]>;
  incomeCategories: CategoryPreset[];
  selectedExpense: CategoryPreset[];
  selectedIncome: CategoryPreset[];
  onToggle: (category: CategoryPreset) => void;
}

export function CategoriesStep({
  expenseGroups,
  incomeCategories,
  selectedExpense,
  selectedIncome,
  onToggle,
}: CategoriesStepProps) {
  const isSelected = (category: CategoryPreset) => {
    const list =
      category.type === "expense" ? selectedExpense : selectedIncome;
    return list.some((c) => c.name === category.name);
  };

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
          Pick your categories
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mt-2 text-muted-foreground max-w-md mx-auto"
        >
          Select the expense and income categories that apply to you. You can
          always change these later.
        </motion.p>
      </div>

      {/* Expense categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Expenses</h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {selectedExpense.length} selected
          </span>
        </div>
        <div className="space-y-5">
          {Object.entries(expenseGroups).map(([group, categories]) => (
            <div key={group}>
              <p className="mb-2.5 text-sm font-medium text-muted-foreground">
                {group}
              </p>
              <motion.div
                className="flex flex-wrap gap-2"
                variants={containerVariants}
                initial="hidden"
                animate="show"
                key={group}
              >
                {categories.map((category) => (
                  <motion.div key={category.name} variants={chipVariants}>
                    <CategoryChip
                      category={category}
                      selected={isSelected(category)}
                      onToggle={onToggle}
                    />
                  </motion.div>
                ))}
              </motion.div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Minimum 2 expense categories required
        </p>
      </motion.div>

      {/* Divider */}
      <div className="border-t border-border/50" />

      {/* Income categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Income</h3>
          <span className="text-xs font-medium text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
            {selectedIncome.length} selected
          </span>
        </div>
        <motion.div
          className="flex flex-wrap gap-2"
          variants={containerVariants}
          initial="hidden"
          animate="show"
        >
          {incomeCategories.map((category) => (
            <motion.div key={category.name} variants={chipVariants}>
              <CategoryChip
                category={category}
                selected={isSelected(category)}
                onToggle={onToggle}
              />
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </div>
  );
}

// ── Category Chip ──────────────────────────────────────────
function CategoryChip({
  category,
  selected,
  onToggle,
}: {
  category: CategoryPreset;
  selected: boolean;
  onToggle: (category: CategoryPreset) => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={() => onToggle(category)}
      aria-pressed={selected}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
        selected
          ? "border-primary bg-primary text-primary-foreground shadow-md"
          : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
      )}
    >
      <span className="flex h-5 w-5 items-center justify-center">
        {createElement(ICON_MAP[category.icon] || Circle, {
          className: "h-4 w-4",
        })}
      </span>
      {category.name}
      {selected && <Check className="h-3.5 w-3.5 ml-0.5" />}
    </motion.button>
  );
}
