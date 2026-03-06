-- ===========================================================================
-- Storage Bucket RLS Policy Tests
-- ===========================================================================
-- Tests RLS policies on storage.objects for the 'attachments' bucket.
-- Verifies path-based user isolation via storage.foldername(name)[1].
-- ===========================================================================

begin;
select plan(4);

-- ===========================
-- Setup: create two test users
-- ===========================
select reset_role();

do $$
declare
  _u1 uuid;
  _u2 uuid;
begin
  _u1 := create_test_user('storage_alice@test.com', 'Storage Alice');
  _u2 := create_test_user('storage_bob@test.com', 'Storage Bob');
  perform set_config('test.su1', _u1::text, true);
  perform set_config('test.su2', _u2::text, true);

  insert into storage.objects (bucket_id, name, owner, owner_id)
  values
    ('attachments', _u1::text || '/transaction/rec1/file1.pdf', _u1, _u1::text),
    ('attachments', _u2::text || '/transaction/rec2/file2.pdf', _u2, _u2::text);
end;
$$;

create or replace function su1() returns uuid language sql stable as $$
  select current_setting('test.su1')::uuid;
$$;
create or replace function su2() returns uuid language sql stable as $$
  select current_setting('test.su2')::uuid;
$$;

-- ===========================================================================
-- 1. Owner can read own objects
-- ===========================================================================
select authenticate_as(su1());

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'attachments'),
  1,
  'storage: user can SELECT own attachment objects'
);

-- ===========================================================================
-- 2. User cannot read another user's objects
-- ===========================================================================
-- Still authenticated as su1 — should NOT see su2's objects
select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'attachments'
   and name like current_setting('test.su2') || '/%'),
  0,
  'storage: user cannot SELECT another user''s attachment objects'
);

-- ===========================================================================
-- 3. Anon cannot read any objects
-- ===========================================================================
select authenticate_as_anon();

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'attachments'),
  0,
  'storage: anon cannot SELECT attachment objects'
);

-- ===========================================================================
-- 4. User cannot insert under another user's path
-- ===========================================================================
select authenticate_as(su1());

select throws_ok(
  format(
    'insert into storage.objects (bucket_id, name, owner, owner_id) values (''attachments'', ''%s/transaction/rec3/hack.pdf'', ''%s'', ''%s'')',
    current_setting('test.su2'),
    su1(),
    su1()::text
  ),
  '42501',
  null,
  'storage: user cannot INSERT under another user''s path'
);

select reset_role();

-- ===========================================================================
select * from finish();
rollback;
