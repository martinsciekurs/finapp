import type { Metadata } from "next";
import {
  fetchReminders,
  fetchReminderTemplates,
  fetchReminderCategories,
} from "@/lib/queries/reminders";
import { fetchUserCurrency } from "@/lib/queries/dashboard";
import { ReminderList } from "@/components/reminders/reminder-list";

export const metadata: Metadata = {
  title: "Reminders",
};

export default async function RemindersPage() {
  const [groupedOccurrences, reminders, categories, currency] = await Promise.all([
    fetchReminders(),
    fetchReminderTemplates(),
    fetchReminderCategories(),
    fetchUserCurrency(),
  ]);

  return (
    <ReminderList
      data={groupedOccurrences}
      reminders={reminders}
      categories={categories}
      currency={currency}
    />
  );
}
