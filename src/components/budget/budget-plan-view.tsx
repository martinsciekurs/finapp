import { fetchPlannerData, fetchSpendingSuggestions } from "@/lib/queries/budget";
import { BudgetPlanViewClient } from "./budget-plan-view-client";

/**
 * Server Component wrapper for Plan Mode.
 * Fetches data and renders the client component.
 */
export async function BudgetPlanView({
  year,
  currency,
}: {
  year: number;
  currency: string;
}) {
  const [data, suggestions] = await Promise.all([
    fetchPlannerData(year),
    fetchSpendingSuggestions(),
  ]);

  return (
    <BudgetPlanViewClient
      data={data}
      suggestions={suggestions}
      currency={currency}
    />
  );
}
