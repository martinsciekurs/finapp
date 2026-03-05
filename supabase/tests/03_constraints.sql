-- ===========================================================================
-- FK & Constraint Tests
-- ===========================================================================
-- Tests foreign keys, CHECK constraints, and UNIQUE constraints:
--   - Composite FK enforcement (type mismatch, cross-user)
--   - ON DELETE behavior (RESTRICT, CASCADE, SET NULL)
--   - CHECK constraints (amount > 0, enum values, etc.)
--   - UNIQUE constraints (duplicate prevention)
--
-- NOTE: throws_ok with a CHAR(5) error code needs explicit cast to
-- disambiguate from the (sql, errmsg, description) overload.
-- ===========================================================================

begin;
select plan(37);

select reset_role();

-- ===========================
-- Setup
-- ===========================
do $$
declare
  _u1 uuid;
  _u2 uuid;
begin
  _u1 := create_test_user('fk-alice@test.com', 'FK Alice');
  _u2 := create_test_user('fk-bob@test.com',   'FK Bob');
  perform set_config('test.u1', _u1::text, true);
  perform set_config('test.u2', _u2::text, true);
end;
$$;

create or replace function u1() returns uuid language sql stable as $$
  select current_setting('test.u1')::uuid;
$$;
create or replace function u2() returns uuid language sql stable as $$
  select current_setting('test.u2')::uuid;
$$;

-- Categories for both users
do $$
declare
  _c1_exp uuid;
  _c1_inc uuid;
  _c2_exp uuid;
begin
  _c1_exp := create_test_category(u1(), 'Groceries', 'expense');
  _c1_inc := create_test_category(u1(), 'Salary',    'income');
  _c2_exp := create_test_category(u2(), 'Dining',    'expense');
  perform set_config('test.c1_exp', _c1_exp::text, true);
  perform set_config('test.c1_inc', _c1_inc::text, true);
  perform set_config('test.c2_exp', _c2_exp::text, true);
end;
$$;

create or replace function c1_exp() returns uuid language sql stable as $$
  select current_setting('test.c1_exp')::uuid;
$$;
create or replace function c1_inc() returns uuid language sql stable as $$
  select current_setting('test.c1_inc')::uuid;
$$;
create or replace function c2_exp() returns uuid language sql stable as $$
  select current_setting('test.c2_exp')::uuid;
$$;

-- ===========================================================================
-- 1. COMPOSITE FK: transactions -> categories (category_id, user_id, type)
-- ===========================================================================

-- Valid: matching user and type
select lives_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, 50, ''expense'')',
    u1(), c1_exp()
  ),
  'fk_transactions_category: valid insert (matching user + type)'
);

-- Invalid: type mismatch (expense category, income transaction)
select throws_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, 50, ''income'')',
    u1(), c1_exp()
  ),
  '23503'::char(5),
  null,
  'fk_transactions_category: rejects type mismatch'
);

-- Invalid: cross-user (user1 using user2's category)
select throws_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, 50, ''expense'')',
    u1(), c2_exp()
  ),
  '23503'::char(5),
  null,
  'fk_transactions_category: rejects cross-user category'
);

-- ON DELETE RESTRICT: cannot delete category with transactions
select throws_ok(
  format('delete from public.categories where id = %L', c1_exp()),
  '23503'::char(5),
  null,
  'fk_transactions_category: RESTRICT prevents deleting category with transactions'
);

-- ===========================================================================
-- 2. COMPOSITE FK: reminders -> categories (category_id, user_id)
-- ===========================================================================

-- Valid: matching user
select lives_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
     values (%L, ''Test Reminder'', 100, current_date + 30, ''monthly'', %L)',
    u1(), c1_exp()
  ),
  'fk_reminders_category: valid insert with matching user category'
);

-- Invalid: cross-user category
select throws_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency, category_id) values (%L, ''Hack'', 100, current_date, ''monthly'', %L)',
    u1(), c2_exp()
  ),
  '23503'::char(5),
  null,
  'fk_reminders_category: rejects cross-user category'
);

-- ON DELETE RESTRICT: deleting category referenced by a reminder is blocked
do $$
declare
  _cat uuid;
begin
  _cat := create_test_category(u1(), 'Restricted', 'expense');
  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
  values (u1(), 'Blocks Delete', 100, current_date + 30, 'monthly', _cat);
  perform set_config('test.restrict_cat', _cat::text, true);
end;
$$;

select throws_ok(
  format(
    'delete from public.categories where id = %L',
    current_setting('test.restrict_cat')::uuid
  ),
  '23503'::char(5),
  null,
  'fk_reminders_category: ON DELETE RESTRICT blocks category deletion'
);

-- ===========================================================================
-- 3. COMPOSITE FK: debt_payments -> debts (debt_id, user_id)
-- ===========================================================================

do $$
declare
  _d1 uuid;
begin
  _d1 := create_test_debt(u1(), 'FK Peer', 500, 'i_owe');
  perform set_config('test.fk_debt', _d1::text, true);
end;
$$;

-- Valid insert
select lives_ok(
  format(
    'insert into public.debt_payments (user_id, debt_id, amount) values (%L, %L, 100)',
    u1(), current_setting('test.fk_debt')::uuid
  ),
  'fk_debt_payments_debt: valid insert'
);

-- Cross-user debt
do $$
declare
  _d2 uuid;
begin
  _d2 := create_test_debt(u2(), 'Bob Peer', 300, 'they_owe');
  perform set_config('test.fk_debt_u2', _d2::text, true);
end;
$$;

select throws_ok(
  format(
    'insert into public.debt_payments (user_id, debt_id, amount) values (%L, %L, 50)',
    u1(), current_setting('test.fk_debt_u2')::uuid
  ),
  '23503'::char(5),
  null,
  'fk_debt_payments_debt: rejects cross-user debt'
);

-- ON DELETE CASCADE: deleting debt cascades to payments
do $$
declare
  _d uuid;
  _p uuid;
begin
  _d := create_test_debt(u1(), 'Cascade Peer', 200, 'i_owe');
  insert into public.debt_payments (user_id, debt_id, amount)
  values (u1(), _d, 50)
  returning id into _p;
  perform set_config('test.cascade_debt', _d::text, true);
  perform set_config('test.cascade_payment', _p::text, true);
end;
$$;

delete from public.debts where id = current_setting('test.cascade_debt')::uuid;

select is(
  (select count(*)::int from public.debt_payments where id = current_setting('test.cascade_payment')::uuid),
  0,
  'fk_debt_payments_debt: ON DELETE CASCADE removes payments'
);

-- ===========================================================================
-- 4. COMPOSITE FK: debt_payments -> transactions
-- ===========================================================================

-- ON DELETE SET NULL: deleting transaction nullifies debt_payment.transaction_id
do $$
declare
  _d   uuid;
  _cat uuid;
  _tid uuid;
  _pid uuid;
begin
  _d   := create_test_debt(u1(), 'TxnNull Peer', 500, 'i_owe');
  _cat := create_test_category(u1(), 'TxnNull Cat', 'expense');
  _tid := create_test_transaction(u1(), _cat, 100, 'expense');
  insert into public.debt_payments (user_id, debt_id, amount, transaction_id)
  values (u1(), _d, 100, _tid)
  returning id into _pid;
  perform set_config('test.txnnull_txn', _tid::text, true);
  perform set_config('test.txnnull_pay', _pid::text, true);
end;
$$;

delete from public.transactions where id = current_setting('test.txnnull_txn')::uuid;

select is(
  (select transaction_id from public.debt_payments where id = current_setting('test.txnnull_pay')::uuid),
  null,
  'fk_debt_payments_transaction: ON DELETE SET NULL nullifies transaction_id'
);

-- ===========================================================================
-- 5. CHECK CONSTRAINTS: amount > 0
-- ===========================================================================

-- Transactions: amount = 0
select throws_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, 0, ''expense'')',
    u1(), c1_exp()
  ),
  '23514'::char(5),
  null,
  'check: transactions.amount rejects 0'
);

-- Transactions: negative amount
select throws_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, -10, ''expense'')',
    u1(), c1_exp()
  ),
  '23514'::char(5),
  null,
  'check: transactions.amount rejects negative'
);

-- Debt payments: amount = 0
do $$
declare
  _d uuid;
begin
  _d := create_test_debt(u1(), 'Check Peer', 100, 'i_owe');
  perform set_config('test.check_debt', _d::text, true);
end;
$$;

select throws_ok(
  format(
    'insert into public.debt_payments (user_id, debt_id, amount) values (%L, %L, 0)',
    u1(), current_setting('test.check_debt')::uuid
  ),
  '23514'::char(5),
  null,
  'check: debt_payments.amount rejects 0'
);

-- Reminders: negative amount
select throws_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency, category_id) values (%L, ''Bad'', -5, current_date, ''monthly'', %L)',
    u1(), c1_exp()
  ),
  '23514'::char(5),
  null,
  'check: reminders.amount rejects negative'
);

-- ===========================================================================
-- 6. CHECK CONSTRAINTS: debts remaining_amount bounds
-- ===========================================================================

-- remaining_amount > original_amount
select throws_ok(
  format(
    'insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type) values (%L, ''Bad'', 100, 200, ''i_owe'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: debts.remaining_amount rejects value > original_amount'
);

-- remaining_amount < 0
select throws_ok(
  format(
    'insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type) values (%L, ''Bad'', 100, -1, ''i_owe'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: debts.remaining_amount rejects negative value'
);

-- ===========================================================================
-- 7. CHECK CONSTRAINTS: counterparty non-empty
-- ===========================================================================

-- Empty string
select throws_ok(
  format(
    'insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type) values (%L, '''', 100, 100, ''i_owe'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: debts.counterparty rejects empty string'
);

-- Whitespace only
select throws_ok(
  format(
    'insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type) values (%L, ''   '', 100, 100, ''i_owe'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: debts.counterparty rejects whitespace-only string'
);

-- ===========================================================================
-- 8. CHECK CONSTRAINTS: enum values
-- ===========================================================================

-- Invalid transaction type
select throws_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, 50, ''transfer'')',
    u1(), c1_exp()
  ),
  '23514'::char(5),
  null,
  'check: transactions.type rejects invalid enum value'
);

-- Invalid transaction source
select throws_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type, source) values (%L, %L, 50, ''expense'', ''api'')',
    u1(), c1_exp()
  ),
  '23514'::char(5),
  null,
  'check: transactions.source rejects invalid enum value'
);

-- Invalid profile role
select throws_ok(
  format(
    'update public.profiles set role = ''superadmin'' where id = %L',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: profiles.role rejects invalid enum value'
);

-- Invalid notification type
select throws_ok(
  format(
    'insert into public.notifications (user_id, type, title, message) values (%L, ''spam'', ''Bad'', ''msg'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: notifications.type rejects invalid enum value'
);

-- Invalid attachment record_type
do $$
declare
  _tid uuid;
begin
  select id into _tid from public.transactions where user_id = u1() limit 1;
  perform set_config('test.enum_txn', _tid::text, true);
end;
$$;

select throws_ok(
  format(
    'insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type) values (%L, ''invoice'', %L, ''/f/x.pdf'', ''x.pdf'', 100, ''application/pdf'')',
    u1(), current_setting('test.enum_txn')::uuid
  ),
  '23514'::char(5),
  null,
  'check: attachments.record_type rejects invalid enum value'
);

-- ===========================================================================
-- 9. CHECK CONSTRAINTS: other boundary values
-- ===========================================================================

-- categories.group_id rejects null (trigger fires before NOT NULL check)
select throws_ok(
  format(
    'insert into public.categories (user_id, name, type, group_id) values (%L, ''No Group'', ''expense'', null)',
    u1()
  ),
  'P0001'::char(5),
  null,
  'check: categories.group_id rejects null'
);

-- daily_usage.credits_used rejects negative
select throws_ok(
  format(
    'insert into public.daily_usage (user_id, credits_used, date) values (%L, -1, ''2099-01-01'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: daily_usage.credits_used rejects negative'
);

-- attachments.file_size rejects negative
select throws_ok(
  format(
    'insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type) values (%L, ''transaction'', %L, ''/f/x.pdf'', ''x.pdf'', -1, ''application/pdf'')',
    u1(), current_setting('test.enum_txn')::uuid
  ),
  '23514'::char(5),
  null,
  'check: attachments.file_size rejects negative'
);

-- ===========================================================================
-- 10. UNIQUE CONSTRAINTS
-- ===========================================================================

-- Duplicate category name per user+type
select throws_ok(
  format(
    'insert into public.categories (user_id, group_id, name, type) values (%L, (select id from public.category_groups where user_id = %L and type = ''expense'' limit 1), ''Groceries'', ''expense'')',
    u1(), u1()
  ),
  '23505'::char(5),
  null,
  'unique: categories rejects duplicate (user_id, type, name)'
);

-- Same name, different type = OK (needs an income group)
do $$
declare _g uuid;
begin
  -- Ensure an income group exists for u1
  select id into _g from public.category_groups where user_id = u1() and type = 'income' limit 1;
  if _g is null then
    _g := create_test_category_group(u1(), 'Default income', 'income');
  end if;
  perform set_config('test.u1_income_group', _g::text, true);
end;
$$;

select lives_ok(
  format(
    'insert into public.categories (user_id, group_id, name, type) values (%L, %L, ''Groceries'', ''income'')',
    u1(), current_setting('test.u1_income_group')::uuid
  ),
  'unique: categories allows same name with different type'
);

-- Duplicate stripe subscription ID
-- Insert first subscription
insert into public.subscriptions (user_id, stripe_subscription_id, status, current_period_end)
values (u1(), 'sub_duplicate', 'active', now() + interval '30 days');

select throws_ok(
  format(
    'insert into public.subscriptions (user_id, stripe_subscription_id, status, current_period_end) values (%L, ''sub_duplicate'', ''active'', now())',
    u2()
  ),
  '23505'::char(5),
  null,
  'unique: subscriptions rejects duplicate stripe_subscription_id'
);

-- ===========================================================================
-- 11. CHECK: debts.original_amount > 0
-- ===========================================================================

-- Zero original_amount
select throws_ok(
  format(
    'insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type) values (%L, ''Bad'', 0, 0, ''i_owe'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: debts.original_amount rejects 0'
);

-- Negative original_amount (remaining_amount is valid so only original_amount fires)
select throws_ok(
  format(
    'insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type) values (%L, ''Bad'', -100, 0, ''i_owe'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'check: debts.original_amount rejects negative'
);

-- ===========================================================================
-- 12. CHECK: banner_presets.type enum
-- ===========================================================================

select throws_ok(
  'insert into public.banner_presets (type, value, label) values (''video'', ''http://example.com/v.mp4'', ''Bad Type'')',
  '23514'::char(5),
  null,
  'check: banner_presets.type rejects invalid value'
);

-- Valid types should work
select lives_ok(
  'insert into public.banner_presets (type, value, label) values (''image'', ''http://example.com/bg.jpg'', ''Test Image'')',
  'check: banner_presets.type accepts image'
);

-- ===========================================================================
-- 13. CHECK: reminders.frequency enum
-- ===========================================================================

select throws_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency, category_id) values (%L, ''Bad Freq'', 50, current_date, ''biweekly'', %L)',
    u1(), c1_exp()
  ),
  '23514'::char(5),
  null,
  'check: reminders.frequency rejects invalid enum value'
);

-- ===========================================================================
-- 14. UNIQUE: daily_usage (user_id, date)
-- ===========================================================================

insert into public.daily_usage (user_id, credits_used, date)
values (u1(), 0, '2099-06-01');

select throws_ok(
  format(
    'insert into public.daily_usage (user_id, credits_used, date) values (%L, 0, ''2099-06-01'')',
    u1()
  ),
  '23505'::char(5),
  null,
  'unique: daily_usage rejects duplicate (user_id, date)'
);

-- ===========================================================================
-- 15. UNIQUE: telegram_sessions.chat_id
-- ===========================================================================

insert into public.telegram_sessions (chat_id, user_id) values (5555, u1());

select throws_ok(
  format(
    'insert into public.telegram_sessions (chat_id, user_id) values (5555, %L)',
    u2()
  ),
  '23505'::char(5),
  null,
  'unique: telegram_sessions rejects duplicate chat_id'
);

-- ===========================================================================
select * from finish();
rollback;
