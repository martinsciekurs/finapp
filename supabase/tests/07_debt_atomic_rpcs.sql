begin;
select plan(23);

select reset_role();

do $$
declare
  _u1 uuid;
  _u2 uuid;
  _expense_cat uuid;
  _income_cat uuid;
  _debt_update uuid;
  _debt_type_change uuid;
  _debt_record uuid;
  _debt_overpay uuid;
  _tx_id uuid;
begin
  _u1 := create_test_user('debt-rpc-u1@test.com', 'Debt RPC User 1');
  _u2 := create_test_user('debt-rpc-u2@test.com', 'Debt RPC User 2');

  _expense_cat := create_test_category(_u1, 'Debt RPC Expense', 'expense');
  _income_cat := create_test_category(_u1, 'Debt RPC Income', 'income');

  _debt_update := create_test_debt(_u1, 'Alice', 100, 'i_owe');
  update public.debts
     set category_id = _expense_cat,
         debt_date = current_date
   where id = _debt_update;

  _tx_id := create_test_transaction(_u1, _expense_cat, 40, 'expense');
  insert into public.debt_payments (debt_id, user_id, amount, note, transaction_id)
  values (_debt_update, _u1, 40, 'Initial debt update payment', _tx_id);

  _debt_type_change := create_test_debt(_u1, 'Bob', 120, 'i_owe');
  update public.debts
     set category_id = _expense_cat,
         debt_date = current_date
   where id = _debt_type_change;

  _tx_id := create_test_transaction(_u1, _expense_cat, 20, 'expense');
  insert into public.debt_payments (debt_id, user_id, amount, note, transaction_id)
  values (_debt_type_change, _u1, 20, 'Initial type change payment', _tx_id);

  _debt_record := create_test_debt(_u1, 'Carol', 120, 'i_owe');
  update public.debts
     set category_id = _expense_cat,
         debt_date = current_date
   where id = _debt_record;

  _debt_overpay := create_test_debt(_u1, 'Overpay User', 30, 'i_owe');
  update public.debts
     set category_id = _expense_cat,
         debt_date = current_date
   where id = _debt_overpay;

  perform set_config('test.debt_rpc_u1', _u1::text, true);
  perform set_config('test.debt_rpc_u2', _u2::text, true);
  perform set_config('test.debt_rpc_expense_cat', _expense_cat::text, true);
  perform set_config('test.debt_rpc_income_cat', _income_cat::text, true);
  perform set_config('test.debt_rpc_update_debt', _debt_update::text, true);
  perform set_config('test.debt_rpc_type_change_debt', _debt_type_change::text, true);
  perform set_config('test.debt_rpc_record_debt', _debt_record::text, true);
  perform set_config('test.debt_rpc_overpay_debt', _debt_overpay::text, true);
end;
$$;

select authenticate_as(current_setting('test.debt_rpc_u1')::uuid);

select lives_ok(
  format(
    'select public.update_debt_atomic(%L, %L, %L, null, current_date, 150, %L)',
    current_setting('test.debt_rpc_update_debt')::uuid,
    'Alice Updated',
    'i_owe',
    'Updated debt via rpc'
  ),
  'update_debt_atomic updates debt while preserving already paid amount'
);

select reset_role();
select is(
  (select remaining_amount from public.debts where id = current_setting('test.debt_rpc_update_debt')::uuid),
  110::numeric,
  'update_debt_atomic recalculates remaining_amount from locked debt state'
);
select is(
  (select category_id from public.debts where id = current_setting('test.debt_rpc_update_debt')::uuid),
  current_setting('test.debt_rpc_expense_cat')::uuid,
  'update_debt_atomic preserves existing category when p_category_id is null'
);
select is(
  (select counterparty from public.debts where id = current_setting('test.debt_rpc_update_debt')::uuid),
  'Alice Updated',
  'update_debt_atomic updates debt fields atomically'
);

select authenticate_as(current_setting('test.debt_rpc_u1')::uuid);

select throws_matching(
  format(
    'select public.update_debt_atomic(%L, %L, %L, %L, current_date, 120, %L)',
    current_setting('test.debt_rpc_type_change_debt')::uuid,
    'Bob',
    'they_owe',
    current_setting('test.debt_rpc_income_cat')::uuid,
    'Attempt type change with payments'
  ),
  'Cannot change debt direction after payments have been logged',
  'update_debt_atomic rejects type changes once payments exist'
);

do $$
declare
  _result jsonb;
begin
  select public.record_debt_payment_atomic(
    current_setting('test.debt_rpc_record_debt')::uuid,
    25,
    'Lunch',
    current_date
  ) into _result;

  perform set_config('test.debt_rpc_payment_id', _result->>'payment_id', true);
  perform set_config('test.debt_rpc_transaction_id', _result->>'transaction_id', true);
end;
$$;

select reset_role();
select ok(
  current_setting('test.debt_rpc_payment_id', true) is not null,
  'record_debt_payment_atomic returns a payment id'
);
select is(
  (select count(*)::int from public.debt_payments where id = current_setting('test.debt_rpc_payment_id')::uuid),
  1,
  'record_debt_payment_atomic creates the debt payment row'
);
select is(
  (select count(*)::int from public.transactions where id = current_setting('test.debt_rpc_transaction_id')::uuid),
  1,
  'record_debt_payment_atomic creates the linked transaction row'
);
select is(
  (select remaining_amount from public.debts where id = current_setting('test.debt_rpc_record_debt')::uuid),
  95::numeric,
  'record_debt_payment_atomic decreases remaining_amount in the same transaction'
);

select authenticate_as(current_setting('test.debt_rpc_u1')::uuid);

select throws_matching(
  format(
    'select public.record_debt_payment_atomic(%L, 50, %L, current_date)',
    current_setting('test.debt_rpc_overpay_debt')::uuid,
    'Too much'
  ),
  'Payment exceeds remaining amount',
  'record_debt_payment_atomic rejects overpayments'
);

select reset_role();
select is(
  (select count(*)::int from public.debt_payments where debt_id = current_setting('test.debt_rpc_overpay_debt')::uuid),
  0,
  'failed overpayment leaves no debt payment rows behind'
);
select is(
  (select count(*)::int from public.transactions where description like 'Payment to Overpay User%'),
  0,
  'failed overpayment leaves no linked transaction rows behind'
);

select authenticate_as(current_setting('test.debt_rpc_u1')::uuid);

select lives_ok(
  format(
    'select public.update_debt_payment_atomic(%L, 30, %L, %L::date)',
    current_setting('test.debt_rpc_payment_id')::uuid,
    'Dinner',
    '2026-03-07'
  ),
  'update_debt_payment_atomic updates payment and transaction together'
);

select reset_role();
select is(
  (select amount from public.debt_payments where id = current_setting('test.debt_rpc_payment_id')::uuid),
  30::numeric,
  'update_debt_payment_atomic updates payment amount'
);
select is(
  (select amount from public.transactions where id = current_setting('test.debt_rpc_transaction_id')::uuid),
  30::numeric,
  'update_debt_payment_atomic updates linked transaction amount'
);
select is(
  (select description from public.transactions where id = current_setting('test.debt_rpc_transaction_id')::uuid),
  'Payment to Carol — Dinner',
  'update_debt_payment_atomic updates linked transaction description'
);
select is(
  (select date from public.transactions where id = current_setting('test.debt_rpc_transaction_id')::uuid),
  '2026-03-07'::date,
  'update_debt_payment_atomic updates linked transaction date'
);
select is(
  (select remaining_amount from public.debts where id = current_setting('test.debt_rpc_record_debt')::uuid),
  90::numeric,
  'update_debt_payment_atomic keeps debt remaining_amount in sync'
);

select authenticate_as(current_setting('test.debt_rpc_u1')::uuid);

select lives_ok(
  format(
    'select public.delete_debt_payment_atomic(%L)',
    current_setting('test.debt_rpc_payment_id')::uuid
  ),
  'delete_debt_payment_atomic deletes the payment under the same debt lock order'
);

select reset_role();
select is(
  (select count(*)::int from public.debt_payments where id = current_setting('test.debt_rpc_payment_id')::uuid),
  0,
  'delete_debt_payment_atomic removes the payment row'
);
select is(
  (select count(*)::int from public.transactions where id = current_setting('test.debt_rpc_transaction_id')::uuid),
  0,
  'delete_debt_payment_atomic lets the cleanup trigger remove the linked transaction'
);
select is(
  (select remaining_amount from public.debts where id = current_setting('test.debt_rpc_record_debt')::uuid),
  120::numeric,
  'delete_debt_payment_atomic restores remaining_amount via the existing trigger'
);

select authenticate_as(current_setting('test.debt_rpc_u2')::uuid);

select throws_matching(
  format(
    'select public.update_debt_atomic(%L, %L, %L, null, current_date, 200, %L)',
    current_setting('test.debt_rpc_update_debt')::uuid,
    'Cross User Attempt',
    'i_owe',
    'Should fail'
  ),
  'Debt not found',
  'cross-user calls cannot update another user''s debt through update_debt_atomic'
);

select * from finish();
rollback;
