-- 030: RPC function for atomic tour step append (mirrors append_onboarding_step)
-- =============================================================================

create or replace function public.append_tour_step(
  profile_id uuid,
  step text
)
returns void
language plpgsql
security definer
set search_path = public, pg_catalog
as $$
begin
  -- Ensure caller owns this profile (function is SECURITY DEFINER, bypasses RLS)
  if auth.uid() is distinct from profile_id then
    raise exception 'Unauthorized: caller does not own this profile';
  end if;

  update public.profiles
  set tour_completed_steps = case
    when tour_completed_steps is null then jsonb_build_array(step)
    when not (tour_completed_steps @> to_jsonb(step)) then tour_completed_steps || to_jsonb(step)
    else tour_completed_steps
  end
  where id = profile_id;
end;
$$;
