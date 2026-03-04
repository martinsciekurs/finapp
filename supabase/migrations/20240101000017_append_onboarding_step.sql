-- 017: RPC function for atomic onboarding step append
-- =============================================================================

create or replace function public.append_onboarding_step(
  profile_id uuid,
  step text
)
returns void
language plpgsql
security definer
as $$
begin
  -- Ensure caller owns this profile (function is SECURITY DEFINER, bypasses RLS)
  if auth.uid() is distinct from profile_id then
    raise exception 'Unauthorized: caller does not own this profile';
  end if;

  update public.profiles
  set onboarding_completed_steps = case
    when onboarding_completed_steps is null then jsonb_build_array(step)
    when not (onboarding_completed_steps @> to_jsonb(step)) then onboarding_completed_steps || to_jsonb(step)
    else onboarding_completed_steps
  end
  where id = profile_id;
end;
$$;
