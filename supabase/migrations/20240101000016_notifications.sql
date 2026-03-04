-- 016: Notifications table
-- =============================================================================
-- Notifications are immutable once created (except toggling is_read),
-- so there is intentionally NO updated_at column or trigger.

create table public.notifications (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  type        text        not null
                          check (type in ('budget_80', 'budget_100', 'reminder_due', 'debt_settled')),
  title       text        not null,
  message     text        not null,
  is_read     boolean     not null default false,
  data        jsonb,
  created_at  timestamptz not null default now()
);

-- Row-Level Security
alter table public.notifications enable row level security;

create policy "Users can view own notifications"
  on public.notifications for select
  using (auth.uid() = user_id);

create policy "Users can update own notifications"
  on public.notifications for update
  using (auth.uid() = user_id);

create policy "Users can delete own notifications"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- Index for the main notification feed query
create index idx_notifications_user_feed
  on public.notifications (user_id, is_read, created_at desc);
