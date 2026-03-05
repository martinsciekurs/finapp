-- ===========================================================================
-- pgTAP Tests: Reminders System
-- ===========================================================================
-- Tests specific to the reminders table beyond the general RLS and
-- constraint tests in 01/03. Covers:
--   1. Default values (is_paid=false, auto_create_transaction=true)
--   2. Reminder CRUD as owner (full lifecycle)
--   3. Cross-user isolation (RLS)
--   4. Composite FK enforcement (category must belong to same user)
--   5. One-time / recurring mark-as-paid simulation
--   6. ON DELETE RESTRICT for category (can't delete category with reminders)
--   7. Constraints (amount, frequency)
--   8. reminder_payments: CRUD, isolation, constraints, cascades
-- ===========================================================================

begin;
select plan(26);

-- ---------------------------------------------------------------------------
-- Setup
-- ---------------------------------------------------------------------------

select reset_role();

\set alice_email 'alice-reminders@test.com'
\set bob_email   'bob-reminders@test.com'

select create_test_user(:'alice_email', 'Alice') as alice_id \gset
select create_test_user(:'bob_email',   'Bob')   as bob_id   \gset

-- Create a category group and category for Alice
select create_test_category_group(:'alice_id'::uuid, 'Alice Bills', 'expense') as alice_group \gset
select create_test_category(:'alice_id'::uuid, 'Alice Rent', 'expense', :'alice_group'::uuid) as alice_cat \gset

-- Create a category for Bob (for cross-user FK test)
select create_test_category_group(:'bob_id'::uuid, 'Bob Bills', 'expense') as bob_group \gset
select create_test_category(:'bob_id'::uuid, 'Bob Rent', 'expense', :'bob_group'::uuid) as bob_cat \gset

-- Store alice_id in a GUC so it's accessible inside DO blocks
select set_config('test.alice_id', :'alice_id'::text, true);
select set_config('test.alice_cat', :'alice_cat'::text, true);

-- ===========================================================================
-- 1. Default values on insert
-- ===========================================================================

select reset_role();

insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
values (:'alice_id'::uuid, 'Default Test', 100, current_date + 30, 'monthly', :'alice_cat'::uuid);

select is(
  (select is_paid from public.reminders where title = 'Default Test'),
  false,
  'defaults: is_paid defaults to false'
);

select is(
  (select auto_create_transaction from public.reminders where title = 'Default Test'),
  true,
  'defaults: auto_create_transaction defaults to true'
);

-- ===========================================================================
-- 2. Owner CRUD (authenticated as Alice)
-- ===========================================================================

select authenticate_as(:'alice_id'::uuid);

-- Create a reminder with category
insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
values (:'alice_id'::uuid, 'Alice Rent', 800, current_date + 30, 'monthly', :'alice_cat'::uuid);

select is(
  (select count(*)::int from public.reminders where user_id = :'alice_id'::uuid and title = 'Alice Rent'),
  1,
  'owner: can create reminder with category'
);

-- Read own reminders
select is(
  (select count(*)::int from public.reminders where user_id = :'alice_id'::uuid),
  2,
  'owner: can read own reminders (2 total)'
);

-- Update own reminder
update public.reminders set amount = 850 where title = 'Alice Rent' and user_id = :'alice_id'::uuid;
select is(
  (select amount::int from public.reminders where title = 'Alice Rent' and user_id = :'alice_id'::uuid),
  850,
  'owner: can update own reminder'
);

-- ===========================================================================
-- 3. Cross-user isolation
-- ===========================================================================

-- Alice cannot read Bob's reminders
select reset_role();
insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
values (:'bob_id'::uuid, 'Bob Gym', 40, current_date + 7, 'weekly', :'bob_cat'::uuid);

select authenticate_as(:'alice_id'::uuid);
select is(
  (select count(*)::int from public.reminders where user_id = :'bob_id'::uuid),
  0,
  'isolation: Alice cannot read Bob''s reminders'
);

-- Alice cannot update Bob's reminders
update public.reminders set title = 'Hacked' where user_id = :'bob_id'::uuid;
select reset_role();
select isnt(
  (select title from public.reminders where user_id = :'bob_id'::uuid limit 1),
  'Hacked',
  'isolation: Alice cannot update Bob''s reminders'
);

-- Alice cannot delete Bob's reminders
select authenticate_as(:'alice_id'::uuid);
delete from public.reminders where user_id = :'bob_id'::uuid;
select reset_role();
select is(
  (select count(*)::int from public.reminders where user_id = :'bob_id'::uuid),
  1,
  'isolation: Alice cannot delete Bob''s reminders'
);

-- ===========================================================================
-- 4. Composite FK: category must belong to same user
-- ===========================================================================

select reset_role();
select throws_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency, category_id) values (%L, ''Cross-user cat'', 100, current_date, ''monthly'', %L)',
    :'alice_id'::uuid, :'bob_cat'::uuid
  ),
  '23503'::char(5),
  null,
  'composite FK: rejects category from different user'
);

-- ===========================================================================
-- 5. One-time reminder mark-as-paid simulation
-- ===========================================================================

select reset_role();

insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
values (:'alice_id'::uuid, 'One-time Payment', 500, current_date, 'one_time', :'alice_cat'::uuid);

-- Simulate marking as paid
update public.reminders set is_paid = true where title = 'One-time Payment';

select is(
  (select is_paid from public.reminders where title = 'One-time Payment'),
  true,
  'one_time: can mark as paid (is_paid = true)'
);

-- ===========================================================================
-- 6. Recurring reminder mark-as-paid simulation
-- ===========================================================================

select reset_role();

insert into public.reminders (user_id, title, amount, due_date, frequency, category_id, auto_create_transaction)
values (:'alice_id'::uuid, 'Monthly Rent Cycle', 800, current_date - 5, 'monthly', :'alice_cat'::uuid, true);

-- Simulate the recurring lifecycle: advance date, reset is_paid, clear last_notified_at
update public.reminders
set due_date = current_date + interval '1 month',
    is_paid = false,
    last_notified_at = null
where title = 'Monthly Rent Cycle';

select is(
  (select is_paid from public.reminders where title = 'Monthly Rent Cycle'),
  false,
  'recurring: is_paid reset to false after cycle advancement'
);

select is(
  (select last_notified_at from public.reminders where title = 'Monthly Rent Cycle'),
  null::timestamptz,
  'recurring: last_notified_at reset to null after cycle advancement'
);

select ok(
  (select due_date from public.reminders where title = 'Monthly Rent Cycle') > current_date,
  'recurring: due_date advanced to future'
);

-- ===========================================================================
-- 7. ON DELETE RESTRICT for category
-- ===========================================================================

select reset_role();

do $$
declare
  _uid uuid := current_setting('test.alice_id')::uuid;
  _group_id uuid;
  _cat_id uuid;
begin
  insert into public.category_groups (id, user_id, name, type, sort_order)
  values (gen_random_uuid(), _uid, 'Restrict Group', 'expense', 99)
  returning id into _group_id;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Restrict Category', 'circle', '#000000', 'expense', _group_id, 99)
  returning id into _cat_id;

  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
  values (_uid, 'Restrict Test', 50, current_date + 30, 'monthly', _cat_id);

  perform set_config('test.restrict_cat_id', _cat_id::text, true);
end;
$$;

-- Deleting a category referenced by a reminder should fail with restrict
select throws_ok(
  format(
    'delete from public.categories where id = %L',
    current_setting('test.restrict_cat_id')::uuid
  ),
  '23503'::char(5),
  null,
  'ON DELETE RESTRICT: cannot delete category referenced by a reminder'
);

-- ===========================================================================
-- 8. Constraints: amount must be positive
-- ===========================================================================

select throws_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency, category_id) values (%L, ''Negative'', -10, current_date, ''monthly'', %L)',
    :'alice_id'::uuid, :'alice_cat'::uuid
  ),
  '23514'::char(5),
  null,
  'check: amount must be positive'
);

select throws_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency, category_id) values (%L, ''Zero'', 0, current_date, ''monthly'', %L)',
    :'alice_id'::uuid, :'alice_cat'::uuid
  ),
  '23514'::char(5),
  null,
  'check: amount must be greater than zero'
);

-- ===========================================================================
-- 9. Constraints: frequency enum
-- ===========================================================================

select throws_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency, category_id) values (%L, ''Bad Freq'', 50, current_date, ''daily'', %L)',
    :'alice_id'::uuid, :'alice_cat'::uuid
  ),
  '23514'::char(5),
  null,
  'check: frequency rejects invalid enum value'
);

-- ===========================================================================
-- 10. reminder_payments: basic CRUD as owner
-- ===========================================================================

select reset_role();

do $$
declare
  _uid uuid := current_setting('test.alice_id')::uuid;
  _cat uuid := current_setting('test.alice_cat')::uuid;
  _rid uuid;
begin
  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
  values (_uid, 'Payment Test Reminder', 100, current_date + 30, 'monthly', _cat)
  returning id into _rid;
  perform set_config('test.pay_rem_id', _rid::text, true);
end;
$$;

-- Insert a payment record
select authenticate_as(:'alice_id'::uuid);

insert into public.reminder_payments (user_id, reminder_id, due_date)
values (:'alice_id'::uuid, current_setting('test.pay_rem_id')::uuid, current_date + 30);

select is(
  (select count(*)::int from public.reminder_payments
   where reminder_id = current_setting('test.pay_rem_id')::uuid),
  1,
  'reminder_payments: owner can insert a payment record'
);

-- Owner can read own payments
select is(
  (select count(*)::int from public.reminder_payments
   where user_id = :'alice_id'::uuid),
  1,
  'reminder_payments: owner can read own payment records'
);

-- ===========================================================================
-- 11. reminder_payments: cross-user isolation
-- ===========================================================================

-- Bob cannot see Alice's payment records
select authenticate_as(:'bob_id'::uuid);

select is(
  (select count(*)::int from public.reminder_payments
   where user_id = :'alice_id'::uuid),
  0,
  'reminder_payments: Bob cannot read Alice''s payment records'
);

-- Bob cannot insert a payment for Alice's reminder (RLS INSERT policy check)
select throws_ok(
  format(
    'insert into public.reminder_payments (user_id, reminder_id, due_date) values (%L, %L, current_date + 60)',
    :'bob_id'::uuid, current_setting('test.pay_rem_id')
  ),
  '42501'::char(5),
  null,
  'reminder_payments: Bob cannot insert payment for Alice''s reminder'
);

-- ===========================================================================
-- 12. reminder_payments: unique constraint on (reminder_id, due_date)
-- ===========================================================================

select reset_role();

select throws_ok(
  format(
    'insert into public.reminder_payments (user_id, reminder_id, due_date) values (%L, %L, current_date + 30)',
    :'alice_id'::uuid, current_setting('test.pay_rem_id')
  ),
  '23505'::char(5),
  null,
  'reminder_payments: unique constraint prevents duplicate (reminder_id, due_date)'
);

-- ===========================================================================
-- 13. reminder_payments: ON DELETE CASCADE from reminders
-- ===========================================================================

select reset_role();

do $$
declare
  _uid uuid := current_setting('test.alice_id')::uuid;
  _cat uuid := current_setting('test.alice_cat')::uuid;
  _rid uuid;
begin
  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
  values (_uid, 'Cascade Test', 75, current_date + 10, 'weekly', _cat)
  returning id into _rid;

  insert into public.reminder_payments (user_id, reminder_id, due_date)
  values (_uid, _rid, current_date + 10);

  perform set_config('test.cascade_rem_id', _rid::text, true);
end;
$$;

-- Verify payment exists
select is(
  (select count(*)::int from public.reminder_payments
   where reminder_id = current_setting('test.cascade_rem_id')::uuid),
  1,
  'reminder_payments: payment exists before cascade delete'
);

-- Delete the reminder
delete from public.reminders where id = current_setting('test.cascade_rem_id')::uuid;

select is(
  (select count(*)::int from public.reminder_payments
   where reminder_id = current_setting('test.cascade_rem_id')::uuid),
  0,
  'reminder_payments: ON DELETE CASCADE removes payment when reminder deleted'
);

-- ===========================================================================
-- 14. reminder_payments: owner can delete own payment
-- ===========================================================================

select reset_role();

do $$
declare
  _uid uuid := current_setting('test.alice_id')::uuid;
  _cat uuid := current_setting('test.alice_cat')::uuid;
  _rid uuid;
  _pid uuid;
begin
  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
  values (_uid, 'Delete Payment Test', 200, current_date + 15, 'monthly', _cat)
  returning id into _rid;

  insert into public.reminder_payments (user_id, reminder_id, due_date)
  values (_uid, _rid, current_date + 15)
  returning id into _pid;

  perform set_config('test.del_pay_id', _pid::text, true);
end;
$$;

select authenticate_as(:'alice_id'::uuid);

delete from public.reminder_payments where id = current_setting('test.del_pay_id')::uuid;

select is(
  (select count(*)::int from public.reminder_payments
   where id = current_setting('test.del_pay_id')::uuid),
  0,
  'reminder_payments: owner can delete own payment record'
);

-- ===========================================================================
-- 15. reminder_payments: ON DELETE SET NULL for transaction_id
-- ===========================================================================

select reset_role();

do $$
declare
  _uid uuid := current_setting('test.alice_id')::uuid;
  _cat uuid := current_setting('test.alice_cat')::uuid;
  _rid uuid;
  _tid uuid;
  _pid uuid;
begin
  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id)
  values (_uid, 'TxLink Test', 150, current_date + 20, 'monthly', _cat)
  returning id into _rid;

  insert into public.transactions (user_id, category_id, amount, type, description, date)
  values (_uid, _cat, 150, 'expense', 'TxLink Test', current_date)
  returning id into _tid;

  insert into public.reminder_payments (user_id, reminder_id, due_date, transaction_id)
  values (_uid, _rid, current_date + 20, _tid)
  returning id into _pid;

  perform set_config('test.txlink_pay_id', _pid::text, true);
  perform set_config('test.txlink_tx_id', _tid::text, true);
end;
$$;

-- Delete the linked transaction
delete from public.transactions where id = current_setting('test.txlink_tx_id')::uuid;

select is(
  (select transaction_id from public.reminder_payments
   where id = current_setting('test.txlink_pay_id')::uuid),
  null::uuid,
  'reminder_payments: ON DELETE SET NULL nullifies transaction_id when transaction deleted'
);

-- ===========================================================================
-- Cleanup
-- ===========================================================================

select * from finish();
rollback;
