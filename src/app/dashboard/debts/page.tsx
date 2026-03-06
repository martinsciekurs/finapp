import type { Metadata } from "next";
import { fetchUserCurrency } from "@/lib/queries/dashboard";
import { fetchDebtsPageData } from "@/lib/queries/debts";
import { fetchUserCategories } from "@/lib/queries/transactions";
import { DebtsView } from "@/components/debts/debts-view";

export const metadata: Metadata = {
  title: "Debts",
};

export default async function DebtsPage() {
  const [currency, data, categories] = await Promise.all([
    fetchUserCurrency(),
    fetchDebtsPageData(),
    fetchUserCategories(),
  ]);

  return <DebtsView data={data} categories={categories} currency={currency} />;
}
