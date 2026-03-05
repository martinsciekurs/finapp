import type { Metadata } from "next";
import { Suspense } from "react";
import { fetchBudgetPageData } from "@/lib/queries/budget";
import { fetchUserCurrency } from "@/lib/queries/dashboard";
import { getCurrentYearMonth } from "@/lib/utils/date";
import { yearMonthSchema } from "@/lib/validations/budget";
import { PeriodSelector } from "@/components/budget/period-selector";
import { BudgetTrackView } from "@/components/budget/budget-track-view";
import { BudgetPlanView } from "@/components/budget/budget-plan-view";
import { BudgetViewTabs } from "@/components/budget/budget-view-tabs";

export const metadata: Metadata = {
  title: "Budget",
};

interface BudgetPageProps {
  searchParams: Promise<{ month?: string; view?: string; year?: string }>;
}

export default async function BudgetPage({ searchParams }: BudgetPageProps) {
  const params = await searchParams;

  // Validate view param
  const view = params.view === "plan" ? "plan" : "track";

  // Validate month param (fallback to current month if invalid)
  const defaultYM = getCurrentYearMonth();
  const monthParam = params.month;
  const yearMonth =
    monthParam && yearMonthSchema.safeParse(monthParam).success
      ? monthParam
      : defaultYM;

  // Validate year param (fallback to current year if invalid)
  const yearNum = params.year ? Number(params.year) : NaN;
  const year =
    Number.isFinite(yearNum) && yearNum >= 2000 && yearNum <= 2100
      ? yearNum
      : new Date().getFullYear();

  const currency = await fetchUserCurrency();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold sm:text-2xl">Budget</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Track and plan your monthly budget.
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Suspense>
          <BudgetViewTabs currentView={view} />
        </Suspense>
        {view === "track" && (
          <Suspense>
            <PeriodSelector currentMonth={yearMonth} />
          </Suspense>
        )}
      </div>

      {view === "track" ? (
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-muted" />
          }
        >
          <TrackModeContent yearMonth={yearMonth} currency={currency} />
        </Suspense>
      ) : (
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-muted" />
          }
        >
          <BudgetPlanView year={year} currency={currency} />
        </Suspense>
      )}
    </div>
  );
}

async function TrackModeContent({
  yearMonth,
  currency,
}: {
  yearMonth: string;
  currency: string;
}) {
  const data = await fetchBudgetPageData(yearMonth);

  return (
    <BudgetTrackView data={data} currency={currency} yearMonth={yearMonth} />
  );
}
