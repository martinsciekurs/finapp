-- ===========================================================================
-- pgTAP Tests: Budget System (category_budgets + monthly_income_targets)
-- ===========================================================================
-- Tests RLS policies, constraints, FK enforcement, and triggers for
-- the two budget-system tables.
-- ===========================================================================

begin;
select plan(46);

-- ---------------------------------------------------------------------------
-- Setup: Create test users and seed data
-- ---------------------------------------------------------------------------

select reset_role();

-- Users
\set alice_email 'alice-budget@test.com'
\set bob_email   'bob-budget@test.com'

select create_test_user(:'alice_email', 'Alice') as alice_id \gset
select create_test_user(:'bob_email',   'Bob')   as bob_id   \gset

-- Category groups & categories for Alice
select create_test_category_group(:'alice_id'::uuid, 'Alice Essentials', 'expense') as alice_group \gset
select create_test_category(:'alice_id'::uuid, 'Alice Groceries', 'expense', :'alice_group'::uuid) as alice_cat1 \gset
select create_test_category(:'alice_id'::uuid, 'Alice Transport', 'expense', :'alice_group'::uuid) as alice_cat2 \gset

-- Category group & category for Bob
select create_test_category_group(:'bob_id'::uuid, 'Bob Essentials', 'expense') as bob_group \gset
select create_test_category(:'bob_id'::uuid, 'Bob Groceries', 'expense', :'bob_group'::uuid) as bob_cat1 \gset

-- Seed: budget for Alice cat1
insert into public.category_budgets (category_id, user_id, year_month, amount)
values (:'alice_cat1'::uuid, :'alice_id'::uuid, '2026-03', 500);

-- Seed: income target for Alice
insert into public.monthly_income_targets (user_id, year_month, amount)
values (:'alice_id'::uuid, '2026-03', 5000);

-- Seed: budget for Bob cat1
insert into public.category_budgets (category_id, user_id, year_month, amount)
values (:'bob_cat1'::uuid, :'bob_id'::uuid, '2026-03', 300);

-- Seed: income target for Bob
insert into public.monthly_income_targets (user_id, year_month, amount)
values (:'bob_id'::uuid, '2026-03', 4000);


-- ===========================================================================
-- RLS: category_budgets
-- ===========================================================================

-- 1. Owner can read own budgets
select authenticate_as(:'alice_id'::uuid);
select is(
  (select count(*) from public.category_budgets)::int,
  1,
  'RLS: Alice sees her own category_budgets'
);

-- 2. Cross-user read denied
select authenticate_as(:'bob_id'::uuid);
select is(
  (select count(*) from public.category_budgets where user_id = :'alice_id'::uuid)::int,
  0,
  'RLS: Bob cannot see Alice category_budgets'
);

-- 3. Owner can insert
select authenticate_as(:'alice_id'::uuid);
select lives_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 200)',
    :'alice_cat2', :'alice_id', '2026-03'
  ),
  'RLS: Alice can insert her own category_budget'
);

-- 4. Cross-user insert denied
select authenticate_as(:'bob_id'::uuid);
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 999)',
    :'alice_cat1', :'alice_id', '2026-04'
  ),
  '42501'::char(5),
  null,
  'RLS: Bob cannot insert into Alice category_budgets'
);

-- 5. Owner can update
select authenticate_as(:'alice_id'::uuid);
select lives_ok(
  format(
    'update public.category_budgets set amount = 600 where category_id = %L::uuid and year_month = %L',
    :'alice_cat1', '2026-03'
  ),
  'RLS: Alice can update her own category_budget'
);

-- 6. Cross-user update silently blocked
select authenticate_as(:'bob_id'::uuid);
select lives_ok(
  format(
    'update public.category_budgets set amount = 999 where category_id = %L::uuid',
    :'alice_cat1'
  ),
  'RLS: Bob update on Alice budget does not throw'
);
select reset_role();
select is(
  (select amount::int from public.category_budgets where category_id = :'alice_cat1'::uuid and year_month = '2026-03'),
  600,
  'RLS: Alice budget amount unchanged after Bob update attempt'
);

-- 7. Owner can delete
select authenticate_as(:'alice_id'::uuid);
select lives_ok(
  format(
    'delete from public.category_budgets where category_id = %L::uuid and year_month = %L',
    :'alice_cat2', '2026-03'
  ),
  'RLS: Alice can delete her own category_budget'
);

-- 8. Cross-user delete silently blocked
select authenticate_as(:'bob_id'::uuid);
select lives_ok(
  format(
    'delete from public.category_budgets where category_id = %L::uuid',
    :'alice_cat1'
  ),
  'RLS: Bob delete on Alice budget does not throw'
);
select reset_role();
select is(
  (select count(*) from public.category_budgets where category_id = :'alice_cat1'::uuid)::int,
  1,
  'RLS: Alice budget still exists after Bob delete attempt'
);

-- 9. Anon cannot read
select authenticate_as_anon();
select is(
  (select count(*) from public.category_budgets)::int,
  0,
  'RLS: anon sees zero category_budgets'
);


-- ===========================================================================
-- RLS: monthly_income_targets
-- ===========================================================================

select reset_role();

-- 10. Owner can read own targets
select authenticate_as(:'alice_id'::uuid);
select is(
  (select count(*) from public.monthly_income_targets)::int,
  1,
  'RLS: Alice sees her own income_targets'
);

-- 11. Cross-user read denied
select authenticate_as(:'bob_id'::uuid);
select is(
  (select count(*) from public.monthly_income_targets where user_id = :'alice_id'::uuid)::int,
  0,
  'RLS: Bob cannot see Alice income_targets'
);

-- 12. Owner can insert
select authenticate_as(:'alice_id'::uuid);
select lives_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, 6000)',
    :'alice_id', '2026-04'
  ),
  'RLS: Alice can insert her own income_target'
);

-- 13. Cross-user insert denied
select authenticate_as(:'bob_id'::uuid);
select throws_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, 9999)',
    :'alice_id', '2026-05'
  ),
  '42501'::char(5),
  null,
  'RLS: Bob cannot insert into Alice income_targets'
);

-- 14. Owner can update
select authenticate_as(:'alice_id'::uuid);
select lives_ok(
  format(
    'update public.monthly_income_targets set amount = 5500 where year_month = %L',
    '2026-03'
  ),
  'RLS: Alice can update her own income_target'
);

-- 15. Cross-user update silently blocked
select authenticate_as(:'bob_id'::uuid);
select lives_ok(
  format(
    'update public.monthly_income_targets set amount = 9999 where user_id = %L::uuid',
    :'alice_id'
  ),
  'RLS: Bob update on Alice income_target does not throw'
);
select reset_role();
select is(
  (select amount::int from public.monthly_income_targets where user_id = :'alice_id'::uuid and year_month = '2026-03'),
  5500,
  'RLS: Alice income_target amount unchanged after Bob update attempt'
);

-- 16. Owner can delete
select authenticate_as(:'alice_id'::uuid);
select lives_ok(
  format(
    'delete from public.monthly_income_targets where year_month = %L',
    '2026-04'
  ),
  'RLS: Alice can delete her own income_target'
);

-- 17. Cross-user delete silently blocked
select authenticate_as(:'bob_id'::uuid);
select lives_ok(
  format(
    'delete from public.monthly_income_targets where user_id = %L::uuid',
    :'alice_id'
  ),
  'RLS: Bob delete on Alice income_target does not throw'
);
select reset_role();
select is(
  (select count(*) from public.monthly_income_targets where user_id = :'alice_id'::uuid)::int,
  1,
  'RLS: Alice income_target still exists after Bob delete attempt'
);

-- 18. Anon cannot read
select authenticate_as_anon();
select is(
  (select count(*) from public.monthly_income_targets)::int,
  0,
  'RLS: anon sees zero monthly_income_targets'
);


-- ===========================================================================
-- Constraints: category_budgets
-- ===========================================================================

select reset_role();

-- 19. year_month format: invalid month 00
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 100)',
    :'alice_cat1', :'alice_id', '2026-00'
  ),
  '23514'::char(5),
  null,
  'CHECK: category_budgets rejects year_month 2026-00'
);

-- 20. year_month format: invalid month 13
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 100)',
    :'alice_cat1', :'alice_id', '2026-13'
  ),
  '23514'::char(5),
  null,
  'CHECK: category_budgets rejects year_month 2026-13'
);

-- 21. year_month format: invalid format (no dash)
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 100)',
    :'alice_cat1', :'alice_id', '202603'
  ),
  '23514'::char(5),
  null,
  'CHECK: category_budgets rejects year_month without dash'
);

-- 22. amount > 0: rejects zero
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 0)',
    :'alice_cat1', :'alice_id', '2026-05'
  ),
  '23514'::char(5),
  null,
  'CHECK: category_budgets rejects amount = 0'
);

-- 23. amount > 0: rejects negative
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, -50)',
    :'alice_cat1', :'alice_id', '2026-05'
  ),
  '23514'::char(5),
  null,
  'CHECK: category_budgets rejects negative amount'
);

-- 24. UNIQUE(category_id, year_month): duplicate rejected
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 999)',
    :'alice_cat1', :'alice_id', '2026-03'
  ),
  '23505'::char(5),
  null,
  'UNIQUE: category_budgets rejects duplicate (category_id, year_month)'
);

-- 25. Same category, different month: allowed
select lives_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 400)',
    :'alice_cat1', :'alice_id', '2026-04'
  ),
  'UNIQUE: category_budgets allows same category in different month'
);

-- Cleanup the extra row
delete from public.category_budgets
  where category_id = :'alice_cat1'::uuid and year_month = '2026-04';


-- ===========================================================================
-- Constraints: monthly_income_targets
-- ===========================================================================

-- 26. year_month format: invalid month 00
select throws_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, 5000)',
    :'alice_id', '2026-00'
  ),
  '23514'::char(5),
  null,
  'CHECK: income_targets rejects year_month 2026-00'
);

-- 27. year_month format: invalid month 13
select throws_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, 5000)',
    :'alice_id', '2026-13'
  ),
  '23514'::char(5),
  null,
  'CHECK: income_targets rejects year_month 2026-13'
);

-- 28. amount > 0: rejects zero
select throws_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, 0)',
    :'alice_id', '2026-06'
  ),
  '23514'::char(5),
  null,
  'CHECK: income_targets rejects amount = 0'
);

-- 29. amount > 0: rejects negative
select throws_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, -100)',
    :'alice_id', '2026-06'
  ),
  '23514'::char(5),
  null,
  'CHECK: income_targets rejects negative amount'
);

-- 30. UNIQUE(user_id, year_month): duplicate rejected
select throws_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, 9999)',
    :'alice_id', '2026-03'
  ),
  '23505'::char(5),
  null,
  'UNIQUE: income_targets rejects duplicate (user_id, year_month)'
);

-- 31. Same user, different month: allowed
select lives_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, 5500)',
    :'alice_id', '2026-06'
  ),
  'UNIQUE: income_targets allows same user in different month'
);

-- Cleanup
delete from public.monthly_income_targets
  where user_id = :'alice_id'::uuid and year_month = '2026-06';


-- ===========================================================================
-- FK: category_budgets → categories (composite FK)
-- ===========================================================================

-- 32. FK: insert with non-existent category fails
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 100)',
    extensions.gen_random_uuid(), :'alice_id', '2026-07'
  ),
  '23503'::char(5),
  null,
  'FK: category_budgets rejects non-existent category_id'
);

-- 33. FK: insert with cross-user category fails (Alice's category + Bob's user_id)
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 100)',
    :'alice_cat1', :'bob_id', '2026-07'
  ),
  '23503'::char(5),
  null,
  'FK: category_budgets rejects cross-user category'
);

-- 34. FK: ON DELETE CASCADE — deleting category removes its budgets
-- First, add a budget for alice_cat2
insert into public.category_budgets (category_id, user_id, year_month, amount)
values (:'alice_cat2'::uuid, :'alice_id'::uuid, '2026-03', 150);

select is(
  (select count(*) from public.category_budgets where category_id = :'alice_cat2'::uuid)::int,
  1,
  'FK cascade setup: budget exists for alice_cat2'
);

delete from public.categories where id = :'alice_cat2'::uuid;

select is(
  (select count(*) from public.category_budgets where category_id = :'alice_cat2'::uuid)::int,
  0,
  'FK: ON DELETE CASCADE removes category_budgets when category deleted'
);

-- Re-create alice_cat2 for downstream if needed
select create_test_category(:'alice_id'::uuid, 'Alice Transport v2', 'expense', :'alice_group'::uuid) as alice_cat2_new \gset


-- ===========================================================================
-- Triggers: set_updated_at
-- ===========================================================================

-- 36. set_updated_at on category_budgets
update public.category_budgets
  set updated_at = '2020-01-01T00:00:00Z'
  where category_id = :'alice_cat1'::uuid and year_month = '2026-03';

update public.category_budgets
  set amount = 650
  where category_id = :'alice_cat1'::uuid and year_month = '2026-03';

select ok(
  (select updated_at > '2025-01-01T00:00:00Z' from public.category_budgets
   where category_id = :'alice_cat1'::uuid and year_month = '2026-03'),
  'Trigger: set_updated_at fires on category_budgets'
);

-- 37. set_updated_at on monthly_income_targets
update public.monthly_income_targets
  set updated_at = '2020-01-01T00:00:00Z'
  where user_id = :'alice_id'::uuid and year_month = '2026-03';

update public.monthly_income_targets
  set amount = 5750
  where user_id = :'alice_id'::uuid and year_month = '2026-03';

select ok(
  (select updated_at > '2025-01-01T00:00:00Z' from public.monthly_income_targets
   where user_id = :'alice_id'::uuid and year_month = '2026-03'),
  'Trigger: set_updated_at fires on monthly_income_targets'
);


-- ===========================================================================
-- FK: monthly_income_targets → auth.users
-- ===========================================================================

-- 38. FK: insert with non-existent user fails
select throws_ok(
  format(
    'insert into public.monthly_income_targets (user_id, year_month, amount) values (%L::uuid, %L, 5000)',
    extensions.gen_random_uuid(), '2026-08'
  ),
  '23503'::char(5),
  null,
  'FK: income_targets rejects non-existent user_id'
);


-- ===========================================================================
-- Additional edge cases
-- ===========================================================================

-- 39. year_month accepts boundary months (01 and 12)
select lives_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 100)',
    :'alice_cat1', :'alice_id', '2026-01'
  ),
  'CHECK: category_budgets accepts year_month 2026-01'
);

select lives_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 100)',
    :'alice_cat1', :'alice_id', '2026-12'
  ),
  'CHECK: category_budgets accepts year_month 2026-12'
);

-- Cleanup boundary months
delete from public.category_budgets
  where category_id = :'alice_cat1'::uuid and year_month in ('2026-01', '2026-12');

-- 41. Decimal amounts are accepted
select lives_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 99.99)',
    :'alice_cat1', :'alice_id', '2026-08'
  ),
  'CHECK: category_budgets accepts decimal amount'
);

-- Cleanup
delete from public.category_budgets
  where category_id = :'alice_cat1'::uuid and year_month = '2026-08';

-- 42. year_month rejects partial formats
select throws_ok(
  format(
    'insert into public.category_budgets (category_id, user_id, year_month, amount) values (%L::uuid, %L::uuid, %L, 100)',
    :'alice_cat1', :'alice_id', '2026-3'
  ),
  '23514'::char(5),
  null,
  'CHECK: category_budgets rejects single-digit month (2026-3)'
);


-- ===========================================================================
-- Done
-- ===========================================================================

select * from finish();
rollback;
