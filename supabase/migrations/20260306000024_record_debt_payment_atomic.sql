create or replace function public.record_debt_payment_atomic(
  p_debt_id uuid,
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
  v_category_type text;
  v_transaction_type text;
  v_description text;
  v_transaction_id uuid;
  v_payment_id uuid;
  v_note text;
begin
  select *
    into v_debt
  from public.debts
  where id = p_debt_id
    and user_id = auth.uid()
  for update;

  if not found then
    raise exception 'Debt not found';
  end if;

  if v_debt.category_id is null then
    raise exception 'Debt has no category. Edit debt and choose a category first.';
  end if;

  select type
    into v_category_type
  from public.categories
  where id = v_debt.category_id
    and user_id = auth.uid();

  if v_category_type is null then
    raise exception 'Category not found';
  end if;

  if v_debt.type = 'i_owe' and v_category_type <> 'expense' then
    raise exception 'Debt type i_owe requires an expense category';
  end if;

  if v_debt.type = 'they_owe' and v_category_type <> 'income' then
    raise exception 'Debt type they_owe requires an income category';
  end if;

  if p_amount > v_debt.remaining_amount then
    raise exception 'Payment exceeds remaining amount';
  end if;

  v_note := nullif(btrim(coalesce(p_note, '')), '');
  v_transaction_type := case when v_debt.type = 'i_owe' then 'expense' else 'income' end;
  v_description :=
    case when v_debt.type = 'i_owe'
      then 'Payment to ' || v_debt.counterparty
      else 'Repayment from ' || v_debt.counterparty
    end;

  if v_note is not null then
    v_description := v_description || ' — ' || v_note;
  end if;

  insert into public.transactions (
    user_id,
    category_id,
    amount,
    type,
    description,
    date,
    source,
    ai_generated
  )
  values (
    auth.uid(),
    v_debt.category_id,
    p_amount,
    v_transaction_type,
    v_description,
    p_payment_date,
    'web',
    false
  )
  returning id into v_transaction_id;

  insert into public.debt_payments (
    debt_id,
    user_id,
    amount,
    note,
    transaction_id
  )
  values (
    p_debt_id,
    auth.uid(),
    p_amount,
    v_note,
    v_transaction_id
  )
  returning id into v_payment_id;

  return jsonb_build_object(
    'payment_id', v_payment_id,
    'transaction_id', v_transaction_id
  );
end;
$$;
