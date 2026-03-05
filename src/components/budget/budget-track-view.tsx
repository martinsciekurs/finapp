import type { BudgetPageData } from "@/lib/types/budget";
import { BudgetSummaryCard } from "./budget-summary-card";
import { BudgetGroupSection } from "./budget-group-section";
import { EmptyState } from "@/components/ui/empty-state";
import { PieChart } from "lucide-react";

interface BudgetTrackViewProps {
  data: BudgetPageData;
  currency: string;
  yearMonth: string;
}

export function BudgetTrackView({
  data,
  currency,
  yearMonth,
}: BudgetTrackViewProps) {
  const hasAnyContent =
    data.summary.incomeTarget > 0 || data.groups.length > 0;

  if (!hasAnyContent) {
    return (
      <EmptyState
        icon={PieChart}
        title="No budgets yet"
        description="Set up your monthly budget to track spending against your income. Start by setting an income target, then assign budgets to your expense categories."
      />
    );
  }

  return (
    <div className="space-y-6">
      <BudgetSummaryCard
        summary={data.summary}
        currency={currency}
        yearMonth={yearMonth}
      />

      {data.groups.length > 0 ? (
        <div className="space-y-6">
          {data.groups.map((group) => (
            <BudgetGroupSection
              key={group.groupId}
              group={group}
              currency={currency}
              yearMonth={yearMonth}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={PieChart}
          title="No category spending"
          description="No expense categories have budgets or spending for this month."
        />
      )}
    </div>
  );
}
