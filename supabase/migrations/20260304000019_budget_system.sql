-- 019: Budget System — category_budgets + monthly_income_targets
-- =============================================================================
-- Two new tables for the income-driven (YNAB-style) budget system.
-- category_budgets: per-category, per-month budget allocations
-- monthly_income_targets: per-user, per-month expected income
-- =============================================================================

-- ────────────────────────────────────────────
-- category_budgets
-- ────────────────────────────────────────────

create table public.category_budgets (
  id          uuid        default gen_random_uuid() primary key,
  category_id uuid        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  year_month  text        not null,
  amount      numeric(12,2) not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  -- Composite FK: category must belong to the same user
  constraint fk_category_budgets_category
    foreign key (category_id, user_id)
    references public.categories(id, user_id)
    on delete cascade,

  -- One budget per category per month
  constraint uq_category_budgets_category_month
    unique (category_id, year_month),

  -- Amount must be positive
  constraint chk_category_budgets_amount_positive
    check (amount > 0),

  -- Year-month format: YYYY-MM
  constraint chk_category_budgets_year_month_format
    check (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

-- RLS
alter table public.category_budgets enable row level security;

create policy "Users can manage their own category budgets"
  on public.category_budgets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index idx_category_budgets_user_month
  on public.category_budgets (user_id, year_month);

-- Trigger: auto-update updated_at
create trigger set_updated_at
  before update on public.category_budgets
  for each row
  execute function public.set_updated_at();

-- Grants
grant select, insert, update, delete on public.category_budgets to authenticated;

-- ────────────────────────────────────────────
-- monthly_income_targets
-- ────────────────────────────────────────────

create table public.monthly_income_targets (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  year_month  text        not null,
  amount      numeric(12,2) not null,
  created_at  timestamptz default now(),
  updated_at  timestamptz default now(),

  -- One income target per user per month
  constraint uq_income_targets_user_month
    unique (user_id, year_month),

  -- Amount must be positive
  constraint chk_income_targets_amount_positive
    check (amount > 0),

  -- Year-month format: YYYY-MM
  constraint chk_income_targets_year_month_format
    check (year_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$')
);

-- RLS
alter table public.monthly_income_targets enable row level security;

create policy "Users can manage their own income targets"
  on public.monthly_income_targets
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Indexes
create index idx_income_targets_user_month
  on public.monthly_income_targets (user_id, year_month);

-- Trigger: auto-update updated_at
create trigger set_updated_at
  before update on public.monthly_income_targets
  for each row
  execute function public.set_updated_at();

-- Grants
grant select, insert, update, delete on public.monthly_income_targets to authenticated;
