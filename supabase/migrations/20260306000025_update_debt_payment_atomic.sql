create or replace function public.update_debt_payment_atomic(
  p_payment_id uuid,
  p_amount numeric,
  p_note text default null,
  p_payment_date date default current_date
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debt public.debts%rowtype;
  v_payment public.debt_payments%rowtype;
  v_description text;
  v_note text;
begin
  select d.*
    into v_debt
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

  select *
    into v_payment
  from public.debt_payments
  where id = p_payment_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Payment not found';
  end if;

  if p_amount > v_debt.remaining_amount + v_payment.amount then
    raise exception 'Payment exceeds remaining amount';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  v_description :=
    case when v_debt.type = 'i_owe'
      then 'Payment to ' || v_debt.counterparty
      else 'Repayment from ' || v_debt.counterparty
    end;

  if v_note is not null then
    v_description := v_description || ' — ' || v_note;
  end if;

  update public.debt_payments
     set amount = p_amount,
         note = v_note
   where id = p_payment_id
     and user_id = auth.uid();

  if v_payment.transaction_id is not null then
    update public.transactions
       set amount = p_amount,
           date = p_payment_date,
           description = v_description
     where id = v_payment.transaction_id
       and user_id = auth.uid();

    if not found then
      raise exception 'Linked transaction not found';
    end if;
  end if;

  return jsonb_build_object(
    'payment_id', v_payment.id,
    'transaction_id', v_payment.transaction_id
  );
end;
$$;
