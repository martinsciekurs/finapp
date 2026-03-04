import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { fetchCategoriesWithGroups } from "@/lib/queries/categories";
import { CategoryManager } from "@/components/categories/category-manager";

export const metadata: Metadata = {
  title: "Categories",
};

export default async function CategoriesPage() {
  const [expenseGroups, incomeGroups] = await Promise.all([
    fetchCategoriesWithGroups("expense"),
    fetchCategoriesWithGroups("income"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/settings"
          className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="size-3" />
          Settings
        </Link>
        <h2 className="font-serif text-xl font-bold sm:text-2xl">
          Categories
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Organize your expense and income categories into groups.
        </p>
      </div>

      <CategoryManager
        expenseGroups={expenseGroups}
        incomeGroups={incomeGroups}
      />
    </div>
  );
}
