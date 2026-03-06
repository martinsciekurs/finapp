-- ===========================================================================
-- Tags & Transaction-Tags Tests
-- ===========================================================================
-- Tests RLS policies, constraints, FK cascades, and index existence for the
-- tags and transaction_tags tables.
--
-- Plan (21 assertions):
--   1-6:   RLS on tags (INSERT/SELECT/UPDATE/DELETE/cross-user/anon)
--   7-10:  RLS on transaction_tags (INSERT/SELECT/DELETE/cross-user)
--   11-15: Constraint checks on tags (name, color, uniqueness)
--   16-17: FK CASCADE behavior (tag deleted → txn_tag gone; txn deleted → txn_tag gone)
--   18-21: Index existence
-- ===========================================================================

begin;
select plan(21);

-- ===========================
-- Setup
-- ===========================
select reset_role();

do $$
declare
  _u1 uuid;
  _u2 uuid;
begin
  _u1 := create_test_user('tags-alice@test.com', 'Tags Alice');
  _u2 := create_test_user('tags-bob@test.com',   'Tags Bob');
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

do $$
declare
  _c1 uuid;
  _c2 uuid;
begin
  _c1 := create_test_category(u1(), 'Tags Test Expense', 'expense');
  _c2 := create_test_category(u2(), 'Tags Test Expense', 'expense');
  perform set_config('test.c1', _c1::text, true);
  perform set_config('test.c2', _c2::text, true);
end;
$$;

create or replace function c1() returns uuid language sql stable as $$
  select current_setting('test.c1')::uuid;
$$;
create or replace function c2() returns uuid language sql stable as $$
  select current_setting('test.c2')::uuid;
$$;

do $$
declare
  _t1 uuid;
  _t2 uuid;
begin
  _t1 := create_test_transaction(u1(), c1(), 50, 'expense');
  _t2 := create_test_transaction(u2(), c2(), 75, 'expense');
  perform set_config('test.t1', _t1::text, true);
  perform set_config('test.t2', _t2::text, true);
end;
$$;

create or replace function t1() returns uuid language sql stable as $$
  select current_setting('test.t1')::uuid;
$$;
create or replace function t2() returns uuid language sql stable as $$
  select current_setting('test.t2')::uuid;
$$;

do $$
declare
  _tag1  uuid;
  _tag2  uuid;
  _tag1b uuid;
begin
  insert into public.tags (user_id, name, color) values (u1(), 'Food',      '#FF5733') returning id into _tag1;
  insert into public.tags (user_id, name, color) values (u2(), 'Transport', '#3366FF') returning id into _tag2;
  insert into public.tags (user_id, name, color) values (u1(), 'Shopping',  '#33FF57') returning id into _tag1b;

  perform set_config('test.tag1',  _tag1::text,  true);
  perform set_config('test.tag2',  _tag2::text,  true);
  perform set_config('test.tag1b', _tag1b::text, true);
end;
$$;

create or replace function tag1()  returns uuid language sql stable as $$ select current_setting('test.tag1')::uuid; $$;
create or replace function tag2()  returns uuid language sql stable as $$ select current_setting('test.tag2')::uuid; $$;
create or replace function tag1b() returns uuid language sql stable as $$ select current_setting('test.tag1b')::uuid; $$;

insert into public.transaction_tags (transaction_id, tag_id, user_id)
values (t1(), tag1(), u1());

-- ===========================================================================
-- 1. RLS — tags: owner can INSERT own tag
-- ===========================================================================
select authenticate_as(u1());

select lives_ok(
  format(
    'insert into public.tags (user_id, name, color) values (%L, ''Entertainment'', ''#9933FF'')',
    u1()
  ),
  'tags rls: owner can insert own tag'
);

-- ===========================================================================
-- 2. RLS — tags: owner can SELECT own tags
-- ===========================================================================
select is(
  (select count(*)::int from public.tags where user_id = u1()),
  3,
  'tags rls: owner can select own tags'
);

-- ===========================================================================
-- 3. RLS — tags: owner can UPDATE own tag
-- ===========================================================================
select lives_ok(
  format(
    'update public.tags set name = ''Fun'' where user_id = %L and name = ''Entertainment''',
    u1()
  ),
  'tags rls: owner can update own tag'
);

-- ===========================================================================
-- 4. RLS — tags: owner can DELETE own tag
-- ===========================================================================
select lives_ok(
  format(
    'delete from public.tags where user_id = %L and name = ''Fun''',
    u1()
  ),
  'tags rls: owner can delete own tag'
);

-- ===========================================================================
-- 5. RLS — tags: cross-user SELECT returns 0 rows
-- ===========================================================================
select authenticate_as(u2());

select is(
  (select count(*)::int from public.tags where user_id = u1()),
  0,
  'tags rls: cross-user SELECT returns no rows'
);

-- ===========================================================================
-- 6. RLS — tags: anon cannot SELECT any tags
-- ===========================================================================
select authenticate_as_anon();

select is(
  (select count(*)::int from public.tags),
  0,
  'tags rls: anon cannot select any tags'
);

select reset_role();

-- ===========================================================================
-- 7. RLS — transaction_tags: owner can INSERT own transaction_tag
-- ===========================================================================
select authenticate_as(u1());

select lives_ok(
  format(
    'insert into public.transaction_tags (transaction_id, tag_id, user_id) values (%L, %L, %L)',
    t1(), tag1b(), u1()
  ),
  'transaction_tags rls: owner can insert own transaction_tag'
);

-- ===========================================================================
-- 8. RLS — transaction_tags: owner can SELECT own transaction_tags
-- ===========================================================================
select is(
  (select count(*)::int from public.transaction_tags where user_id = u1()),
  2,
  'transaction_tags rls: owner can select own transaction_tags'
);

-- ===========================================================================
-- 9. RLS — transaction_tags: owner can DELETE own transaction_tag
-- ===========================================================================
select lives_ok(
  format(
    'delete from public.transaction_tags where transaction_id = %L and tag_id = %L',
    t1(), tag1b()
  ),
  'transaction_tags rls: owner can delete own transaction_tag'
);

-- ===========================================================================
-- 10. RLS — transaction_tags: cross-user SELECT returns 0 rows
-- ===========================================================================
select authenticate_as(u2());

select is(
  (select count(*)::int from public.transaction_tags where user_id = u1()),
  0,
  'transaction_tags rls: cross-user SELECT returns no rows'
);

select reset_role();

-- ===========================================================================
-- 11. Constraint — tags.name: empty string rejected (btrim check)
-- ===========================================================================
select throws_ok(
  format(
    'insert into public.tags (user_id, name, color) values (%L, '''', ''#FF0000'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'tags constraint: empty name rejected'
);

-- ===========================================================================
-- 12. Constraint — tags.name: > 30 characters rejected
-- ===========================================================================
select throws_ok(
  format(
    'insert into public.tags (user_id, name, color) values (%L, %L, ''#FF0000'')',
    u1(), repeat('A', 31)
  ),
  '23514'::char(5),
  null,
  'tags constraint: name > 30 chars rejected'
);

-- ===========================================================================
-- 13. Constraint — tags.color: invalid hex format rejected
-- ===========================================================================
select throws_ok(
  format(
    'insert into public.tags (user_id, name, color) values (%L, ''Leisure'', ''red'')',
    u1()
  ),
  '23514'::char(5),
  null,
  'tags constraint: non-hex color rejected'
);

-- ===========================================================================
-- 14. Constraint — tags: case-insensitive unique per user
-- ===========================================================================
select throws_ok(
  format(
    'insert into public.tags (user_id, name, color) values (%L, ''food'', ''#AA0000'')',
    u1()
  ),
  '23505'::char(5),
  null,
  'tags constraint: case-insensitive duplicate name per user rejected'
);

-- ===========================================================================
-- 15. Constraint — tags: same name allowed for different users
-- ===========================================================================
select lives_ok(
  format(
    'insert into public.tags (user_id, name, color) values (%L, ''Food'', ''#FF5733'')',
    u2()
  ),
  'tags constraint: same name allowed for different users'
);

-- ===========================================================================
-- 16. FK CASCADE — deleting a tag cascades to transaction_tags
-- ===========================================================================
do $$
declare
  _cascade_tag uuid;
begin
  insert into public.tags (user_id, name, color)
  values (u1(), 'CascadeTag', '#123456')
  returning id into _cascade_tag;

  insert into public.transaction_tags (transaction_id, tag_id, user_id)
  values (t1(), _cascade_tag, u1());

  perform set_config('test.cascade_tag', _cascade_tag::text, true);
end;
$$;

delete from public.tags where id = current_setting('test.cascade_tag')::uuid;

select is(
  (select count(*)::int from public.transaction_tags
   where tag_id = current_setting('test.cascade_tag')::uuid),
  0,
  'fk cascade: deleting tag cascades to transaction_tags'
);

-- ===========================================================================
-- 17. FK CASCADE — deleting a transaction cascades to transaction_tags
-- ===========================================================================
do $$
declare
  _cascade_txn uuid;
begin
  _cascade_txn := create_test_transaction(u1(), c1(), 25, 'expense');

  insert into public.transaction_tags (transaction_id, tag_id, user_id)
  values (_cascade_txn, tag1(), u1());

  perform set_config('test.cascade_txn', _cascade_txn::text, true);
end;
$$;

delete from public.transactions where id = current_setting('test.cascade_txn')::uuid;

select is(
  (select count(*)::int from public.transaction_tags
   where transaction_id = current_setting('test.cascade_txn')::uuid),
  0,
  'fk cascade: deleting transaction cascades to transaction_tags'
);

-- ===========================================================================
-- 18-21. Index existence
-- ===========================================================================
select has_index('public', 'tags',             'idx_tags_user_id',              'index idx_tags_user_id exists');
select has_index('public', 'tags',             'idx_tags_user_name',            'index idx_tags_user_name exists');
select has_index('public', 'transaction_tags', 'idx_transaction_tags_tag_id',   'index idx_transaction_tags_tag_id exists');
select has_index('public', 'transaction_tags', 'idx_transaction_tags_user_id',  'index idx_transaction_tags_user_id exists');

-- ===========================================================================
select * from finish();
rollback;
