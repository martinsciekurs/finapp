-- 001: Setup — utility trigger function and extensions
-- =============================================================================

-- Enable required extensions
create extension if not exists "pgcrypto" with schema "extensions";

-- Generic trigger function: sets updated_at = now() before every UPDATE
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
