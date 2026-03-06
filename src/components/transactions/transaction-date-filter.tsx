"use client";

import { useState } from "react";
import { CalendarDays, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { formatDateForInput, formatDate } from "@/lib/utils/date";
import type { TransactionData } from "@/lib/types/transactions";

// ────────────────────────────────────────────
// Types
// ────────────────────────────────────────────

export type DatePreset =
  | "all"
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "this-year"
  | "custom";

export interface DateRange {
  from: string | null;
  to: string | null;
}

// ────────────────────────────────────────────
// Pure functions
// ────────────────────────────────────────────

export function getDateRangeFromPreset(preset: DatePreset): DateRange {
  const now = new Date();
  const today = formatDateForInput(now);

  switch (preset) {
    case "all":
      return { from: null, to: null };

    case "this-month": {
      const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
      return { from, to: today };
    }

    case "last-month": {
      const firstOfLast = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastOfLast = new Date(now.getFullYear(), now.getMonth(), 0);
      return {
        from: formatDateForInput(firstOfLast),
        to: formatDateForInput(lastOfLast),
      };
    }

    case "last-3-months": {
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
      return { from: formatDateForInput(threeMonthsAgo), to: today };
    }

    case "this-year": {
      return { from: `${now.getFullYear()}-01-01`, to: today };
    }

    case "custom":
      return { from: null, to: null };
  }
}

export function filterByDateRange(
  transactions: TransactionData[],
  range: DateRange
): TransactionData[] {
  return transactions.filter((tx) => {
    if (range.from && tx.date < range.from) return false;
    if (range.to && tx.date > range.to) return false;
    return true;
  });
}

// ────────────────────────────────────────────
// Preset config
// ────────────────────────────────────────────

const PRESETS: { value: DatePreset; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "this-month", label: "This Month" },
  { value: "last-month", label: "Last Month" },
  { value: "last-3-months", label: "Last 3 Months" },
  { value: "this-year", label: "This Year" },
  { value: "custom", label: "Custom Range" },
];

function detectActivePreset(value: DateRange): DatePreset {
  if (value.from === null && value.to === null) return "all";

  for (const preset of ["this-month", "last-month", "last-3-months", "this-year"] as const) {
    const range = getDateRangeFromPreset(preset);
    if (range.from === value.from && range.to === value.to) return preset;
  }

  return "custom";
}

function getPresetLabel(preset: DatePreset): string {
  return PRESETS.find((p) => p.value === preset)?.label ?? "All Time";
}

function getTriggerLabel(value: DateRange): string {
  const preset = detectActivePreset(value);
  if (preset !== "custom") return getPresetLabel(preset);

  const parts: string[] = [];
  if (value.from) parts.push(formatDate(value.from, { month: "short", day: "numeric" }));
  if (value.to) parts.push(formatDate(value.to, { month: "short", day: "numeric" }));
  return parts.length > 0 ? `Custom: ${parts.join(" – ")}` : "Custom Range";
}

// ────────────────────────────────────────────
// Component
// ────────────────────────────────────────────

interface TransactionDateFilterProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
}

export function TransactionDateFilter({
  value,
  onChange,
}: TransactionDateFilterProps) {
  const [open, setOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(
    () => detectActivePreset(value) === "custom"
  );
  const [prevActivePreset, setPrevActivePreset] = useState(
    () => detectActivePreset(value)
  );

  const activePreset = detectActivePreset(value);

  if (activePreset !== prevActivePreset) {
    setPrevActivePreset(activePreset);
    setShowCustom(activePreset === "custom");
  }

  function handlePresetSelect(preset: DatePreset) {
    if (preset === "custom") {
      setShowCustom(true);
      return;
    }

    setShowCustom(false);
    onChange(getDateRangeFromPreset(preset));
    setOpen(false);
  }

  function handleCustomFromChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...value, from: e.target.value || null });
  }

  function handleCustomToChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange({ ...value, to: e.target.value || null });
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <CalendarDays className="size-3.5" />
          {getTriggerLabel(value)}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-56 p-1.5">
        <div className="flex flex-col gap-0.5">
          {PRESETS.map((preset) => (
            <Button
              key={preset.value}
              variant="ghost"
              size="sm"
              className="justify-between font-normal"
              onClick={() => handlePresetSelect(preset.value)}
            >
              {preset.label}
              {activePreset === preset.value && (
                <Check className="size-3.5 text-primary" />
              )}
            </Button>
          ))}
        </div>

        {showCustom && (
          <div className="mt-2 flex flex-col gap-2 border-t pt-2">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="date-filter-from"
                className="text-xs font-medium text-muted-foreground"
              >
                From
              </label>
              <input
                id="date-filter-from"
                type="date"
                value={value.from ?? ""}
                onChange={handleCustomFromChange}
                className="h-8 w-full rounded-md border bg-background px-2 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label
                htmlFor="date-filter-to"
                className="text-xs font-medium text-muted-foreground"
              >
                To
              </label>
              <input
                id="date-filter-to"
                type="date"
                value={value.to ?? ""}
                onChange={handleCustomToChange}
                className="h-8 w-full rounded-md border bg-background px-2 text-sm"
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
