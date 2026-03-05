import type { ReminderFrequency } from "@/lib/types/reminder";

/** Frequency options used in forms and display badges. */
export const FREQUENCY_OPTIONS: readonly {
  value: ReminderFrequency;
  label: string;
}[] = [
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "yearly", label: "Yearly" },
  { value: "one_time", label: "One-time" },
] as const;

/** Lookup map for frequency display labels. */
export const FREQUENCY_LABELS: Record<ReminderFrequency, string> =
  Object.fromEntries(FREQUENCY_OPTIONS.map((o) => [o.value, o.label])) as Record<
    ReminderFrequency,
    string
  >;
