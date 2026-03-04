-- 011: Subscriptions table
-- =============================================================================

create table public.subscriptions (
  id                      uuid        primary key default gen_random_uuid(),
  user_id                 uuid        not null references public.profiles (id) on delete cascade,
  stripe_subscription_id  text        not null,
  status                  text        not null,
  current_period_end      timestamptz not null,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_subscriptions_updated_at
  before update on public.subscriptions
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
-- Subscriptions are managed server-side via Stripe webhooks (service role).
-- Users can only read their own subscription data.
alter table public.subscriptions enable row level security;

create policy "Users can view own subscriptions"
  on public.subscriptions for select
  using (auth.uid() = user_id);

-- Indexes
create index idx_subscriptions_user_id
  on public.subscriptions (user_id);

create unique index idx_subscriptions_stripe_id
  on public.subscriptions (stripe_subscription_id);
