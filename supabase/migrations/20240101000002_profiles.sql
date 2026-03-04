-- 002: Profiles table
-- =============================================================================

create table public.profiles (
  id                       uuid        primary key references auth.users on delete cascade,
  display_name             text,
  currency                 text        not null default 'EUR',
  role                     text        not null default 'user'
                                       check (role in ('admin', 'user')),
  hero_banner              jsonb       not null default '{"type":"color","value":"#2d4a3e"}'::jsonb,
  subscription_tier        text        not null default 'free'
                                       check (subscription_tier in ('free', 'pro')),
  stripe_customer_id       text,
  theme_preference         text        not null default 'system'
                                       check (theme_preference in ('system', 'light', 'dark')),
  onboarding_completed_steps jsonb     not null default '[]'::jsonb,
  onboarding_completed_at  timestamptz,
  tour_completed_steps     jsonb       not null default '[]'::jsonb,
  tour_completed_at        timestamptz,
  notification_preferences jsonb       not null default '{
    "reminder_due_dates":   {"email": true, "in_app": true},
    "budget_80_percent":    {"email": true, "in_app": true},
    "budget_100_percent":   {"email": true, "in_app": true},
    "reminder_days_before": 1
  }'::jsonb,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Helper: check if the current user is an admin
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;
