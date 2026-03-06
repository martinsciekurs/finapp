create or replace function public.delete_debt_atomic(
  p_debt_id uuid,
  p_delete_linked_transactions boolean default false
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debt_id uuid;
begin
  select id
    into v_debt_id
  from public.debts
  where id = p_debt_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Debt not found';
  end if;

  if not p_delete_linked_transactions then
    update public.debt_payments
       set transaction_id = null
     where debt_id = p_debt_id
       and user_id = auth.uid()
       and transaction_id is not null;
  end if;

  delete from public.debts
   where id = p_debt_id
     and user_id = auth.uid();

  return jsonb_build_object(
    'debt_id', v_debt_id,
    'deleted_linked_transactions', p_delete_linked_transactions
  );
end;
$$;
