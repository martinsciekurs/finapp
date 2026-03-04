-- 004: Category groups table
-- =============================================================================
-- Groups allow users to organize their categories (e.g., "Essentials",
-- "Lifestyle", "Health & Growth"). Each group is typed (expense or income)
-- and ordered by sort_order within its type.

create table public.category_groups (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  name        text        not null,
  type        text        not null check (type in ('expense', 'income')),
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_category_groups_updated_at
  before update on public.category_groups
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.category_groups enable row level security;

create policy "Users can view own category groups"
  on public.category_groups for select
  using (auth.uid() = user_id);

create policy "Users can insert own category groups"
  on public.category_groups for insert
  with check (auth.uid() = user_id);

create policy "Users can update own category groups"
  on public.category_groups for update
  using (auth.uid() = user_id);

create policy "Users can delete own category groups"
  on public.category_groups for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_category_groups_user_id
  on public.category_groups (user_id);

-- Unique constraints
-- Composite FK support: categories reference (group_id, user_id)
alter table public.category_groups
  add constraint uq_category_groups_id_user unique (id, user_id);

-- Prevent duplicate group names per user per type
alter table public.category_groups
  add constraint uq_category_groups_user_type_name unique (user_id, type, name);
