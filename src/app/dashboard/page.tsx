import type { Metadata } from "next";
import { getCurrentMonthLabel } from "@/lib/utils/date";
import {
  fetchUserCurrency,
  fetchMonthlySummary,
  fetchBudgetCategories,
  fetchRecentTransactions,
} from "@/lib/queries/dashboard";
import { fetchUpcomingRemindersData } from "@/lib/queries/reminders";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { BudgetOverview } from "@/components/dashboard/budget-overview";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const [currency, { summary, spentByCategory }, upcomingRemindersData, recentTransactions] =
    await Promise.all([
      fetchUserCurrency(),
      fetchMonthlySummary(),
      fetchUpcomingRemindersData(),
      fetchRecentTransactions(),
    ]);

  const budgetCategories = await fetchBudgetCategories(spentByCategory);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-serif text-xl font-bold sm:text-2xl">Overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {getCurrentMonthLabel()}
        </p>
      </div>

      <SummaryCards
        totalSpent={summary.totalSpent}
        totalIncome={summary.totalIncome}
        weeklySpending={summary.weeklySpending}
        upcomingReminders={upcomingRemindersData}
        currency={currency}
      />

      <BudgetOverview categories={budgetCategories} currency={currency} />

      <RecentTransactions
        transactions={recentTransactions}
        currency={currency}
      />
    </div>
  );
}
