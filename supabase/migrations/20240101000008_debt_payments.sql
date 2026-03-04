-- 008: Debt payments table
-- =============================================================================

create table public.debt_payments (
  id              uuid        primary key default gen_random_uuid(),
  debt_id         uuid        not null references public.debts (id) on delete cascade,
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  amount          numeric     not null check (amount > 0),
  note            text,
  transaction_id  uuid        references public.transactions (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_debt_payments_updated_at
  before update on public.debt_payments
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.debt_payments enable row level security;

create policy "Users can view own debt payments"
  on public.debt_payments for select
  using (auth.uid() = user_id);

create policy "Users can insert own debt payments"
  on public.debt_payments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own debt payments"
  on public.debt_payments for update
  using (auth.uid() = user_id);

create policy "Users can delete own debt payments"
  on public.debt_payments for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_debt_payments_debt_id
  on public.debt_payments (debt_id);

create index idx_debt_payments_user_id
  on public.debt_payments (user_id);
