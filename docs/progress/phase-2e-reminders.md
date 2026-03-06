# Phase 2E: Reminders — Progress

## Reminder UI (DONE)
- [x] `/dashboard/reminders` page wired to server queries (`fetchReminders`, `fetchReminderTemplates`, `fetchReminderCategories`)
- [x] `ReminderList` UI with grouped sections: Overdue, Upcoming, Paid
- [x] Reminder row actions: mark paid, undo payment, edit reminder, delete reminder
- [x] Add/Edit reminder dialog (`ReminderFormDialog`) with category picker and frequency selector
- [x] Delete confirmation dialog (`DeleteReminderDialog`)

## Payment Model & Server Actions (DONE)
- [x] Per-occurrence payment model implemented via `reminder_payments` table (migration `20260304000020_reminder_payments.sql`)
- [x] `createReminder`, `updateReminder`, `deleteReminder` server actions
- [x] `markOccurrencePaid` action:
  - [x] validates occurrence against recurrence schedule
  - [x] reserves payment record with unique `(reminder_id, due_date)` guard
  - [x] auto-creates linked expense transaction when `auto_create_transaction = true`
  - [x] links `reminder_payments.transaction_id`
  - [x] rollback handling for partial failures
- [x] `markOccurrenceUnpaid` action removes payment record for occurrence

## Data & Query Layer (DONE)
- [x] Occurrence generation engine for weekly/monthly/yearly with month-end day clamping
- [x] Reminder grouping and sorting (overdue/upcoming/paid)
- [x] Dashboard upcoming-reminders aggregation query with period filters (`7d`, `end_of_month`)

## States & UX (DONE)
- [x] Empty state for no reminders
- [x] Loading skeleton (`RemindersSkeleton`) + route `loading.tsx`
- [x] Toast feedback for all reminder actions

## Tests (DONE)
- [x] Zod schema tests: `src/lib/validations/__tests__/reminder.test.ts`
- [x] Reminder action tests: `src/app/dashboard/reminders/__tests__/actions.test.ts`
- [x] Reminder list component tests: `src/components/reminders/__tests__/reminder-list.test.tsx`
- [x] pgTAP reminder coverage: `supabase/tests/06_reminders.sql`

## Notes
- Reminder lifecycle is occurrence-based (payment history in `reminder_payments`), not a single `is_paid` toggle per template.
- Recurring schedules are represented as templates + paid occurrences, which supports history and undo per period.
