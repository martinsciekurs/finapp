-- ===========================================================================
-- Trigger & Function Tests
-- ===========================================================================
-- Tests all custom Postgres functions and triggers:
--   - set_updated_at()
--   - handle_new_user()
--   - is_admin()
--   - update_debt_remaining_on_change()
--   - daily_usage_update_guard()
--   - notifications_update_guard()
--   - attachments_parent_check()
--   - attachments_parent_cleanup()
--   - append_onboarding_step()
--
-- NOTE: now() is constant within a transaction (returns transaction start
-- time). To test updated_at changes, we manually set it to a past value
-- before triggering an update.
-- ===========================================================================

begin;
select plan(49);

select reset_role();

-- ===========================================================================
-- 1. set_updated_at()
-- ===========================================================================

-- Create a dedicated user for this test
do $$
declare
  _uid uuid;
begin
  _uid := create_test_user('updated-at@test.com', 'UpdatedAt User');
  perform set_config('test.upd_uid', _uid::text, true);
end;
$$;

-- Manually backdate updated_at, then trigger an update
update public.profiles
set updated_at = '2020-01-01 00:00:00+00'
where id = current_setting('test.upd_uid')::uuid;

update public.profiles
set display_name = 'UpdatedAt Changed'
where id = current_setting('test.upd_uid')::uuid;

select ok(
  (select updated_at > '2020-01-01 00:00:00+00'::timestamptz
   from public.profiles
   where id = current_setting('test.upd_uid')::uuid),
  'set_updated_at: updated_at changes on UPDATE'
);

-- updated_at should be set on INSERT (via DEFAULT now())
select ok(
  (select updated_at is not null
   from public.profiles
   where id = current_setting('test.upd_uid')::uuid),
  'set_updated_at: updated_at is set on INSERT'
);

-- set_updated_at on categories
do $$
declare
  _cid uuid;
begin
  _cid := create_test_category(current_setting('test.upd_uid')::uuid, 'Updated Cat', 'expense');
  perform set_config('test.upd_cat', _cid::text, true);
end;
$$;

update public.categories
set updated_at = '2020-01-01 00:00:00+00'
where id = current_setting('test.upd_cat')::uuid;

update public.categories
set name = 'Updated Cat Changed'
where id = current_setting('test.upd_cat')::uuid;

select ok(
  (select updated_at > '2020-01-01 00:00:00+00'::timestamptz
   from public.categories
   where id = current_setting('test.upd_cat')::uuid),
  'set_updated_at: works on categories'
);

-- set_updated_at on transactions
do $$
declare
  _tid uuid;
begin
  _tid := create_test_transaction(
    current_setting('test.upd_uid')::uuid,
    current_setting('test.upd_cat')::uuid,
    50, 'expense'
  );
  perform set_config('test.upd_txn', _tid::text, true);
end;
$$;

update public.transactions
set updated_at = '2020-01-01 00:00:00+00'
where id = current_setting('test.upd_txn')::uuid;

update public.transactions
set amount = 75
where id = current_setting('test.upd_txn')::uuid;

select ok(
  (select updated_at > '2020-01-01 00:00:00+00'::timestamptz
   from public.transactions
   where id = current_setting('test.upd_txn')::uuid),
  'set_updated_at: works on transactions'
);

-- set_updated_at on debts
do $$
declare
  _did uuid;
begin
  _did := create_test_debt(current_setting('test.upd_uid')::uuid, 'Updated Peer', 300, 'i_owe');
  perform set_config('test.upd_debt', _did::text, true);
end;
$$;

update public.debts
set updated_at = '2020-01-01 00:00:00+00'
where id = current_setting('test.upd_debt')::uuid;

update public.debts
set counterparty = 'Updated Peer Changed'
where id = current_setting('test.upd_debt')::uuid;

select ok(
  (select updated_at > '2020-01-01 00:00:00+00'::timestamptz
   from public.debts
   where id = current_setting('test.upd_debt')::uuid),
  'set_updated_at: works on debts'
);

-- set_updated_at on ai_memories
do $$
declare
  _mid uuid;
begin
  insert into public.ai_memories (user_id, rule, source)
  values (current_setting('test.upd_uid')::uuid, 'test rule', 'auto')
  returning id into _mid;
  perform set_config('test.upd_mem', _mid::text, true);
end;
$$;

update public.ai_memories
set updated_at = '2020-01-01 00:00:00+00'
where id = current_setting('test.upd_mem')::uuid;

update public.ai_memories
set rule = 'test rule updated'
where id = current_setting('test.upd_mem')::uuid;

select ok(
  (select updated_at > '2020-01-01 00:00:00+00'::timestamptz
   from public.ai_memories
   where id = current_setting('test.upd_mem')::uuid),
  'set_updated_at: works on ai_memories'
);

-- ===========================================================================
-- 2. handle_new_user()
-- ===========================================================================

-- Auto-creates profile with display_name from metadata
do $$
declare
  _uid uuid;
begin
  _uid := create_test_user('newuser@test.com', 'New User');
  perform set_config('test.newuser_uid', _uid::text, true);
end;
$$;

select is(
  (select display_name from public.profiles where id = current_setting('test.newuser_uid')::uuid),
  'New User',
  'handle_new_user: profile created with display_name from metadata'
);

-- Fallback to email prefix when no display_name
do $$
declare
  _uid uuid;
begin
  _uid := create_test_user('fallback@example.com');
  perform set_config('test.fallback_uid', _uid::text, true);
end;
$$;

select is(
  (select display_name from public.profiles where id = current_setting('test.fallback_uid')::uuid),
  'fallback',
  'handle_new_user: falls back to email prefix when no display_name'
);

-- Default values are set correctly
select is(
  (select currency from public.profiles where id = current_setting('test.newuser_uid')::uuid),
  'EUR',
  'handle_new_user: profile has default currency EUR'
);

-- Default role is 'user'
select is(
  (select role from public.profiles where id = current_setting('test.newuser_uid')::uuid),
  'user',
  'handle_new_user: profile has default role user'
);

-- Default onboarding_completed_steps is empty array
select is(
  (select onboarding_completed_steps from public.profiles where id = current_setting('test.newuser_uid')::uuid),
  '[]'::jsonb,
  'handle_new_user: profile has empty onboarding_completed_steps'
);

-- Empty email fallback: should use empty string (third COALESCE branch)
do $$
declare
  _uid uuid := extensions.gen_random_uuid();
begin
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    _uid, 'authenticated', 'authenticated',
    null,  -- null email
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(), '{}'::jsonb, now(), now()
  );
  perform set_config('test.nullemail_uid', _uid::text, true);
end;
$$;

select is(
  (select display_name from public.profiles where id = current_setting('test.nullemail_uid')::uuid),
  '',
  'handle_new_user: null email falls back to empty string display_name'
);

-- ===========================================================================
-- 3. is_admin()
-- ===========================================================================

-- Admin user
do $$
declare
  _admin_uid uuid;
begin
  _admin_uid := create_test_user('admin-trigger@test.com', 'Admin', 'admin');
  perform set_config('test.admin_uid', _admin_uid::text, true);
end;
$$;

select authenticate_as(current_setting('test.admin_uid')::uuid);
select is(
  public.is_admin(),
  true,
  'is_admin: returns true for admin user'
);

-- Regular user (must reset role before creating user — auth role can't write to auth.users)
select reset_role();
do $$
declare
  _uid uuid;
begin
  _uid := create_test_user('regular@test.com', 'Regular');
  perform set_config('test.regular_uid', _uid::text, true);
end;
$$;

select authenticate_as(current_setting('test.regular_uid')::uuid);
select is(
  public.is_admin(),
  false,
  'is_admin: returns false for regular user'
);

select reset_role();

-- ===========================================================================
-- 4. update_debt_remaining_on_change()
-- ===========================================================================

-- Setup: create a user, category, and debt with remaining_amount = 1000
do $$
declare
  _uid uuid;
  _did uuid;
  _cat uuid;
begin
  _uid := create_test_user('debt-trigger@test.com', 'Debt Trigger');
  _cat := create_test_category(_uid, 'Debt Cat', 'expense');
  _did := create_test_debt(_uid, 'DebtPeer', 1000, 'i_owe');
  perform set_config('test.debt_uid', _uid::text, true);
  perform set_config('test.debt_id',  _did::text, true);
  perform set_config('test.debt_cat', _cat::text, true);
end;
$$;

create or replace function debt_uid() returns uuid language sql stable as $$
  select current_setting('test.debt_uid')::uuid;
$$;
create or replace function test_debt() returns uuid language sql stable as $$
  select current_setting('test.debt_id')::uuid;
$$;

-- INSERT: subtracts amount from remaining
insert into public.debt_payments (user_id, debt_id, amount)
values (debt_uid(), test_debt(), 200);

select is(
  (select remaining_amount from public.debts where id = test_debt()),
  800::numeric,
  'debt_remaining: INSERT subtracts payment amount (1000 - 200 = 800)'
);

-- Second INSERT: further decrements
do $$
declare
  _pid uuid;
begin
  insert into public.debt_payments (user_id, debt_id, amount)
  values (debt_uid(), test_debt(), 300)
  returning id into _pid;
  perform set_config('test.payment_id', _pid::text, true);
end;
$$;

select is(
  (select remaining_amount from public.debts where id = test_debt()),
  500::numeric,
  'debt_remaining: second INSERT subtracts correctly (800 - 300 = 500)'
);

-- UPDATE amount: adjusts remaining (restore old, subtract new)
update public.debt_payments
set amount = 400
where id = current_setting('test.payment_id')::uuid;

select is(
  (select remaining_amount from public.debts where id = test_debt()),
  400::numeric,
  'debt_remaining: UPDATE amount adjusts correctly (500 + 300 - 400 = 400)'
);

-- UPDATE with no amount change: no-op
update public.debt_payments
set note = 'just a note'
where id = current_setting('test.payment_id')::uuid;

select is(
  (select remaining_amount from public.debts where id = test_debt()),
  400::numeric,
  'debt_remaining: UPDATE with no amount change is a no-op'
);

-- DELETE: restores amount to remaining
delete from public.debt_payments
where id = current_setting('test.payment_id')::uuid;

select is(
  (select remaining_amount from public.debts where id = test_debt()),
  800::numeric,
  'debt_remaining: DELETE restores amount (400 + 400 = 800)'
);

-- Overpayment: should raise exception
select throws_ok(
  format(
    'insert into public.debt_payments (user_id, debt_id, amount) values (%L, %L, 900)',
    debt_uid(), test_debt()
  ),
  'P0001',
  'Payment of 900 would make remaining_amount negative (current: 800)',
  'debt_remaining: overpayment raises exception'
);

-- Verify remaining_amount unchanged after failed overpayment
select is(
  (select remaining_amount from public.debts where id = test_debt()),
  800::numeric,
  'debt_remaining: remaining unchanged after failed overpayment'
);

-- ===========================================================================
-- 5. daily_usage_update_guard()
-- ===========================================================================

-- Setup
do $$
declare
  _uid uuid;
begin
  _uid := create_test_user('guard@test.com', 'Guard User');
  perform set_config('test.guard_uid', _uid::text, true);
end;
$$;

insert into public.daily_usage (user_id, credits_used, date)
values (current_setting('test.guard_uid')::uuid, 5, '2025-01-15');

-- Allows increasing credits_used
select lives_ok(
  format(
    'update public.daily_usage set credits_used = 10 where user_id = %L and date = ''2025-01-15''',
    current_setting('test.guard_uid')::uuid
  ),
  'daily_usage_guard: allows increasing credits_used'
);

-- Blocks decreasing credits_used
select throws_ok(
  format(
    'update public.daily_usage set credits_used = 3 where user_id = %L and date = ''2025-01-15''',
    current_setting('test.guard_uid')::uuid
  ),
  'credits_used can only increase',
  'daily_usage_guard: blocks decreasing credits_used'
);

-- Blocks changing user_id
do $$
declare
  _u2 uuid;
begin
  _u2 := create_test_user('guard-bob@test.com', 'Guard Bob');
  perform set_config('test.guard_u2', _u2::text, true);
end;
$$;

select throws_ok(
  format(
    'update public.daily_usage set user_id = %L where user_id = %L and date = ''2025-01-15''',
    current_setting('test.guard_u2')::uuid, current_setting('test.guard_uid')::uuid
  ),
  'Cannot change user_id on daily_usage',
  'daily_usage_guard: blocks changing user_id'
);

-- Blocks changing date
select throws_ok(
  format(
    'update public.daily_usage set date = ''2025-02-01'' where user_id = %L and date = ''2025-01-15''',
    current_setting('test.guard_uid')::uuid
  ),
  'Cannot change date on daily_usage',
  'daily_usage_guard: blocks changing date'
);

-- Blocks changing created_at
select throws_ok(
  format(
    'update public.daily_usage set created_at = now() - interval ''1 day'' where user_id = %L and date = ''2025-01-15''',
    current_setting('test.guard_uid')::uuid
  ),
  'Cannot change created_at on daily_usage',
  'daily_usage_guard: blocks changing created_at'
);

-- ===========================================================================
-- 6. notifications_update_guard()
-- ===========================================================================

-- Setup
do $$
declare
  _uid uuid;
  _nid uuid;
begin
  _uid := create_test_user('notif@test.com', 'Notif User');
  insert into public.notifications (user_id, type, title, message, data)
  values (_uid, 'budget_80', 'Test Title', 'Test Msg', '{"cat":"food"}'::jsonb)
  returning id into _nid;
  perform set_config('test.notif_uid', _uid::text, true);
  perform set_config('test.notif_id',  _nid::text, true);
end;
$$;

create or replace function test_notif() returns uuid language sql stable as $$
  select current_setting('test.notif_id')::uuid;
$$;

-- Allows toggling is_read
select lives_ok(
  format('update public.notifications set is_read = true where id = %L', test_notif()),
  'notifications_guard: allows toggling is_read'
);

-- Blocks changing title
select throws_ok(
  format('update public.notifications set title = ''Hacked'' where id = %L', test_notif()),
  'Only is_read may be updated on notifications',
  'notifications_guard: blocks changing title'
);

-- Blocks changing message
select throws_ok(
  format('update public.notifications set message = ''Hacked'' where id = %L', test_notif()),
  'Only is_read may be updated on notifications',
  'notifications_guard: blocks changing message'
);

-- Blocks changing type
select throws_ok(
  format('update public.notifications set type = ''reminder_due'' where id = %L', test_notif()),
  'Only is_read may be updated on notifications',
  'notifications_guard: blocks changing type'
);

-- Blocks changing data (jsonb, uses IS DISTINCT FROM)
select throws_ok(
  format('update public.notifications set data = ''{"hacked":true}''::jsonb where id = %L', test_notif()),
  'Only is_read may be updated on notifications',
  'notifications_guard: blocks changing data'
);

-- Blocks changing created_at
select throws_ok(
  format('update public.notifications set created_at = now() - interval ''1 year'' where id = %L', test_notif()),
  'Only is_read may be updated on notifications',
  'notifications_guard: blocks changing created_at'
);

-- Blocks changing user_id
do $$
declare
  _u2 uuid;
begin
  _u2 := create_test_user('notif-bob@test.com', 'Notif Bob');
  perform set_config('test.notif_u2', _u2::text, true);
end;
$$;

select throws_ok(
  format(
    'update public.notifications set user_id = %L where id = %L',
    current_setting('test.notif_u2')::uuid, test_notif()
  ),
  'Only is_read may be updated on notifications',
  'notifications_guard: blocks changing user_id'
);

-- ===========================================================================
-- 7. attachments_parent_check()
-- ===========================================================================

-- Setup: create parent records
do $$
declare
  _uid uuid;
  _cat uuid;
  _tid uuid;
  _did uuid;
  _rid uuid;
begin
  _uid := create_test_user('attach@test.com', 'Attach User');
  _cat := create_test_category(_uid, 'Attach Cat', 'expense');
  _tid := create_test_transaction(_uid, _cat, 50, 'expense');
  _did := create_test_debt(_uid, 'Attach Peer', 500, 'i_owe');
  _rid := create_test_reminder(_uid, 'Attach Reminder', 25);
  perform set_config('test.attach_uid', _uid::text, true);
  perform set_config('test.attach_txn', _tid::text, true);
  perform set_config('test.attach_debt', _did::text, true);
  perform set_config('test.attach_rem', _rid::text, true);
end;
$$;

-- Valid parent: transaction
select lives_ok(
  format(
    'insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
     values (%L, ''transaction'', %L, ''/f/t.pdf'', ''t.pdf'', 100, ''application/pdf'')',
    current_setting('test.attach_uid')::uuid, current_setting('test.attach_txn')::uuid
  ),
  'attachments_parent_check: valid transaction parent accepted'
);

-- Valid parent: debt
select lives_ok(
  format(
    'insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
     values (%L, ''debt'', %L, ''/f/d.pdf'', ''d.pdf'', 100, ''application/pdf'')',
    current_setting('test.attach_uid')::uuid, current_setting('test.attach_debt')::uuid
  ),
  'attachments_parent_check: valid debt parent accepted'
);

-- Valid parent: reminder
select lives_ok(
  format(
    'insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
     values (%L, ''reminder'', %L, ''/f/r.pdf'', ''r.pdf'', 100, ''application/pdf'')',
    current_setting('test.attach_uid')::uuid, current_setting('test.attach_rem')::uuid
  ),
  'attachments_parent_check: valid reminder parent accepted'
);

-- Invalid parent: nonexistent record_id (use throws_matching for UUID in message)
select throws_matching(
  format(
    'insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
     values (%L, ''transaction'', %L, ''/f/x.pdf'', ''x.pdf'', 100, ''application/pdf'')',
    current_setting('test.attach_uid')::uuid, extensions.gen_random_uuid()
  ),
  'Referenced transaction .* does not exist',
  'attachments_parent_check: rejects nonexistent parent'
);

-- Wrong user_id for parent (cross-user)
do $$
declare
  _u2  uuid;
  _cat uuid;
  _tid uuid;
begin
  _u2  := create_test_user('attach-other@test.com', 'Other');
  _cat := create_test_category(_u2, 'Other Cat', 'expense');
  _tid := create_test_transaction(_u2, _cat, 100, 'expense');
  perform set_config('test.other_txn', _tid::text, true);
  perform set_config('test.other_uid', _u2::text, true);
end;
$$;

select throws_matching(
  format(
    'insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
     values (%L, ''transaction'', %L, ''/f/y.pdf'', ''y.pdf'', 100, ''application/pdf'')',
    current_setting('test.attach_uid')::uuid, current_setting('test.other_txn')::uuid
  ),
  'Referenced transaction .* does not exist',
  'attachments_parent_check: rejects cross-user parent'
);

-- ===========================================================================
-- 8. attachments_parent_cleanup()
-- ===========================================================================

-- Setup: create a reminder with an attachment, then delete the reminder
do $$
declare
  _rid uuid;
  _aid uuid;
begin
  _rid := create_test_reminder(current_setting('test.attach_uid')::uuid, 'Cleanup Reminder', 30);
  insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
  values (current_setting('test.attach_uid')::uuid, 'reminder', _rid, '/f/cleanup.pdf', 'cleanup.pdf', 100, 'application/pdf')
  returning id into _aid;
  perform set_config('test.cleanup_reminder', _rid::text, true);
  perform set_config('test.cleanup_attachment', _aid::text, true);
end;
$$;

-- Verify attachment exists
select is(
  (select count(*)::int from public.attachments where id = current_setting('test.cleanup_attachment')::uuid),
  1,
  'attachments_cleanup: attachment exists before parent delete'
);

-- Delete the parent reminder
delete from public.reminders where id = current_setting('test.cleanup_reminder')::uuid;

-- Attachment should be gone
select is(
  (select count(*)::int from public.attachments where id = current_setting('test.cleanup_attachment')::uuid),
  0,
  'attachments_cleanup: attachment deleted when parent reminder is deleted'
);

-- 8b. attachments_parent_cleanup for transactions
do $$
declare
  _uid uuid := current_setting('test.attach_uid')::uuid;
  _cat uuid;
  _tid uuid;
  _aid uuid;
begin
  _cat := create_test_category(_uid, 'Cleanup Txn Cat', 'expense');
  _tid := create_test_transaction(_uid, _cat, 75, 'expense');
  insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
  values (_uid, 'transaction', _tid, '/f/cleanup-txn.pdf', 'cleanup-txn.pdf', 100, 'application/pdf')
  returning id into _aid;
  perform set_config('test.cleanup_txn', _tid::text, true);
  perform set_config('test.cleanup_txn_att', _aid::text, true);
end;
$$;

select is(
  (select count(*)::int from public.attachments where id = current_setting('test.cleanup_txn_att')::uuid),
  1,
  'attachments_cleanup: transaction attachment exists before delete'
);

delete from public.transactions where id = current_setting('test.cleanup_txn')::uuid;

select is(
  (select count(*)::int from public.attachments where id = current_setting('test.cleanup_txn_att')::uuid),
  0,
  'attachments_cleanup: attachment deleted when parent transaction is deleted'
);

-- 8c. attachments_parent_cleanup for debts
do $$
declare
  _uid uuid := current_setting('test.attach_uid')::uuid;
  _did uuid;
  _aid uuid;
begin
  _did := create_test_debt(_uid, 'Cleanup Debt Peer', 200, 'they_owe');
  insert into public.attachments (user_id, record_type, record_id, file_path, file_name, file_size, mime_type)
  values (_uid, 'debt', _did, '/f/cleanup-debt.pdf', 'cleanup-debt.pdf', 100, 'application/pdf')
  returning id into _aid;
  perform set_config('test.cleanup_debt', _did::text, true);
  perform set_config('test.cleanup_debt_att', _aid::text, true);
end;
$$;

select is(
  (select count(*)::int from public.attachments where id = current_setting('test.cleanup_debt_att')::uuid),
  1,
  'attachments_cleanup: debt attachment exists before delete'
);

delete from public.debts where id = current_setting('test.cleanup_debt')::uuid;

select is(
  (select count(*)::int from public.attachments where id = current_setting('test.cleanup_debt_att')::uuid),
  0,
  'attachments_cleanup: attachment deleted when parent debt is deleted'
);

-- ===========================================================================
-- 9. append_onboarding_step()
-- ===========================================================================

-- Setup: create a dedicated user for this test
do $$
declare
  _uid uuid;
begin
  _uid := create_test_user('onboard@test.com', 'Onboard User');
  perform set_config('test.onboard_uid', _uid::text, true);
end;
$$;

-- Authenticate as this user and append a step
select authenticate_as(current_setting('test.onboard_uid')::uuid);

select lives_ok(
  format('select public.append_onboarding_step(%L, ''welcome'')', current_setting('test.onboard_uid')::uuid),
  'append_onboarding_step: appends new step'
);

-- Verify the step was added (check as postgres)
select reset_role();
select ok(
  (select onboarding_completed_steps @> '"welcome"'::jsonb from public.profiles where id = current_setting('test.onboard_uid')::uuid),
  'append_onboarding_step: step appears in array'
);

-- Idempotent: appending same step again should not duplicate
select authenticate_as(current_setting('test.onboard_uid')::uuid);
select lives_ok(
  format('select public.append_onboarding_step(%L, ''welcome'')', current_setting('test.onboard_uid')::uuid),
  'append_onboarding_step: idempotent on duplicate step'
);

select reset_role();
select is(
  (select jsonb_array_length(onboarding_completed_steps) from public.profiles where id = current_setting('test.onboard_uid')::uuid),
  1,
  'append_onboarding_step: no duplicate after idempotent call'
);

-- Unauthorized: different user cannot append to another's profile.
-- The function is SECURITY DEFINER and checks auth.uid() internally.
-- We verify the auth check works by confirming that auth.uid() (set to u2)
-- IS DISTINCT FROM the target profile_id (u1) in a SECURITY DEFINER context.
select reset_role();
do $$
declare
  _u2 uuid;
begin
  _u2 := create_test_user('onboard-other@test.com', 'Other Onboard');
  perform set_config('test.onboard_u2', _u2::text, true);
end;
$$;

-- Helper: check auth.uid() inside a SECURITY DEFINER context
create or replace function test_secdef_auth_uid()
returns uuid language plpgsql security definer as $$
begin return auth.uid(); end;
$$;

-- Authenticate as u2 and attempt to append to u1's profile — should fail
select authenticate_as(current_setting('test.onboard_u2')::uuid);

select throws_matching(
  format('select public.append_onboarding_step(%L, ''categories'')', current_setting('test.onboard_uid')::uuid),
  'Unauthorized',
  'append_onboarding_step: different user cannot append to another user''s profile'
);

select reset_role();

-- ===========================================================================
select * from finish();
rollback;
