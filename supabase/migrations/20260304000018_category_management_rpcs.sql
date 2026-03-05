-- 018: Category management RPC functions
-- =============================================================================
-- Provides atomic operations for category management:
--   1. Atomic create with auto-computed sort_order
--   2. Batch reorder (single UPDATE ... FROM jsonb)
--   3. Atomic delete-with-reassign (reassign + delete in one transaction)

-- ─────────────────────────────────────────────
-- 1. Atomic create: category
-- ─────────────────────────────────────────────
-- Computes sort_order = MAX(sort_order)+1 and inserts in the same
-- transaction, preventing race conditions from concurrent inserts.

create or replace function public.create_category_auto_sort(
  p_group_id uuid,
  p_name     text,
  p_type     text,
  p_icon     text,
  p_color    text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_next_sort int;
  v_id uuid;
begin
  select coalesce(max(sort_order), -1) + 1 into v_next_sort
    from categories
   where group_id = p_group_id and user_id = auth.uid();

  insert into categories (user_id, group_id, name, type, icon, color, sort_order)
  values (auth.uid(), p_group_id, p_name, p_type, p_icon, p_color, v_next_sort)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_category_auto_sort(uuid, text, text, text, text) from public;
grant execute on function public.create_category_auto_sort(uuid, text, text, text, text) to authenticated;

-- ─────────────────────────────────────────────
-- 2. Atomic create: group
-- ─────────────────────────────────────────────

create or replace function public.create_group_auto_sort(
  p_name text,
  p_type text
)
returns uuid
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_next_sort int;
  v_id uuid;
begin
  select coalesce(max(sort_order), -1) + 1 into v_next_sort
    from category_groups
   where type = p_type and user_id = auth.uid();

  insert into category_groups (user_id, name, type, sort_order)
  values (auth.uid(), p_name, p_type, v_next_sort)
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.create_group_auto_sort(text, text) from public;
grant execute on function public.create_group_auto_sort(text, text) to authenticated;

-- ─────────────────────────────────────────────
-- 3. Batch reorder: categories
-- ─────────────────────────────────────────────
-- Single UPDATE ... FROM jsonb replaces the per-item loop.
-- Verifies row count matches input length.

create or replace function public.batch_reorder_categories(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count int;
begin
  update categories c
     set sort_order = (item->>'sort_order')::int
    from jsonb_array_elements(p_items) as item
   where c.id = (item->>'id')::uuid
     and c.user_id = auth.uid();

  get diagnostics v_count = row_count;

  if v_count <> jsonb_array_length(p_items) then
    raise exception 'reorder_categories: expected % rows, updated %',
      jsonb_array_length(p_items), v_count;
  end if;
end;
$$;

revoke all on function public.batch_reorder_categories(jsonb) from public;
grant execute on function public.batch_reorder_categories(jsonb) to authenticated;

-- ─────────────────────────────────────────────
-- 4. Batch reorder: groups
-- ─────────────────────────────────────────────

create or replace function public.batch_reorder_groups(p_items jsonb)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_count int;
begin
  update category_groups g
     set sort_order = (item->>'sort_order')::int
    from jsonb_array_elements(p_items) as item
   where g.id = (item->>'id')::uuid
     and g.user_id = auth.uid();

  get diagnostics v_count = row_count;

  if v_count <> jsonb_array_length(p_items) then
    raise exception 'reorder_groups: expected % rows, updated %',
      jsonb_array_length(p_items), v_count;
  end if;
end;
$$;

revoke all on function public.batch_reorder_groups(jsonb) from public;
grant execute on function public.batch_reorder_groups(jsonb) to authenticated;

-- ─────────────────────────────────────────────
-- 5. Atomic delete category with reassign
-- ─────────────────────────────────────────────
-- Reassigns transactions (if p_reassign_to provided) and deletes the
-- category in the same transaction. Both succeed or both rollback.

create or replace function public.delete_category_with_reassign(
  p_category_id uuid,
  p_reassign_to uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_reassign_to is not null then
    update transactions
       set category_id = p_reassign_to
     where category_id = p_category_id
       and user_id = auth.uid();
  end if;

  delete from categories
   where id = p_category_id
     and user_id = auth.uid();
end;
$$;

revoke all on function public.delete_category_with_reassign(uuid, uuid) from public;
grant execute on function public.delete_category_with_reassign(uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────
-- 6. Atomic delete group with reassign
-- ─────────────────────────────────────────────
-- Reassigns categories (if p_reassign_to provided) and deletes the
-- group in the same transaction.

create or replace function public.delete_group_with_reassign(
  p_group_id uuid,
  p_reassign_to uuid default null
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if p_reassign_to is not null then
    update categories
       set group_id = p_reassign_to
     where group_id = p_group_id
       and user_id = auth.uid();
  end if;

  delete from category_groups
   where id = p_group_id
     and user_id = auth.uid();
end;
$$;

revoke all on function public.delete_group_with_reassign(uuid, uuid) from public;
grant execute on function public.delete_group_with_reassign(uuid, uuid) to authenticated;
