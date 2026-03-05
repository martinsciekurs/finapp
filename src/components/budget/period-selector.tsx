"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentYearMonth } from "@/lib/utils/date";

interface PeriodSelectorProps {
  currentMonth: string; // "YYYY-MM"
}

function parseYearMonth(ym: string): { year: number; month: number } {
  const [y, m] = ym.split("-");
  return { year: Number(y), month: Number(m) };
}

function formatYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function getMonthLabel(ym: string): string {
  const { year, month } = parseYearMonth(ym);
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function getPrevMonth(ym: string): string {
  const { year, month } = parseYearMonth(ym);
  if (month === 1) return formatYearMonth(year - 1, 12);
  return formatYearMonth(year, month - 1);
}

function getNextMonth(ym: string): string {
  const { year, month } = parseYearMonth(ym);
  if (month === 12) return formatYearMonth(year + 1, 1);
  return formatYearMonth(year, month + 1);
}

export function PeriodSelector({ currentMonth }: PeriodSelectorProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const thisMonth = getCurrentYearMonth();
  const lastMonth = getPrevMonth(thisMonth);

  function navigate(month: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (month === thisMonth) {
      params.delete("month");
    } else {
      params.set("month", month);
    }
    // Preserve view param if present
    const query = params.toString();
    router.push(`/dashboard/budget${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => navigate(getPrevMonth(currentMonth))}
          aria-label="Previous month"
        >
          <ChevronLeft />
        </Button>
        <span className="min-w-[140px] text-center text-sm font-medium">
          {getMonthLabel(currentMonth)}
        </span>
        <Button
          variant="outline"
          size="icon-sm"
          onClick={() => navigate(getNextMonth(currentMonth))}
          aria-label="Next month"
        >
          <ChevronRight />
        </Button>
      </div>

      <div className="flex gap-1">
        <Button
          variant={currentMonth === thisMonth ? "secondary" : "ghost"}
          size="xs"
          onClick={() => navigate(thisMonth)}
        >
          This Month
        </Button>
        <Button
          variant={currentMonth === lastMonth ? "secondary" : "ghost"}
          size="xs"
          onClick={() => navigate(lastMonth)}
        >
          Last Month
        </Button>
      </div>
    </div>
  );
}
