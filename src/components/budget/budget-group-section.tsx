import type { BudgetGroupData } from "@/lib/types/budget";
import {
  BudgetedCategoryRow,
  UnbudgetedCategoryRow,
} from "./budget-category-row";

interface BudgetGroupSectionProps {
  group: BudgetGroupData;
  currency: string;
  yearMonth: string;
}

export function BudgetGroupSection({
  group,
  currency,
  yearMonth,
}: BudgetGroupSectionProps) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {group.groupName}
      </h3>

      {/* Budgeted categories in a card */}
      {group.budgetedCategories.length > 0 && (
        <div className="rounded-xl border bg-card shadow-sm">
          {group.budgetedCategories.map((item) => (
            <BudgetedCategoryRow
              key={item.categoryId}
              item={item}
              currency={currency}
              yearMonth={yearMonth}
            />
          ))}
        </div>
      )}

      {/* Unbudgeted categories (dashed border) */}
      {group.unbudgetedCategories.length > 0 && (
        <div className="mt-2 space-y-2">
          {group.unbudgetedCategories.map((item) => (
            <UnbudgetedCategoryRow
              key={item.categoryId}
              item={item}
              currency={currency}
              yearMonth={yearMonth}
            />
          ))}
        </div>
      )}
    </div>
  );
}
