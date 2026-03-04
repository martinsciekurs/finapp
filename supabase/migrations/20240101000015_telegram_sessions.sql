-- 015: Telegram sessions table
-- =============================================================================

create table public.telegram_sessions (
  chat_id         bigint      primary key,
  user_id         uuid        not null references public.profiles (id) on delete cascade,
  messages        jsonb       not null default '[]'::jsonb,
  pending_action  jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_telegram_sessions_updated_at
  before update on public.telegram_sessions
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.telegram_sessions enable row level security;

create policy "Users can view own telegram sessions"
  on public.telegram_sessions for select
  using (auth.uid() = user_id);

create policy "Users can insert own telegram sessions"
  on public.telegram_sessions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own telegram sessions"
  on public.telegram_sessions for update
  using (auth.uid() = user_id);

create policy "Users can delete own telegram sessions"
  on public.telegram_sessions for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_telegram_sessions_user_id
  on public.telegram_sessions (user_id);
