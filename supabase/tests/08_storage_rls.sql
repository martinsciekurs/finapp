-- ===========================================================================
-- Storage Bucket RLS Policy Tests
-- ===========================================================================
-- Tests RLS policies on storage.objects for the 'attachments' bucket.
-- Verifies path-based user isolation via storage.foldername(name)[1].
-- ===========================================================================

begin;
select plan(10);

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
  '42501'::char(5),
  null,
  'storage: user cannot INSERT under another user''s path'
);

-- ===========================================================================
-- 5. Owner can UPDATE own objects
-- ===========================================================================
-- su1 updates all visible objects (RLS limits to own rows only)
select lives_ok(
  format(
    'update storage.objects set metadata = ''{"test":true}''::jsonb where bucket_id = ''attachments'' and name like ''%s/%%''',
    su1()::text
  ),
  'storage: user can UPDATE own attachment objects'
);

-- ===========================================================================
-- 6. User cannot UPDATE another user's objects
-- ===========================================================================
-- Verify from su2's context that su1's update did not modify su2's row
select authenticate_as(su2());

select is(
  (select metadata from storage.objects
   where bucket_id = 'attachments'
   and name like current_setting('test.su2') || '/%'),
  null::jsonb,
  'storage: user cannot UPDATE another user''s attachment objects'
);

-- ===========================================================================
-- 7. User cannot DELETE another user's objects
-- ===========================================================================
select authenticate_as(su1());

select throws_ok(
  format(
    'delete from storage.objects where bucket_id = ''attachments'' and name like ''%s/%%''',
    current_setting('test.su2')
  ),
  '42501'::char(5),
  null,
  'storage: direct DELETE against attachment objects is blocked'
);

-- Verify su2's row still exists
select authenticate_as(su2());

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'attachments'),
  1,
  'storage: user cannot DELETE another user''s attachment objects'
);

-- ===========================================================================
-- 9. Anon cannot access objects for modification
-- ===========================================================================
select authenticate_as_anon();

select is(
  (select count(*)::int from storage.objects
   where bucket_id = 'attachments'),
  0,
  'storage: anon cannot access attachment objects for modification'
);

-- ===========================================================================
-- ===========================================================================
select authenticate_as(su1());

select throws_ok(
  format(
    'delete from storage.objects where bucket_id = ''attachments'' and name like ''%s/%%''',
    su1()::text
  ),
  '42501'::char(5),
  null,
  'storage: owner cannot directly DELETE attachment objects from storage.objects'
);

select reset_role();

-- ===========================================================================
select * from finish();
rollback;
