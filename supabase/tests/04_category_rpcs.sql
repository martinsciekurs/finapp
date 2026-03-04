-- ===========================================================================
-- Category Management RPC Tests
-- ===========================================================================
-- Tests all 6 RPC functions from migration 018:
--   1. create_category_auto_sort()
--   2. create_group_auto_sort()
--   3. batch_reorder_categories()
--   4. batch_reorder_groups()
--   5. delete_category_with_reassign()
--   6. delete_group_with_reassign()
--
-- NOTE: Anon permission denial is enforced at the Supabase API gateway
-- (PostgREST) via GRANT/REVOKE, not testable in pgTAP's direct SQL context.
-- Instead we test cross-user isolation: user 2 cannot modify user 1's data.
-- ===========================================================================

begin;
select plan(24);

-- ---------------------------------------------------------------------------
-- Setup: two test users
-- ---------------------------------------------------------------------------

select reset_role();

do $$
declare
  _u1 uuid;
  _u2 uuid;
begin
  _u1 := create_test_user('rpc-u1@test.com', 'RPC User 1');
  _u2 := create_test_user('rpc-u2@test.com', 'RPC User 2');
  perform set_config('test.rpc_u1', _u1::text, true);
  perform set_config('test.rpc_u2', _u2::text, true);
end;
$$;

-- Create a group for user 1 (as postgres, bypassing RLS)
do $$
declare
  _gid uuid;
begin
  _gid := create_test_category_group(
    current_setting('test.rpc_u1')::uuid, 'RPC Group', 'expense'
  );
  perform set_config('test.rpc_g1', _gid::text, true);
end;
$$;

-- ===========================================================================
-- 1. create_category_auto_sort
-- ===========================================================================

-- First category in group gets sort_order = 0
select authenticate_as(current_setting('test.rpc_u1')::uuid);

do $$
declare
  _cid uuid;
begin
  select public.create_category_auto_sort(
    current_setting('test.rpc_g1')::uuid,
    'Cat Alpha', 'expense', 'circle', '#111'
  ) into _cid;
  perform set_config('test.rpc_c1', _cid::text, true);
end;
$$;

select reset_role();
select is(
  (select sort_order from public.categories where id = current_setting('test.rpc_c1')::uuid),
  0,
  'create_category_auto_sort: first category gets sort_order 0'
);

-- Second category gets sort_order = 1
select authenticate_as(current_setting('test.rpc_u1')::uuid);

do $$
declare
  _cid uuid;
begin
  select public.create_category_auto_sort(
    current_setting('test.rpc_g1')::uuid,
    'Cat Beta', 'expense', 'circle', '#222'
  ) into _cid;
  perform set_config('test.rpc_c2', _cid::text, true);
end;
$$;

select reset_role();
select is(
  (select sort_order from public.categories where id = current_setting('test.rpc_c2')::uuid),
  1,
  'create_category_auto_sort: second category gets sort_order 1'
);

-- Different group: sort_order resets to 0 (independent per group)
do $$
declare
  _g2 uuid;
begin
  _g2 := create_test_category_group(
    current_setting('test.rpc_u1')::uuid, 'RPC Group 2', 'expense'
  );
  perform set_config('test.rpc_g2', _g2::text, true);
end;
$$;

select authenticate_as(current_setting('test.rpc_u1')::uuid);

do $$
declare
  _cid uuid;
begin
  select public.create_category_auto_sort(
    current_setting('test.rpc_g2')::uuid,
    'Cat Gamma', 'expense', 'circle', '#333'
  ) into _cid;
  perform set_config('test.rpc_c3', _cid::text, true);
end;
$$;

select reset_role();
select is(
  (select sort_order from public.categories where id = current_setting('test.rpc_c3')::uuid),
  0,
  'create_category_auto_sort: different group resets sort_order to 0'
);

-- ===========================================================================
-- 2. create_group_auto_sort
-- ===========================================================================

-- First group for user 2 gets sort_order = 0
select authenticate_as(current_setting('test.rpc_u2')::uuid);

do $$
declare
  _gid uuid;
begin
  select public.create_group_auto_sort('U2 Group A', 'expense') into _gid;
  perform set_config('test.rpc_u2g1', _gid::text, true);
end;
$$;

select reset_role();
select is(
  (select sort_order from public.category_groups where id = current_setting('test.rpc_u2g1')::uuid),
  0,
  'create_group_auto_sort: first group gets sort_order 0'
);

-- Second group same type gets sort_order = 1
select authenticate_as(current_setting('test.rpc_u2')::uuid);

do $$
declare
  _gid uuid;
begin
  select public.create_group_auto_sort('U2 Group B', 'expense') into _gid;
  perform set_config('test.rpc_u2g2', _gid::text, true);
end;
$$;

select reset_role();
select is(
  (select sort_order from public.category_groups where id = current_setting('test.rpc_u2g2')::uuid),
  1,
  'create_group_auto_sort: second group gets sort_order 1'
);

-- Different type: sort_order independent (income starts at 0)
select authenticate_as(current_setting('test.rpc_u2')::uuid);

do $$
declare
  _gid uuid;
begin
  select public.create_group_auto_sort('U2 Income Group', 'income') into _gid;
  perform set_config('test.rpc_u2g3', _gid::text, true);
end;
$$;

select reset_role();
select is(
  (select sort_order from public.category_groups where id = current_setting('test.rpc_u2g3')::uuid),
  0,
  'create_group_auto_sort: different type resets sort_order to 0'
);

-- ===========================================================================
-- 3. batch_reorder_categories
-- ===========================================================================

-- Swap sort_order of Cat Alpha (0) and Cat Beta (1)
select authenticate_as(current_setting('test.rpc_u1')::uuid);

select lives_ok(
  format(
    'select public.batch_reorder_categories(''[{"id": "%s", "sort_order": 1}, {"id": "%s", "sort_order": 0}]''::jsonb)',
    current_setting('test.rpc_c1'), current_setting('test.rpc_c2')
  ),
  'batch_reorder_categories: swaps sort_order successfully'
);

select reset_role();
select is(
  (select sort_order from public.categories where id = current_setting('test.rpc_c1')::uuid),
  1,
  'batch_reorder_categories: Cat Alpha now has sort_order 1'
);
select is(
  (select sort_order from public.categories where id = current_setting('test.rpc_c2')::uuid),
  0,
  'batch_reorder_categories: Cat Beta now has sort_order 0'
);

-- Row count mismatch: include a nonexistent ID
select authenticate_as(current_setting('test.rpc_u1')::uuid);

select throws_matching(
  format(
    'select public.batch_reorder_categories(''[{"id": "%s", "sort_order": 0}, {"id": "00000000-0000-0000-0000-000000000099", "sort_order": 1}]''::jsonb)',
    current_setting('test.rpc_c1')
  ),
  'expected 2 rows, updated 1',
  'batch_reorder_categories: raises on row count mismatch'
);
select reset_role();

-- ===========================================================================
-- 4. batch_reorder_groups
-- ===========================================================================

-- Swap sort_order of U2 Group A (0) and U2 Group B (1)
select authenticate_as(current_setting('test.rpc_u2')::uuid);

select lives_ok(
  format(
    'select public.batch_reorder_groups(''[{"id": "%s", "sort_order": 1}, {"id": "%s", "sort_order": 0}]''::jsonb)',
    current_setting('test.rpc_u2g1'), current_setting('test.rpc_u2g2')
  ),
  'batch_reorder_groups: swaps sort_order successfully'
);

select reset_role();
select is(
  (select sort_order from public.category_groups where id = current_setting('test.rpc_u2g1')::uuid),
  1,
  'batch_reorder_groups: Group A now has sort_order 1'
);
select is(
  (select sort_order from public.category_groups where id = current_setting('test.rpc_u2g2')::uuid),
  0,
  'batch_reorder_groups: Group B now has sort_order 0'
);

-- Row count mismatch: include a nonexistent ID
select authenticate_as(current_setting('test.rpc_u2')::uuid);

select throws_matching(
  format(
    'select public.batch_reorder_groups(''[{"id": "%s", "sort_order": 0}, {"id": "00000000-0000-0000-0000-000000000099", "sort_order": 1}]''::jsonb)',
    current_setting('test.rpc_u2g1')
  ),
  'expected 2 rows, updated 1',
  'batch_reorder_groups: raises on row count mismatch'
);
select reset_role();

-- ===========================================================================
-- 5. delete_category_with_reassign
-- ===========================================================================

-- Setup: create a category with transactions for reassign test
do $$
declare
  _cid_src uuid;
  _cid_tgt uuid;
begin
  _cid_src := create_test_category(
    current_setting('test.rpc_u1')::uuid, 'Del Cat Src', 'expense',
    current_setting('test.rpc_g1')::uuid
  );
  _cid_tgt := create_test_category(
    current_setting('test.rpc_u1')::uuid, 'Del Cat Tgt', 'expense',
    current_setting('test.rpc_g1')::uuid
  );

  -- Create two transactions attached to the source category
  perform create_test_transaction(
    current_setting('test.rpc_u1')::uuid, _cid_src, 100, 'expense'
  );
  perform create_test_transaction(
    current_setting('test.rpc_u1')::uuid, _cid_src, 200, 'expense'
  );

  perform set_config('test.rpc_del_cat_src', _cid_src::text, true);
  perform set_config('test.rpc_del_cat_tgt', _cid_tgt::text, true);
end;
$$;

-- Reassign transactions and delete source category
select authenticate_as(current_setting('test.rpc_u1')::uuid);

select lives_ok(
  format(
    'select public.delete_category_with_reassign(%L, %L)',
    current_setting('test.rpc_del_cat_src')::uuid,
    current_setting('test.rpc_del_cat_tgt')::uuid
  ),
  'delete_category_with_reassign: reassign + delete succeeds'
);

select reset_role();

-- Source category should be gone
select is(
  (select count(*)::int from public.categories where id = current_setting('test.rpc_del_cat_src')::uuid),
  0,
  'delete_category_with_reassign: source category deleted'
);

-- Transactions should now point to target category
select is(
  (select count(*)::int from public.transactions where category_id = current_setting('test.rpc_del_cat_tgt')::uuid),
  2,
  'delete_category_with_reassign: transactions reassigned to target'
);

-- ===========================================================================
-- 6. delete_group_with_reassign
-- ===========================================================================

-- Setup: create two groups, put categories in source group
do $$
declare
  _g_src uuid;
  _g_tgt uuid;
begin
  _g_src := create_test_category_group(
    current_setting('test.rpc_u1')::uuid, 'Del Group Src', 'expense'
  );
  _g_tgt := create_test_category_group(
    current_setting('test.rpc_u1')::uuid, 'Del Group Tgt', 'expense'
  );

  -- Create two categories in the source group
  perform create_test_category(
    current_setting('test.rpc_u1')::uuid, 'Move Cat 1', 'expense', _g_src
  );
  perform create_test_category(
    current_setting('test.rpc_u1')::uuid, 'Move Cat 2', 'expense', _g_src
  );

  perform set_config('test.rpc_del_grp_src', _g_src::text, true);
  perform set_config('test.rpc_del_grp_tgt', _g_tgt::text, true);
end;
$$;

-- Reassign categories and delete source group
select authenticate_as(current_setting('test.rpc_u1')::uuid);

select lives_ok(
  format(
    'select public.delete_group_with_reassign(%L, %L)',
    current_setting('test.rpc_del_grp_src')::uuid,
    current_setting('test.rpc_del_grp_tgt')::uuid
  ),
  'delete_group_with_reassign: reassign + delete succeeds'
);

select reset_role();

-- Source group should be gone
select is(
  (select count(*)::int from public.category_groups where id = current_setting('test.rpc_del_grp_src')::uuid),
  0,
  'delete_group_with_reassign: source group deleted'
);

-- Categories should now belong to target group
select is(
  (select count(*)::int from public.categories
   where group_id = current_setting('test.rpc_del_grp_tgt')::uuid
     and name in ('Move Cat 1', 'Move Cat 2')),
  2,
  'delete_group_with_reassign: categories reassigned to target group'
);

-- ===========================================================================
-- 7. Cross-user isolation
-- ===========================================================================
-- User 2 cannot modify user 1's data through any RPC.

-- batch_reorder_categories: u2 tries to reorder u1's categories → count mismatch
select authenticate_as(current_setting('test.rpc_u2')::uuid);

select throws_matching(
  format(
    'select public.batch_reorder_categories(''[{"id": "%s", "sort_order": 5}]''::jsonb)',
    current_setting('test.rpc_c1')
  ),
  'expected 1 rows, updated 0',
  'cross-user: batch_reorder_categories fails for other user''s categories'
);

-- batch_reorder_groups: u2 tries to reorder u1's groups → count mismatch
select throws_matching(
  format(
    'select public.batch_reorder_groups(''[{"id": "%s", "sort_order": 5}]''::jsonb)',
    current_setting('test.rpc_g1')
  ),
  'expected 1 rows, updated 0',
  'cross-user: batch_reorder_groups fails for other user''s groups'
);

-- delete_category_with_reassign: u2 can't delete u1's category (Del Cat Tgt still exists)
select lives_ok(
  format(
    'select public.delete_category_with_reassign(%L)',
    current_setting('test.rpc_del_cat_tgt')::uuid
  ),
  'cross-user: delete_category_with_reassign is no-op for other user'
);

select reset_role();
select is(
  (select count(*)::int from public.categories where id = current_setting('test.rpc_del_cat_tgt')::uuid),
  1,
  'cross-user: category still exists after other user''s delete attempt'
);

-- ===========================================================================
select * from finish();
rollback;
