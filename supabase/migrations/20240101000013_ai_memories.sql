-- 013: AI memories table
-- =============================================================================

create table public.ai_memories (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles (id) on delete cascade,
  rule        text        not null,
  source      text        not null check (source in ('auto', 'manual')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-update updated_at
create trigger set_ai_memories_updated_at
  before update on public.ai_memories
  for each row
  execute function public.set_updated_at();

-- Row-Level Security
alter table public.ai_memories enable row level security;

create policy "Users can view own ai memories"
  on public.ai_memories for select
  using (auth.uid() = user_id);

create policy "Users can insert own ai memories"
  on public.ai_memories for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ai memories"
  on public.ai_memories for update
  using (auth.uid() = user_id);

create policy "Users can delete own ai memories"
  on public.ai_memories for delete
  using (auth.uid() = user_id);

-- Indexes
create index idx_ai_memories_user_id
  on public.ai_memories (user_id);
