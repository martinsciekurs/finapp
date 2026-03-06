create or replace function public.delete_debt_payment_atomic(
  p_payment_id uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debt_id uuid;
  v_transaction_id uuid;
begin
  select d.id
    into v_debt_id
  from public.debts d
  join public.debt_payments dp
    on dp.debt_id = d.id
   and dp.user_id = d.user_id
  where dp.id = p_payment_id
    and dp.user_id = auth.uid()
    and d.user_id = auth.uid()
  for update of d;

  if not found then
    raise exception 'Payment not found';
  end if;

  delete from public.debt_payments
  where id = p_payment_id
    and user_id = auth.uid()
  returning transaction_id into v_transaction_id;

  if not found then
    raise exception 'Payment not found';
  end if;

  return jsonb_build_object(
    'payment_id', p_payment_id,
    'transaction_id', v_transaction_id,
    'debt_id', v_debt_id
  );
end;
$$;
