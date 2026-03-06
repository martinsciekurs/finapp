-- ===========================================================================
-- Database Security Tests
-- ===========================================================================
-- Tests for:
--   - Numeric precision enforcement (numeric(12,2) for monetary columns)
--   - Partial unique index on profiles.stripe_customer_id
--   - Index existence on reminder_payments.reminder_id
--
-- NOTE: throws_ok with a CHAR(5) error code needs explicit cast to
-- disambiguate from the (sql, errmsg, description) overload.
-- ===========================================================================

begin;
select plan(9);

select reset_role();

-- ===========================
-- Setup
-- ===========================
do $$
declare
  _u1 uuid;
  _cat_exp uuid;
begin
  _u1 := create_test_user('security-alice@test.com', 'Security Alice');
  perform set_config('test.u1', _u1::text, true);
  
  _cat_exp := create_test_category(_u1, 'Test Expense', 'expense');
  perform set_config('test.cat_exp', _cat_exp::text, true);
end;
$$;

create or replace function u1() returns uuid language sql stable as $$
  select current_setting('test.u1')::uuid;
$$;

create or replace function cat_exp() returns uuid language sql stable as $$
  select current_setting('test.cat_exp')::uuid;
$$;

-- ===========================
-- 1. Numeric Precision Tests
-- ===========================

-- Test 1: transactions.amount accepts valid numeric(12,2) values
select lives_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, 9999999999.99, ''expense'')',
    u1(), cat_exp()
  ),
  'transactions.amount: accepts valid numeric(12,2) value (9999999999.99)'
);

-- Test 2: transactions.amount rejects values exceeding numeric(12,2) precision
-- numeric(12,2) allows max 10 digits before decimal, so 12345678901.23 (11 digits) should fail
select throws_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, 12345678901.23, ''expense'')',
    u1(), cat_exp()
  ),
  '22003'::char(5),
  null,
  'transactions.amount: rejects value exceeding numeric(12,2) precision'
);

-- Test 3: debts.original_amount accepts valid numeric(12,2) values
select lives_ok(
  format(
    'insert into public.debts (user_id, counterparty, type, original_amount, remaining_amount) values (%L, ''Alice'', ''i_owe'', 5000.50, 5000.50)',
    u1()
  ),
  'debts.original_amount: accepts valid numeric(12,2) value (5000.50)'
);

-- Test 4: debts.remaining_amount accepts valid numeric(12,2) values
select lives_ok(
  format(
    'insert into public.debts (user_id, counterparty, type, original_amount, remaining_amount) values (%L, ''Bob'', ''they_owe'', 1000.00, 500.75)',
    u1()
  ),
  'debts.remaining_amount: accepts valid numeric(12,2) value (500.75)'
);

-- Test 5: debt_payments.amount accepts valid numeric(12,2) values
do $$
declare
  _debt_id uuid;
begin
  insert into public.debts (user_id, counterparty, type, original_amount, remaining_amount)
  values (u1(), 'Charlie', 'i_owe', 2000.00, 2000.00)
  returning id into _debt_id;
  
  perform set_config('test.debt_id', _debt_id::text, true);
end;
$$;

select lives_ok(
  format(
    'insert into public.debt_payments (debt_id, user_id, amount) values (%L, %L, 1500.99)',
    current_setting('test.debt_id')::uuid, u1()
  ),
  'debt_payments.amount: accepts valid numeric(12,2) value (1500.99)'
);

-- ===========================
-- 2. Partial Unique Index Tests
-- ===========================

-- Test 6: profiles.stripe_customer_id allows multiple NULLs
select lives_ok(
  format(
    'update public.profiles set stripe_customer_id = null where id = %L',
    u1()
  ),
  'profiles.stripe_customer_id: allows NULL value'
);

-- Test 7: profiles.stripe_customer_id rejects duplicate non-null values
do $$
declare
  _u2 uuid;
begin
  _u2 := create_test_user('security-bob@test.com', 'Security Bob');
  perform set_config('test.u2', _u2::text, true);
  
  -- Set u1's stripe_customer_id
  update public.profiles set stripe_customer_id = 'cus_test123' where id = u1();
end;
$$;

select throws_ok(
  format(
    'update public.profiles set stripe_customer_id = %L where id = %L',
    'cus_test123', current_setting('test.u2')::uuid
  ),
  '23505'::char(5),
  null,
  'profiles.stripe_customer_id: rejects duplicate non-null values'
);

-- ===========================
-- 3. Index Existence Tests
-- ===========================

-- Test 8: reminder_payments.reminder_id index exists
select is(
  (select count(*) from pg_indexes
   where tablename = 'reminder_payments'
     and indexname = 'idx_reminder_payments_reminder_id'),
  1::bigint,
  'reminder_payments: idx_reminder_payments_reminder_id index exists'
);

-- Test 9: profiles.stripe_customer_id partial unique index exists
select is(
  (select count(*) from pg_indexes
   where tablename = 'profiles'
     and indexname = 'idx_profiles_stripe_customer_id'),
  1::bigint,
  'profiles: idx_profiles_stripe_customer_id partial unique index exists'
);

select finish();
rollback;
