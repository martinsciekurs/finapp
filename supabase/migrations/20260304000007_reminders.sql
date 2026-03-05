-- 007: Reminders table
-- =============================================================================

create table public.reminders (
  id                       uuid        primary key default gen_random_uuid(),
  user_id                  uuid        not null references public.profiles (id) on delete cascade,
  title                    text        not null,
  amount                   numeric     not null check (amount > 0),
  due_date                 date        not null,
  frequency                text        not null
                                       check (frequency in ('monthly', 'weekly', 'yearly', 'one_time')),
  is_paid                  boolean     not null default false,
  auto_create_transaction  boolean     not null default true,
  category_id              uuid        not null,
  last_notified_at         timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_reminders_updated_at
  before update on public.reminders
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.reminders enable row level security;

create policy "Users can view own reminders"
  on public.reminders for select
  using (auth.uid() = user_id);

create policy "Users can insert own reminders"
  on public.reminders for insert
  with check (auth.uid() = user_id);

create policy "Users can update own reminders"
  on public.reminders for update
  using (auth.uid() = user_id);

create policy "Users can delete own reminders"
  on public.reminders for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_reminders_user_id
  on public.reminders (user_id);

create index idx_reminders_user_due
  on public.reminders (user_id, is_paid, due_date);

-- Supporting index for the composite FK (avoids sequential scans on parent deletes/updates)
create index idx_reminders_category_user
  on public.reminders (category_id, user_id);

-- Composite FK: enforce category belongs to same user
alter table public.reminders
  add constraint fk_reminders_category
  foreign key (category_id, user_id) references public.categories (id, user_id)
  on delete restrict;
