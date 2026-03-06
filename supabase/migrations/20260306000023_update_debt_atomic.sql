create or replace function public.update_debt_atomic(
  p_debt_id uuid,
  p_counterparty text,
  p_type text,
  p_category_id uuid default null,
  p_debt_date date default current_date,
  p_original_amount numeric default null,
  p_description text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_debt public.debts%rowtype;
  v_category_type text;
  v_effective_category_id uuid;
  v_payment_count integer;
  v_paid_amount numeric;
  v_new_remaining_amount numeric;
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

  v_effective_category_id := coalesce(p_category_id, v_debt.category_id);

  if v_effective_category_id is not null then
    select type
      into v_category_type
    from public.categories
    where id = v_effective_category_id
      and user_id = auth.uid();

    if v_category_type is null then
      raise exception 'Category not found';
    end if;

    if p_type = 'i_owe' and v_category_type <> 'expense' then
      raise exception 'Debt type i_owe requires an expense category';
    end if;

    if p_type = 'they_owe' and v_category_type <> 'income' then
      raise exception 'Debt type they_owe requires an income category';
    end if;
  end if;

  select count(*)::int
    into v_payment_count
  from public.debt_payments
  where debt_id = p_debt_id
    and user_id = auth.uid();

  if v_payment_count > 0 and p_type <> v_debt.type then
    raise exception 'Cannot change debt direction after payments have been logged';
  end if;

  v_paid_amount := v_debt.original_amount - v_debt.remaining_amount;
  if p_original_amount < v_paid_amount then
    raise exception 'Original amount cannot be below already paid amount';
  end if;

  v_new_remaining_amount := p_original_amount - v_paid_amount;

  update public.debts
     set counterparty = p_counterparty,
         type = p_type,
         category_id = v_effective_category_id,
         debt_date = p_debt_date,
         original_amount = p_original_amount,
         remaining_amount = v_new_remaining_amount,
         description = p_description
   where id = p_debt_id
     and user_id = auth.uid();

  return jsonb_build_object(
    'debt_id', p_debt_id,
    'remaining_amount', v_new_remaining_amount,
    'category_id', v_effective_category_id
  );
end;
$$;
