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
declare
  allowed_steps constant text[] := array[
    'welcome-tour',
    'tip-budget',
    'tip-debts'
  ];
begin
  -- Ensure caller owns this profile (function is SECURITY DEFINER, bypasses RLS)
  if auth.uid() is distinct from profile_id then
    raise exception 'Unauthorized: caller does not own this profile';
  end if;

  if step is null or btrim(step) = '' or not (step = any(allowed_steps)) then
    raise exception 'Invalid step';
  end if;

  update public.profiles
  set
    tour_completed_steps = case
      when tour_completed_steps is null then jsonb_build_array(step)
      when not (tour_completed_steps @> to_jsonb(step)) then tour_completed_steps || to_jsonb(step)
      else tour_completed_steps
    end,
    tour_completed_at = case
      when step = 'welcome-tour' then coalesce(tour_completed_at, now())
      else tour_completed_at
    end
  where id = profile_id;
end;
$$;
