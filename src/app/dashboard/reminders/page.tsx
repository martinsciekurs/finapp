import type { Metadata } from "next";
import {
  fetchReminders,
  fetchReminderTemplates,
  fetchReminderCategories,
  fetchReminderCurrency,
} from "@/lib/queries/reminders";
import { ReminderList } from "@/components/reminders/reminder-list";

export const metadata: Metadata = {
  title: "Reminders",
};

export default async function RemindersPage() {
  const [data, reminders, categories, currency] = await Promise.all([
    fetchReminders(),
    fetchReminderTemplates(),
    fetchReminderCategories(),
    fetchReminderCurrency(),
  ]);

  return (
    <ReminderList
      data={data}
      reminders={reminders}
      categories={categories}
      currency={currency}
    />
  );
}
