-- 021: Debt enhancements
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Debts: allow explicit debt date + category mapping
-- -----------------------------------------------------------------------------

alter table public.debts
  add column debt_date date not null default current_date,
  add column category_id uuid;

create index idx_debts_category_user
  on public.debts (category_id, user_id);

alter table public.debts
  add constraint fk_debts_category
  foreign key (category_id, user_id) references public.categories (id, user_id)
  on delete set null (category_id);

create or replace function public.check_debt_category_type()
returns trigger
language plpgsql
as $$
declare
  v_category_type text;
begin
  if NEW.category_id is null then
    return NEW;
  end if;

  select c.type
    into v_category_type
  from public.categories c
  where c.id = NEW.category_id
    and c.user_id = NEW.user_id;

  if v_category_type is null then
    raise exception 'Category % not found for user %', NEW.category_id, NEW.user_id;
  end if;

  if NEW.type = 'i_owe' and v_category_type <> 'expense' then
    raise exception 'Debt type i_owe requires an expense category';
  end if;

  if NEW.type = 'they_owe' and v_category_type <> 'income' then
    raise exception 'Debt type they_owe requires an income category';
  end if;

  return NEW;
end;
$$;

create trigger check_debt_category_type
  before insert or update of type, category_id, user_id
  on public.debts
  for each row
  execute function public.check_debt_category_type();

-- -----------------------------------------------------------------------------
-- Debt payments: deleting a payment also deletes its linked transaction
-- -----------------------------------------------------------------------------

create or replace function public.cleanup_transaction_on_debt_payment_delete()
returns trigger
language plpgsql
as $$
begin
  if OLD.transaction_id is not null then
    delete from public.transactions
    where id = OLD.transaction_id
      and user_id = OLD.user_id;
  end if;

  return OLD;
end;
$$;

create trigger cleanup_transaction_on_debt_payment_delete
  after delete on public.debt_payments
  for each row
  execute function public.cleanup_transaction_on_debt_payment_delete();
