-- ===========================================================================
-- RLS Policy Tests
-- ===========================================================================
-- Tests Row Level Security across all 12 tables. Verifies:
--   1. Owners can access their own data
--   2. Other authenticated users CANNOT access another user's data
--   3. Anonymous users are denied entirely
--   4. Missing policies are enforced (no INSERT on profiles, no DELETE on
--      daily_usage, SELECT-only on subscriptions, admin-gated banner_presets)
--
-- NOTE: When no RLS policy exists for an operation (e.g., DELETE), Postgres
-- silently affects 0 rows rather than throwing. We verify this by executing
-- the operation and then checking (as superuser) that the row still exists.
-- ===========================================================================

begin;
select plan(61);

-- ===========================
-- Setup: create two test users
-- ===========================
select reset_role();

do $$
declare
  _u1 uuid;
  _u2 uuid;
begin
  _u1 := create_test_user('alice@test.com', 'Alice');
  _u2 := create_test_user('bob@test.com',   'Bob');
  perform set_config('test.user1_id', _u1::text, true);
  perform set_config('test.user2_id', _u2::text, true);

  -- Create an admin user for banner_presets tests
  perform set_config(
    'test.admin_id',
    create_test_user('admin@test.com', 'Admin', 'admin')::text,
    true
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: short aliases for our test user IDs
-- ---------------------------------------------------------------------------
create or replace function u1() returns uuid language sql stable as $$
  select current_setting('test.user1_id')::uuid;
$$;
create or replace function u2() returns uuid language sql stable as $$
  select current_setting('test.user2_id')::uuid;
$$;
create or replace function admin_uid() returns uuid language sql stable as $$
  select current_setting('test.admin_id')::uuid;
$$;

-- ===========================
-- Seed test data (as postgres superuser — bypasses RLS)
-- ===========================

-- Categories
insert into public.categories (id, user_id, name, type)
values
  (extensions.gen_random_uuid(), u1(), 'Food',   'expense'),
  (extensions.gen_random_uuid(), u2(), 'Salary', 'income');

-- Grab category IDs for further use
do $$
begin
  perform set_config(
    'test.cat1_id',
    (select id::text from public.categories where user_id = u1() limit 1),
    true
  );
  perform set_config(
    'test.cat2_id',
    (select id::text from public.categories where user_id = u2() limit 1),
    true
  );
end;
$$;

create or replace function cat1() returns uuid language sql stable as $$
  select current_setting('test.cat1_id')::uuid;
$$;
create or replace function cat2() returns uuid language sql stable as $$
  select current_setting('test.cat2_id')::uuid;
$$;

-- Transactions
insert into public.transactions (user_id, category_id, amount, type)
values (u1(), cat1(), 25, 'expense');
insert into public.transactions (user_id, category_id, amount, type)
values (u2(), cat2(), 3000, 'income');

-- Reminders
insert into public.reminders (user_id, title, amount, due_date, frequency)
values (u1(), 'Rent',     800, current_date + 30, 'monthly');
insert into public.reminders (user_id, title, amount, due_date, frequency)
values (u2(), 'Gym',      40,  current_date + 7,  'monthly');

-- Debts
insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type)
values (u1(), 'Alice debt peer', 500, 500, 'i_owe');
insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type)
values (u2(), 'Bob debt peer',   200, 200, 'they_owe');

do $$
begin
  perform set_config(
    'test.debt1_id',
    (select id::text from public.debts where user_id = u1() limit 1),
    true
  );
  perform set_config(
    'test.debt2_id',
    (select id::text from public.debts where user_id = u2() limit 1),
    true
  );
end;
$$;

create or replace function debt1() returns uuid language sql stable as $$
  select current_setting('test.debt1_id')::uuid;
$$;
create or replace function debt2() returns uuid language sql stable as $$
  select current_setting('test.debt2_id')::uuid;
$$;

-- Debt payments
insert into public.debt_payments (user_id, debt_id, amount)
values (u1(), debt1(), 100);
insert into public.debt_payments (user_id, debt_id, amount)
values (u2(), debt2(), 50);

-- AI memories
insert into public.ai_memories (user_id, rule, source) values (u1(), 'likes coffee', 'auto');
insert into public.ai_memories (user_id, rule, source) values (u2(), 'budget-conscious', 'manual');

-- Attachments (need parent records — use existing transactions)
do $$
declare
  _t1 uuid;
  _t2 uuid;
begin
  select id into _t1 from public.transactions where user_id = u1() limit 1;
  select id into _t2 from public.transactions where user_id = u2() limit 1;

  insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
  values (u1(), 'transaction', _t1, '/files/a.pdf', 'a.pdf', 1024, 'application/pdf');
  insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
  values (u2(), 'transaction', _t2, '/files/b.pdf', 'b.pdf', 2048, 'application/pdf');
end;
$$;

-- Telegram sessions
insert into public.telegram_sessions (chat_id, user_id) values (1001, u1());
insert into public.telegram_sessions (chat_id, user_id) values (1002, u2());

-- Notifications
insert into public.notifications (user_id, type, title, message)
values (u1(), 'budget_80', 'Budget warning', 'You used 80%');
insert into public.notifications (user_id, type, title, message)
values (u2(), 'reminder_due', 'Gym due', 'Tomorrow');

-- Daily usage
insert into public.daily_usage (user_id, credits_used) values (u1(), 5);
insert into public.daily_usage (user_id, credits_used) values (u2(), 3);

-- Subscriptions (managed by service role)
insert into public.subscriptions (user_id, stripe_subscription_id, status, current_period_end)
values (u1(), 'sub_alice_123', 'active', now() + interval '30 days');
insert into public.subscriptions (user_id, stripe_subscription_id, status, current_period_end)
values (u2(), 'sub_bob_456', 'active', now() + interval '30 days');

-- ===========================================================================
-- 1. PROFILES
-- ===========================================================================

-- Owner can read own profile
select authenticate_as(u1());
select is(
  (select count(*)::int from public.profiles where id = u1()),
  1,
  'profiles: owner can read own profile'
);

-- Owner CANNOT read other user's profile
select is(
  (select count(*)::int from public.profiles where id = u2()),
  0,
  'profiles: user cannot read another user''s profile'
);

-- Owner can update own profile
select lives_ok(
  format('update public.profiles set display_name = ''Alice Updated'' where id = %L', u1()),
  'profiles: owner can update own profile'
);

-- Owner CANNOT insert a new profile (no INSERT policy)
select throws_ok(
  format(
    'insert into public.profiles (id, display_name) values (%L, ''Hacker'')',
    extensions.gen_random_uuid()
  ),
  'new row violates row-level security policy for table "profiles"',
  'profiles: authenticated user cannot INSERT profiles'
);

-- Owner CANNOT delete own profile (no DELETE policy — silently 0 rows)
delete from public.profiles where id = u1();
select reset_role();
select is(
  (select count(*)::int from public.profiles where id = u1()),
  1,
  'profiles: DELETE silently blocked — no DELETE policy'
);

-- Anon cannot read profiles
select authenticate_as_anon();
select is(
  (select count(*)::int from public.profiles),
  0,
  'profiles: anon cannot read any profiles'
);

select reset_role();

-- ===========================================================================
-- 2. CATEGORIES — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.categories where user_id = u1()),
  1,
  'categories: owner can read own categories'
);
select is(
  (select count(*)::int from public.categories where user_id = u2()),
  0,
  'categories: user cannot read another user''s categories'
);

-- Can insert own
select lives_ok(
  format(
    'insert into public.categories (user_id, name, type) values (%L, ''Transport'', ''expense'')',
    u1()
  ),
  'categories: owner can insert own category'
);

-- Cannot insert for another user
select throws_ok(
  format(
    'insert into public.categories (user_id, name, type) values (%L, ''Hack'', ''expense'')',
    u2()
  ),
  'new row violates row-level security policy for table "categories"',
  'categories: user cannot insert category for another user'
);

-- Cannot delete another user's category
select is(
  (select count(*)::int from public.categories where user_id = u2()),
  0,
  'categories: user cannot see (and thus delete) another user''s categories'
);

select reset_role();

-- ===========================================================================
-- 3. TRANSACTIONS — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.transactions where user_id = u1()),
  1,
  'transactions: owner can read own transactions'
);
select is(
  (select count(*)::int from public.transactions where user_id = u2()),
  0,
  'transactions: user cannot read another user''s transactions'
);
select throws_ok(
  format(
    'insert into public.transactions (user_id, category_id, amount, type) values (%L, %L, 10, ''income'')',
    u2(), cat2()
  ),
  'new row violates row-level security policy for table "transactions"',
  'transactions: user cannot insert for another user'
);

select reset_role();

-- ===========================================================================
-- 4. REMINDERS — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.reminders where user_id = u1()),
  1,
  'reminders: owner can read own reminders'
);
select is(
  (select count(*)::int from public.reminders where user_id = u2()),
  0,
  'reminders: user cannot read another user''s reminders'
);
select throws_ok(
  format(
    'insert into public.reminders (user_id, title, amount, due_date, frequency) values (%L, ''Hack'', 10, current_date, ''monthly'')',
    u2()
  ),
  'new row violates row-level security policy for table "reminders"',
  'reminders: user cannot insert for another user'
);

select reset_role();

-- ===========================================================================
-- 5. DEBTS — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.debts where user_id = u1()),
  1,
  'debts: owner can read own debts'
);
select is(
  (select count(*)::int from public.debts where user_id = u2()),
  0,
  'debts: user cannot read another user''s debts'
);
select throws_ok(
  format(
    'insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type) values (%L, ''Hack'', 100, 100, ''i_owe'')',
    u2()
  ),
  'new row violates row-level security policy for table "debts"',
  'debts: user cannot insert for another user'
);

select reset_role();

-- ===========================================================================
-- 6. DEBT PAYMENTS — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.debt_payments where user_id = u1()),
  1,
  'debt_payments: owner can read own payments'
);
select is(
  (select count(*)::int from public.debt_payments where user_id = u2()),
  0,
  'debt_payments: user cannot read another user''s payments'
);
select throws_ok(
  format(
    'insert into public.debt_payments (user_id, debt_id, amount) values (%L, %L, 10)',
    u2(), debt2()
  ),
  'new row violates row-level security policy for table "debt_payments"',
  'debt_payments: user cannot insert for another user'
);

select reset_role();

-- ===========================================================================
-- 7. BANNER PRESETS — admin-gated writes, all authenticated can read
-- ===========================================================================

-- Regular user can read all banner presets
select authenticate_as(u1());
select ok(
  (select count(*) from public.banner_presets) > 0,
  'banner_presets: authenticated user can read presets'
);

-- Regular user CANNOT insert
select throws_ok(
  'insert into public.banner_presets (type, value, label) values (''color'', ''#ff0000'', ''Hack Red'')',
  'new row violates row-level security policy for table "banner_presets"',
  'banner_presets: non-admin cannot insert'
);

-- Regular user CANNOT delete (silently affects 0 rows due to is_admin() = false in USING)
delete from public.banner_presets where label = 'Warm Cream';
select reset_role();
select ok(
  (select count(*) from public.banner_presets where label = 'Warm Cream') > 0,
  'banner_presets: non-admin DELETE silently blocked'
);

-- Admin CAN insert
select authenticate_as(admin_uid());
select lives_ok(
  'insert into public.banner_presets (type, value, label) values (''color'', ''#00ff00'', ''Admin Green'')',
  'banner_presets: admin can insert'
);

-- Admin CAN delete
select lives_ok(
  'delete from public.banner_presets where label = ''Admin Green''',
  'banner_presets: admin can delete'
);

-- Anon CANNOT read banner presets
select authenticate_as_anon();
select is(
  (select count(*)::int from public.banner_presets),
  0,
  'banner_presets: anon cannot read presets'
);

select reset_role();

-- ===========================================================================
-- 8. SUBSCRIPTIONS — SELECT only
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.subscriptions where user_id = u1()),
  1,
  'subscriptions: owner can read own subscription'
);
select is(
  (select count(*)::int from public.subscriptions where user_id = u2()),
  0,
  'subscriptions: user cannot read another user''s subscription'
);

-- Cannot insert
select throws_ok(
  format(
    'insert into public.subscriptions (user_id, stripe_subscription_id, status, current_period_end) values (%L, ''sub_hack'', ''active'', now())',
    u1()
  ),
  'new row violates row-level security policy for table "subscriptions"',
  'subscriptions: user cannot insert subscription'
);

-- Cannot delete (silently 0 rows — no DELETE policy)
delete from public.subscriptions where user_id = u1();
select reset_role();
select is(
  (select count(*)::int from public.subscriptions where user_id = u1()),
  1,
  'subscriptions: DELETE silently blocked — no DELETE policy'
);

-- ===========================================================================
-- 9. DAILY USAGE — no DELETE policy
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.daily_usage where user_id = u1()),
  1,
  'daily_usage: owner can read own usage'
);
select is(
  (select count(*)::int from public.daily_usage where user_id = u2()),
  0,
  'daily_usage: user cannot read another user''s usage'
);

-- Can update own (increase credits)
select lives_ok(
  format(
    'update public.daily_usage set credits_used = 6 where user_id = %L',
    u1()
  ),
  'daily_usage: owner can update own usage'
);

-- Cannot insert for another user
select throws_ok(
  format(
    'insert into public.daily_usage (user_id, credits_used, date) values (%L, 0, current_date + 1)',
    u2()
  ),
  'new row violates row-level security policy for table "daily_usage"',
  'daily_usage: user cannot insert for another user'
);

-- CANNOT delete (no DELETE policy — silently 0 rows)
delete from public.daily_usage where user_id = u1();
select reset_role();
select is(
  (select count(*)::int from public.daily_usage where user_id = u1()),
  1,
  'daily_usage: DELETE silently blocked — no DELETE policy'
);

-- ===========================================================================
-- 10. AI MEMORIES — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.ai_memories where user_id = u1()),
  1,
  'ai_memories: owner can read own memories'
);
select is(
  (select count(*)::int from public.ai_memories where user_id = u2()),
  0,
  'ai_memories: user cannot read another user''s memories'
);
select throws_ok(
  format(
    'insert into public.ai_memories (user_id, rule, source) values (%L, ''hack'', ''auto'')',
    u2()
  ),
  'new row violates row-level security policy for table "ai_memories"',
  'ai_memories: user cannot insert for another user'
);

select reset_role();

-- ===========================================================================
-- 11. ATTACHMENTS — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.attachments where user_id = u1()),
  1,
  'attachments: owner can read own attachments'
);
select is(
  (select count(*)::int from public.attachments where user_id = u2()),
  0,
  'attachments: user cannot read another user''s attachments'
);

select reset_role();

-- ===========================================================================
-- 12. TELEGRAM SESSIONS — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.telegram_sessions where user_id = u1()),
  1,
  'telegram_sessions: owner can read own sessions'
);
select is(
  (select count(*)::int from public.telegram_sessions where user_id = u2()),
  0,
  'telegram_sessions: user cannot read another user''s sessions'
);
select throws_ok(
  format(
    'insert into public.telegram_sessions (chat_id, user_id) values (9999, %L)',
    u2()
  ),
  'new row violates row-level security policy for table "telegram_sessions"',
  'telegram_sessions: user cannot insert for another user'
);

select reset_role();

-- ===========================================================================
-- 13. NOTIFICATIONS — standard CRUD isolation
-- ===========================================================================

select authenticate_as(u1());
select is(
  (select count(*)::int from public.notifications where user_id = u1()),
  1,
  'notifications: owner can read own notifications'
);
select is(
  (select count(*)::int from public.notifications where user_id = u2()),
  0,
  'notifications: user cannot read another user''s notifications'
);
select throws_ok(
  format(
    'insert into public.notifications (user_id, type, title, message) values (%L, ''budget_80'', ''Hack'', ''msg'')',
    u2()
  ),
  'new row violates row-level security policy for table "notifications"',
  'notifications: user cannot insert for another user'
);

-- Owner CAN update own notification (toggle is_read)
select lives_ok(
  format(
    'update public.notifications set is_read = true where user_id = %L',
    u1()
  ),
  'notifications: owner can update own notification'
);

select reset_role();

-- ===========================================================================
-- 14. ANON ACCESS — verify anon is locked out of all user-scoped tables
-- ===========================================================================

select authenticate_as_anon();

select is(
  (select count(*)::int from public.categories),
  0,
  'anon: cannot read categories'
);
select is(
  (select count(*)::int from public.transactions),
  0,
  'anon: cannot read transactions'
);
select is(
  (select count(*)::int from public.reminders),
  0,
  'anon: cannot read reminders'
);
select is(
  (select count(*)::int from public.debts),
  0,
  'anon: cannot read debts'
);
select is(
  (select count(*)::int from public.debt_payments),
  0,
  'anon: cannot read debt_payments'
);
select is(
  (select count(*)::int from public.subscriptions),
  0,
  'anon: cannot read subscriptions'
);
select is(
  (select count(*)::int from public.daily_usage),
  0,
  'anon: cannot read daily_usage'
);
select is(
  (select count(*)::int from public.ai_memories),
  0,
  'anon: cannot read ai_memories'
);
select is(
  (select count(*)::int from public.attachments),
  0,
  'anon: cannot read attachments'
);
select is(
  (select count(*)::int from public.telegram_sessions),
  0,
  'anon: cannot read telegram_sessions'
);
select is(
  (select count(*)::int from public.notifications),
  0,
  'anon: cannot read notifications'
);

select reset_role();

-- ===========================================================================
select * from finish();
rollback;
