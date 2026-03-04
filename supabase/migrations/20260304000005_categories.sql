-- 004: Categories table
-- =============================================================================
-- User-defined budget/income categories. Each category belongs to a group
-- and has a type (expense or income) that must match its group's type.
-- The type is denormalized on the category for FK integrity with transactions.

create table public.categories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  group_id    uuid        not null,
  name        text        not null,
  type        text        not null check (type in ('expense', 'income')),
  icon        text        not null default 'circle',
  color       text        not null default '#2d4a3e',
  sort_order  int         not null default 0,
  budget_80_notified_at  timestamptz,
  budget_100_notified_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
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

create index idx_categories_group_id
  on public.categories (group_id);

-- Unique constraints: composite FK support + duplicate prevention
alter table public.categories
  add constraint uq_categories_id_user unique (id, user_id);

alter table public.categories
  add constraint uq_categories_user_type_name unique (user_id, type, name);

-- Unique constraint for composite FK from transactions (id, user_id, type)
alter table public.categories
  add constraint uq_categories_id_user_type unique (id, user_id, type);

-- Composite FK: group must belong to the same user
alter table public.categories
  add constraint fk_categories_group
  foreign key (group_id, user_id) references public.category_groups (id, user_id);

-- Trigger: enforce that category type matches its group type
create or replace function public.check_category_group_type()
returns trigger
language plpgsql
as $$
declare
  group_type text;
begin
  select type into group_type
    from public.category_groups
    where id = new.group_id;

  if group_type is null then
    raise exception 'Category group not found';
  end if;

  if new.type <> group_type then
    raise exception 'Category type (%) must match group type (%)', new.type, group_type;
  end if;

  return new;
end;
$$;

create trigger check_category_group_type_trigger
  before insert or update on public.categories
  for each row
  execute function public.check_category_group_type();

-- Trigger: prevent changing a group's type when it has categories
create or replace function public.check_category_group_type_on_group_update()
returns trigger
language plpgsql
as $$
begin
  if old.type <> new.type then
    if exists (select 1 from public.categories where group_id = old.id) then
      raise exception 'Cannot change group type (% -> %) while categories exist', old.type, new.type;
    end if;
  end if;

  return new;
end;
$$;

create trigger prevent_category_group_type_change_trigger
  before update on public.category_groups
  for each row
  execute function public.check_category_group_type_on_group_update();
