-- 006: Transactions table
-- =============================================================================

create table public.transactions (
  id            uuid        primary key default gen_random_uuid(),
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  category_id   uuid        not null,
  amount        numeric     not null check (amount > 0),
  type          text        not null check (type in ('expense', 'income')),
  description   text,
  date          date        not null default current_date,
  source        text        not null default 'web'
                            check (source in ('web', 'telegram', 'voice')),
  ai_generated  boolean     not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_transactions_updated_at
  before update on public.transactions
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.transactions enable row level security;

create policy "Users can view own transactions"
  on public.transactions for select
  using (auth.uid() = user_id);

create policy "Users can insert own transactions"
  on public.transactions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own transactions"
  on public.transactions for update
  using (auth.uid() = user_id);

create policy "Users can delete own transactions"
  on public.transactions for delete
  using (auth.uid() = user_id);

-- Indexes for common query patterns
create index idx_transactions_user_date
  on public.transactions (user_id, date desc);

create index idx_transactions_user_type_date
  on public.transactions (user_id, type, date);

create index idx_transactions_category_id
  on public.transactions (category_id);

-- Composite FK: enforce category belongs to same user AND type matches
alter table public.transactions
  add constraint fk_transactions_category
  foreign key (category_id, user_id, type) references public.categories (id, user_id, type) on delete restrict;

-- Unique constraint for composite FK from debt_payments
alter table public.transactions
  add constraint uq_transactions_id_user unique (id, user_id);
