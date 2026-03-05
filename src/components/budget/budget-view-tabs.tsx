"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

interface BudgetViewTabsProps {
  currentView: string;
}

export function BudgetViewTabs({ currentView }: BudgetViewTabsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function navigate(view: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (view === "track") {
      params.delete("view");
      params.delete("year");
    } else {
      params.set("view", view);
      params.delete("month");
    }
    const query = params.toString();
    router.push(`/dashboard/budget${query ? `?${query}` : ""}`);
  }

  return (
    <div className="flex gap-1 rounded-lg bg-muted p-1">
      <Button
        variant={currentView === "track" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => navigate("track")}
        className="rounded-md"
      >
        Track
      </Button>
      <Button
        variant={currentView === "plan" ? "secondary" : "ghost"}
        size="sm"
        onClick={() => navigate("plan")}
        className="rounded-md"
      >
        Plan
      </Button>
    </div>
  );
}
