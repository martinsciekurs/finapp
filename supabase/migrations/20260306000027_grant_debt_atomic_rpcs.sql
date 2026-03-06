do $$
begin
  revoke all on function public.update_debt_atomic(uuid, text, text, uuid, date, numeric, text) from public;
  grant execute on function public.update_debt_atomic(uuid, text, text, uuid, date, numeric, text) to authenticated;

  revoke all on function public.record_debt_payment_atomic(uuid, numeric, text, date) from public;
  grant execute on function public.record_debt_payment_atomic(uuid, numeric, text, date) to authenticated;

  revoke all on function public.update_debt_payment_atomic(uuid, numeric, text, date) from public;
  grant execute on function public.update_debt_payment_atomic(uuid, numeric, text, date) to authenticated;

  revoke all on function public.delete_debt_payment_atomic(uuid) from public;
  grant execute on function public.delete_debt_payment_atomic(uuid) to authenticated;
end;
$$;
