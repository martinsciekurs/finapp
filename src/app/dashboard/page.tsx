import type { Metadata } from "next";
import { getCurrentMonthLabel } from "@/lib/utils/date";
import {
  fetchUserCurrency,
  fetchMonthlySummary,
  fetchBudgetOverviewData,
  fetchRecentTransactions,
} from "@/lib/queries/dashboard";
import { fetchHasDebts } from "@/lib/queries/debts";
import { fetchUpcomingRemindersData } from "@/lib/queries/reminders";
import { fetchTourState } from "@/lib/queries/tour";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { QuickTip } from "@/components/tour/quick-tip";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [currency, { summary, spentByCategory }, upcomingRemindersData, recentTransactions, tourState, hasDebts] =
    await Promise.all([
      fetchUserCurrency(),
      fetchMonthlySummary(),
      fetchUpcomingRemindersData(),
      fetchRecentTransactions(),
      fetchTourState(),
      fetchHasDebts(),
    ]);

  const budgetOverviewData = await fetchBudgetOverviewData(spentByCategory);

  const hasTransactions = summary.totalSpent > 0 || summary.totalIncome > 0;
  const hasBudgets = budgetOverviewData.budgetedCategories.length > 0;
  const dismissed = tourState.tourCompletedSteps;

  const showBudgetTip =
    hasTransactions && !hasBudgets && !dismissed.includes("tip-budget");
  const showDebtsTip =
    hasBudgets && !hasDebts && !dismissed.includes("tip-debts");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold sm:text-2xl">Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {getCurrentMonthLabel()}
        </p>
      </div>

      <SummaryCards
        income={{ month: summary.totalIncome, "7d": summary.weeklyIncome }}
        spending={{ month: summary.totalSpent, "7d": summary.weeklySpending }}
        upcomingReminders={upcomingRemindersData}
        currency={currency}
      />

      {showBudgetTip && (
        <QuickTip
          tipId="tip-budget"
          title="Set a budget"
          description="You've started tracking transactions. Set monthly budgets to keep your spending on track."
          href="/dashboard/budget"
          ctaLabel="Go to Budget"
        />
      )}

      <BudgetOverview data={budgetOverviewData} currency={currency} />

      {showDebtsTip && (
        <QuickTip
          tipId="tip-debts"
          title="Track debts with friends"
          description="Keep track of money you owe or are owed. Log payments and watch balances update automatically."
          href="/dashboard/debts"
          ctaLabel="Go to Debts"
        />
      )}

      <RecentTransactions
        transactions={recentTransactions}
        currency={currency}
      />
    </div>
  );
}
