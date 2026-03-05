-- 020: Reminder payments — per-occurrence payment tracking
-- =============================================================================
-- Stores one row per reminder occurrence that has been explicitly marked paid.
-- Absence of a row means "not yet paid". This supports full payment history
-- for both one-time and recurring reminders.

create table public.reminder_payments (
  id              uuid        primary key default gen_random_uuid(),
  reminder_id     uuid        not null references public.reminders (id) on delete cascade,
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  due_date        date        not null,
  paid_at         timestamptz not null default now(),
  transaction_id  uuid        references public.transactions (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  -- One payment per reminder per due date
  unique (reminder_id, due_date)
);

-- Auto-update updated_at
create trigger set_reminder_payments_updated_at
  before update on public.reminder_payments
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.reminder_payments enable row level security;

create policy "Users can view own reminder payments"
  on public.reminder_payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own reminder payments"
  on public.reminder_payments for insert
  with check (auth.uid() = user_id);

create policy "Users can delete own reminder payments"
  on public.reminder_payments for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_reminder_payments_reminder_id
  on public.reminder_payments (reminder_id);

create index idx_reminder_payments_user_due
  on public.reminder_payments (user_id, due_date);
