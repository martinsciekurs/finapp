import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Reminders",
};

export default function RemindersPage() {
  return (
    <div>
      <h2 className="font-serif text-xl font-bold sm:text-2xl">Reminders</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Upcoming bills and due dates coming in Phase 2E.
      </p>
    </div>
  );
}
