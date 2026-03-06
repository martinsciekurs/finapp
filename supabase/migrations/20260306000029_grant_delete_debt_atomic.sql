do $$
begin
  revoke all on function public.delete_debt_atomic(uuid, boolean) from public;
  grant execute on function public.delete_debt_atomic(uuid, boolean) to authenticated;
end;
$$;
