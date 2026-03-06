-- 032: Database security hardening
-- =============================================================================
-- Adds:
--   1. numeric(12,2) precision to monetary columns for consistent overflow protection
--   2. Partial unique index on profiles.stripe_customer_id
--   3. Lookup index on reminder_payments.reminder_id

-- ──────────────────────────────────────────────
-- 1. Enforce numeric(12,2) on monetary columns
-- ──────────────────────────────────────────────

ALTER TABLE public.transactions
  ALTER COLUMN amount TYPE numeric(12,2);

ALTER TABLE public.debts
  ALTER COLUMN original_amount TYPE numeric(12,2),
  ALTER COLUMN remaining_amount TYPE numeric(12,2);

ALTER TABLE public.debt_payments
  ALTER COLUMN amount TYPE numeric(12,2);

-- ──────────────────────────────────────────────
-- 2. Partial unique index on stripe_customer_id
-- ──────────────────────────────────────────────

CREATE UNIQUE INDEX idx_profiles_stripe_customer_id
  ON public.profiles (stripe_customer_id)
  WHERE stripe_customer_id IS NOT NULL;

-- ──────────────────────────────────────────────
-- 3. Lookup index on reminder_payments.reminder_id
-- ──────────────────────────────────────────────

CREATE INDEX idx_reminder_payments_reminder_id
  ON public.reminder_payments (reminder_id);
