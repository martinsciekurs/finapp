-- 004: Categories table
-- =============================================================================

create table public.categories (
  id                    uuid        primary key default gen_random_uuid(),
  user_id               uuid        not null references public.profiles (id) on delete cascade,
  name                  text        not null,
  type                  text        not null check (type in ('expense', 'income')),
  icon                  text        not null default 'circle',
  color                 text        not null default '#2d4a3e',
  budget_limit          numeric     check (budget_limit >= 0),
  sort_order            int         not null default 0,
  budget_80_notified_at  timestamptz,
  budget_100_notified_at timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_categories_updated_at
  before update on public.categories
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.categories enable row level security;

create policy "Users can view own categories"
  on public.categories for select
  using (auth.uid() = user_id);

create policy "Users can insert own categories"
  on public.categories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own categories"
  on public.categories for update
  using (auth.uid() = user_id);

create policy "Users can delete own categories"
  on public.categories for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_categories_user_id
  on public.categories (user_id);

-- Unique constraints: composite FK support + duplicate prevention
alter table public.categories
  add constraint uq_categories_id_user unique (id, user_id);

alter table public.categories
  add constraint uq_categories_user_type_name unique (user_id, type, name);

-- Unique constraint for composite FK from transactions (id, user_id, type)
alter table public.categories
  add constraint uq_categories_id_user_type unique (id, user_id, type);
