-- 007: Debts table
-- =============================================================================

create table public.debts (
  id                uuid        primary key default gen_random_uuid(),
  user_id           uuid        not null references public.profiles (id) on delete cascade,
  counterparty      text        not null,
  type              text        not null check (type in ('i_owe', 'they_owe')),
  original_amount   numeric     not null check (original_amount > 0),
  remaining_amount  numeric     not null check (remaining_amount >= 0 and remaining_amount <= original_amount),
  description       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_debts_updated_at
  before update on public.debts
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.debts enable row level security;

create policy "Users can view own debts"
  on public.debts for select
  using (auth.uid() = user_id);

create policy "Users can insert own debts"
  on public.debts for insert
  with check (auth.uid() = user_id);

create policy "Users can update own debts"
  on public.debts for update
  using (auth.uid() = user_id);

create policy "Users can delete own debts"
  on public.debts for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_debts_user_id
  on public.debts (user_id);

-- Unique constraint for composite FK from debt_payments
alter table public.debts
  add constraint uq_debts_id_user unique (id, user_id);
