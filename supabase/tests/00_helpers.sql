-- ===========================================================================
-- pgTAP Test Helpers
-- ===========================================================================
-- Shared utilities for all pgTAP test files.
-- Supabase runs these files in alphabetical order, so "00_" ensures this
-- file is loaded first.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- create_test_user(email, display_name, role)
-- ---------------------------------------------------------------------------
-- Inserts a row into auth.users (which fires the handle_new_user trigger
-- and auto-creates a profiles row). Returns the new user's UUID.
-- ---------------------------------------------------------------------------
create or replace function create_test_user(
  _email    text        default 'test@example.com',
  _name     text        default null,
  _role     text        default 'user'
)
returns uuid
language plpgsql
as $$
declare
  _uid uuid := extensions.gen_random_uuid();
  _meta jsonb := '{}'::jsonb;
begin
  -- Build user_meta_data with display_name if provided
  if _name is not null then
    _meta := jsonb_build_object('display_name', _name);
  end if;

  -- Insert directly into auth.users (local dev / test only)
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    created_at,
    updated_at
  ) values (
    '00000000-0000-0000-0000-000000000000',
    _uid,
    'authenticated',
    'authenticated',
    _email,
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    _meta,
    now(),
    now()
  );

  -- Optionally promote to admin
  if _role = 'admin' then
    update public.profiles set role = 'admin' where id = _uid;
  end if;

  return _uid;
end;
$$;

-- ---------------------------------------------------------------------------
-- authenticate_as(user_id)
-- ---------------------------------------------------------------------------
-- Switches the current session to behave as an authenticated Supabase user.
-- Sets the JWT claims so auth.uid() returns the given user_id, and
-- switches to the 'authenticated' role.
-- Must be called inside a transaction (pgTAP tests run in one).
-- ---------------------------------------------------------------------------
create or replace function authenticate_as(_uid uuid)
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    json_build_object('sub', _uid, 'role', 'authenticated')::text,
    true  -- local to transaction
  );
  perform set_config('request.jwt.claim.sub', _uid::text, true);
  perform set_config('role', 'authenticated', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- authenticate_as_anon()
-- ---------------------------------------------------------------------------
-- Switches the current session to the anonymous (unauthenticated) role.
-- ---------------------------------------------------------------------------
create or replace function authenticate_as_anon()
returns void
language plpgsql
as $$
begin
  perform set_config(
    'request.jwt.claims',
    '{}'::text,
    true
  );
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'anon', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- reset_role()
-- ---------------------------------------------------------------------------
-- Restores the session to the superuser (postgres) role. Call this after
-- authenticate_as() when you need to do admin operations again.
-- ---------------------------------------------------------------------------
create or replace function reset_role()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claims', '', true);
  perform set_config('request.jwt.claim.sub', '', true);
  perform set_config('role', 'postgres', true);
end;
$$;

-- ---------------------------------------------------------------------------
-- create_test_category_group(user_id, name, type)
-- ---------------------------------------------------------------------------
-- Convenience: inserts a category group for the given user. Returns the group id.
-- Must be called as postgres (not authenticated) to bypass RLS.
-- ---------------------------------------------------------------------------
create or replace function create_test_category_group(
  _user_id uuid,
  _name    text default 'Test Group',
  _type    text default 'expense'
)
returns uuid
language plpgsql
as $$
declare
  _gid uuid;
begin
  insert into public.category_groups (user_id, name, type)
  values (_user_id, _name, _type)
  returning id into _gid;
  return _gid;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_test_category(user_id, name, type, group_id)
-- ---------------------------------------------------------------------------
-- Convenience: inserts a category for the given user. If no group_id is
-- provided, a default group is auto-created. Returns the category id.
-- Must be called as postgres (not authenticated) to bypass RLS.
-- ---------------------------------------------------------------------------
create or replace function create_test_category(
  _user_id   uuid,
  _name      text default 'Test Category',
  _type      text default 'expense',
  _group_id  uuid default null
)
returns uuid
language plpgsql
as $$
declare
  _cid uuid;
  _gid uuid := _group_id;
begin
  -- Auto-create or reuse a default group if none provided
  if _gid is null then
    select id into _gid
      from public.category_groups
      where user_id = _user_id and name = 'Default ' || _type and type = _type;

    if _gid is null then
      _gid := create_test_category_group(_user_id, 'Default ' || _type, _type);
    end if;
  end if;

  insert into public.categories (user_id, group_id, name, type)
  values (_user_id, _gid, _name, _type)
  returning id into _cid;
  return _cid;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_test_transaction(user_id, category_id, amount, type)
-- ---------------------------------------------------------------------------
create or replace function create_test_transaction(
  _user_id     uuid,
  _category_id uuid,
  _amount      numeric default 100,
  _type        text    default 'expense'
)
returns uuid
language plpgsql
as $$
declare
  _tid uuid;
begin
  insert into public.transactions (user_id, category_id, amount, type)
  values (_user_id, _category_id, _amount, _type)
  returning id into _tid;
  return _tid;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_test_debt(user_id, counterparty, original_amount, type)
-- ---------------------------------------------------------------------------
create or replace function create_test_debt(
  _user_id          uuid,
  _counterparty     text    default 'Alice',
  _original_amount  numeric default 1000,
  _type             text    default 'i_owe'
)
returns uuid
language plpgsql
as $$
declare
  _did uuid;
begin
  insert into public.debts (user_id, counterparty, original_amount, remaining_amount, type)
  values (_user_id, _counterparty, _original_amount, _original_amount, _type)
  returning id into _did;
  return _did;
end;
$$;

-- ---------------------------------------------------------------------------
-- create_test_reminder(user_id, title, amount)
-- ---------------------------------------------------------------------------
create or replace function create_test_reminder(
  _user_id uuid,
  _title   text    default 'Test Reminder',
  _amount  numeric default 50
)
returns uuid
language plpgsql
as $$
declare
  _rid uuid;
begin
  insert into public.reminders (user_id, title, amount, due_date, frequency)
  values (_user_id, _title, _amount, current_date + interval '30 days', 'monthly')
  returning id into _rid;
  return _rid;
end;
$$;

-- Dummy test so this file doesn't fail when supabase test db runs it
begin;
select plan(1);
select pass('Test helpers loaded successfully');
select * from finish();
rollback;
