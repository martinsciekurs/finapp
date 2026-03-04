-- 012: Daily usage table (AI credit tracking)
-- =============================================================================

create table public.daily_usage (
  user_id       uuid        not null references public.profiles (id) on delete cascade,
  credits_used  int         not null default 0,
  date          date        not null default current_date,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),

  primary key (user_id, date)
);

-- Auto-update updated_at
create trigger set_daily_usage_updated_at
  before update on public.daily_usage
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
-- Users can read and upsert their own usage. No delete — prevents credit reset.
alter table public.daily_usage enable row level security;

create policy "Users can view own daily usage"
  on public.daily_usage for select
  using (auth.uid() = user_id);

create policy "Users can insert own daily usage"
  on public.daily_usage for insert
  with check (auth.uid() = user_id);

create policy "Users can update own daily usage"
  on public.daily_usage for update
  using (auth.uid() = user_id);
