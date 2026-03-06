-- 021: Harden reminder_payments -> transactions ownership FK
-- =============================================================================
-- Strengthens referential integrity for privileged writes by enforcing that
-- transaction_id belongs to the same user as reminder_payments.user_id.

-- Drop previous single-column FK (if present)
alter table public.reminder_payments
  drop constraint if exists fk_reminder_payments_transaction;

-- Cleanup: nullify any existing cross-user links created outside normal RLS
update public.reminder_payments rp
set transaction_id = null
where transaction_id is not null
  and not exists (
    select 1
    from public.transactions t
    where t.id = rp.transaction_id
      and t.user_id = rp.user_id
  );

-- Supporting index for composite FK checks
create index if not exists idx_reminder_payments_transaction_user
  on public.reminder_payments (transaction_id, user_id);

-- Composite FK: enforce linked transaction belongs to same user
alter table public.reminder_payments
  add constraint fk_reminder_payments_transaction
  foreign key (transaction_id, user_id) references public.transactions (id, user_id)
  on delete set null (transaction_id);
