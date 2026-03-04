import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold sm:text-2xl">Overview</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Summary cards, charts, and recent transactions will appear here.
      </p>
    </div>
  );
}
