-- 009: Banner presets table
-- =============================================================================

create table public.banner_presets (
  id          uuid        primary key default gen_random_uuid(),
  type        text        not null check (type in ('color', 'gradient', 'image')),
  value       text        not null,
  label       text        not null,
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_banner_presets_updated_at
  before update on public.banner_presets
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.banner_presets enable row level security;

-- All authenticated users can read presets
create policy "Authenticated users can view banner presets"
  on public.banner_presets for select
  to authenticated
  using (true);

-- Only admins can manage presets
create policy "Admins can insert banner presets"
  on public.banner_presets for insert
  to authenticated
  with check (public.is_admin());

create policy "Admins can update banner presets"
  on public.banner_presets for update
  to authenticated
  using (public.is_admin());

create policy "Admins can delete banner presets"
  on public.banner_presets for delete
  to authenticated
  using (public.is_admin());
