-- 014: Attachments table (polymorphic file references)
-- =============================================================================

create table public.attachments (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles (id) on delete cascade,
  record_type  text        not null check (record_type in ('transaction', 'debt', 'reminder')),
  record_id    uuid        not null,
  file_path    text        not null,
  file_name    text        not null,
  file_size    int         not null,
  mime_type    text        not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_attachments_updated_at
  before update on public.attachments
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.attachments enable row level security;

create policy "Users can view own attachments"
  on public.attachments for select
  using (auth.uid() = user_id);

create policy "Users can insert own attachments"
  on public.attachments for insert
  with check (auth.uid() = user_id);

create policy "Users can update own attachments"
  on public.attachments for update
  using (auth.uid() = user_id);

create policy "Users can delete own attachments"
  on public.attachments for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_attachments_record
  on public.attachments (record_type, record_id);

create index idx_attachments_user_id
  on public.attachments (user_id);
