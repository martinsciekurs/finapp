-- Seed data
-- =============================================================================
-- 1. Banner presets (global)
-- 2. Test user with categories, transactions, reminders, budgets, and debts
--
-- Credentials: test@finapp.dev / password123
-- =============================================================================

-- =============================================================================
-- 1. Banner presets
-- =============================================================================

insert into public.banner_presets (type, value, label, sort_order) values
  -- Solid colors
  ('color', '#fdf6ee', 'Warm Cream',      1),
  ('color', '#2d4a3e', 'Sage Green',      2),
  ('color', '#c4a0a0', 'Dusty Rose',      3),
  ('color', '#c97b5e', 'Terracotta',      4),
  ('color', '#5a7d8c', 'Slate Blue',      5),
  ('color', '#3a3a3a', 'Charcoal',        6),
  ('color', '#c9a84c', 'Soft Gold',       7),
  ('color', '#9a8cb0', 'Muted Lavender',  8),

  -- Gradients
  ('gradient', 'linear-gradient(135deg, #f5c6a0, #c9a84c)', 'Sunrise', 9),
  ('gradient', 'linear-gradient(135deg, #2d4a3e, #5b9a82)', 'Forest',  10),
  ('gradient', 'linear-gradient(135deg, #1a4a5a, #7ab8c9)', 'Ocean',   11),
  ('gradient', 'linear-gradient(135deg, #6b4c7a, #c97b5e)', 'Dusk',    12),
  ('gradient', 'linear-gradient(135deg, #d4c5a9, #a08c6a)', 'Sand',    13),
  ('gradient', 'linear-gradient(135deg, #7ab8a0, #e8f5e9)', 'Mint',    14),
  ('gradient', 'linear-gradient(135deg, #4a4a4a, #9a9a9a)', 'Storm',   15),
  ('gradient', 'linear-gradient(135deg, #c9a84c, #8b3a3a)', 'Autumn',  16)
on conflict do nothing;

-- =============================================================================
-- 2. Test user: test@finapp.dev / password123
-- =============================================================================

do $$
declare
  _uid uuid;

  -- expense groups
  _g_essentials uuid;
  _g_lifestyle  uuid;
  _g_health     uuid;
  _g_financial  uuid;

  -- income group
  _g_income uuid;

  -- expense categories
  _c_groceries      uuid;
  _c_rent           uuid;
  _c_utilities      uuid;
  _c_transport      uuid;
  _c_dining         uuid;
  _c_entertainment  uuid;
  _c_subscriptions  uuid;
  _c_travel         uuid;
  _c_health         uuid;
  _c_fitness        uuid;
  _c_debt           uuid;

  -- income categories
  _c_salary   uuid;
  _c_freelance uuid;

  -- reminder IDs (for seeding paid occurrences)
  _r_monthly_rent      uuid;
  _r_student_loan      uuid;
  _r_laptop_insurance  uuid;

  -- today and current month helpers
  _today  date := current_date;
  _ym     text := to_char(current_date, 'YYYY-MM');
  _ym_prev text := to_char(current_date - interval '1 month', 'YYYY-MM');

begin
  -- -------------------------------------------------------
  -- Create auth user (triggers handle_new_user -> profile)
  -- -------------------------------------------------------
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(), 'authenticated', 'authenticated',
    'test@finapp.dev',
    extensions.crypt('password123', extensions.gen_salt('bf')),
    now(),
    '{"display_name": "Demo User"}'::jsonb,
    now(), now(),
    '', '', '', ''
  )
  returning id into _uid;

  -- Mark onboarding complete and set currency
  update public.profiles
  set currency = 'EUR',
      onboarding_completed_at = now(),
      onboarding_completed_steps = '["currency","categories","welcome"]'::jsonb
  where id = _uid;

  -- -------------------------------------------------------
  -- Category groups
  -- -------------------------------------------------------
  insert into public.category_groups (id, user_id, name, type, sort_order)
  values (gen_random_uuid(), _uid, 'Essentials',    'expense', 1)
  returning id into _g_essentials;

  insert into public.category_groups (id, user_id, name, type, sort_order)
  values (gen_random_uuid(), _uid, 'Lifestyle',     'expense', 2)
  returning id into _g_lifestyle;

  insert into public.category_groups (id, user_id, name, type, sort_order)
  values (gen_random_uuid(), _uid, 'Health & Growth','expense', 3)
  returning id into _g_health;

  insert into public.category_groups (id, user_id, name, type, sort_order)
  values (gen_random_uuid(), _uid, 'Financial',     'expense', 4)
  returning id into _g_financial;

  insert into public.category_groups (id, user_id, name, type, sort_order)
  values (gen_random_uuid(), _uid, 'Income',        'income',  5)
  returning id into _g_income;

  -- -------------------------------------------------------
  -- Expense categories
  -- -------------------------------------------------------
  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Groceries',      'shopping-cart', '#4a8c6f', 'expense', _g_essentials, 1)
  returning id into _c_groceries;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Rent & Housing', 'home',          '#5a7d8c', 'expense', _g_essentials, 2)
  returning id into _c_rent;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Utilities',      'zap',           '#c9a84c', 'expense', _g_essentials, 3)
  returning id into _c_utilities;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Transport',      'car',           '#6b8e7b', 'expense', _g_essentials, 4)
  returning id into _c_transport;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Dining Out',     'utensils',      '#c97b5e', 'expense', _g_lifestyle,  1)
  returning id into _c_dining;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Entertainment',  'film',          '#9a6fb0', 'expense', _g_lifestyle,  2)
  returning id into _c_entertainment;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Subscriptions',  'repeat',        '#5b9a82', 'expense', _g_lifestyle,  3)
  returning id into _c_subscriptions;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Travel',         'plane',         '#5a7d8c', 'expense', _g_lifestyle,  4)
  returning id into _c_travel;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Health & Medical','heart-pulse',   '#dc3545', 'expense', _g_health,     1)
  returning id into _c_health;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Fitness',        'dumbbell',      '#4a8c6f', 'expense', _g_health,     2)
  returning id into _c_fitness;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Debt Payment',   'banknote',      '#8b3a3a', 'expense', _g_financial,  1)
  returning id into _c_debt;

  -- -------------------------------------------------------
  -- Income categories
  -- -------------------------------------------------------
  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Salary',   'briefcase', '#2d4a3e', 'income', _g_income, 1)
  returning id into _c_salary;

  insert into public.categories (user_id, name, icon, color, type, group_id, sort_order)
  values (_uid, 'Freelance','laptop',    '#5b9a82', 'income', _g_income, 2)
  returning id into _c_freelance;

  -- -------------------------------------------------------
  -- Transactions — past 2 months + current month
  -- -------------------------------------------------------

  -- This month's income
  insert into public.transactions (user_id, category_id, amount, type, description, date) values
    (_uid, _c_salary,   3200, 'income',  'March salary',        _today - 5),
    (_uid, _c_freelance,  450, 'income',  'Logo design project', _today - 12),
    (_uid, _c_freelance,  180, 'income',  'Landing page edits',  _today - 3);

  -- This month's expenses
  insert into public.transactions (user_id, category_id, amount, type, description, date) values
    (_uid, _c_rent,          950,   'expense', 'Monthly rent',         _today - 1),
    (_uid, _c_groceries,      67.50, 'expense', 'Weekly groceries',     _today - 2),
    (_uid, _c_groceries,      42.30, 'expense', 'Fruit & vegetables',   _today - 9),
    (_uid, _c_groceries,      88.15, 'expense', 'Big shop',             _today - 16),
    (_uid, _c_groceries,      54.20, 'expense', 'Supermarket top-up',   _today - 5),
    (_uid, _c_utilities,      85,    'expense', 'Electricity bill',     _today - 3),
    (_uid, _c_utilities,      35,    'expense', 'Internet',             _today - 4),
    (_uid, _c_transport,      50,    'expense', 'Monthly bus pass',     _today - 1),
    (_uid, _c_transport,      18.75, 'expense', 'Ride-share',           _today - 7),
    (_uid, _c_dining,         28.50, 'expense', 'Pizza night',          _today - 6),
    (_uid, _c_dining,         15.90, 'expense', 'Coffee & pastry',      _today - 10),
    (_uid, _c_dining,         32.40, 'expense', 'Lunch with friends',   _today - 13),
    (_uid, _c_entertainment,  14.99, 'expense', 'Netflix',              _today - 1),
    (_uid, _c_entertainment,  22,    'expense', 'Cinema tickets',       _today - 11),
    (_uid, _c_subscriptions,  11.99, 'expense', 'Spotify Premium',      _today - 1),
    (_uid, _c_subscriptions,   9.99, 'expense', 'iCloud+',              _today - 1),
    (_uid, _c_travel,        120,    'expense', 'Weekend train tickets', _today - 4),
    (_uid, _c_travel,         34.50, 'expense', 'Airport transfer',      _today - 2),
    (_uid, _c_fitness,        45,    'expense', 'Gym membership',       _today - 1),
    (_uid, _c_health,         25,    'expense', 'Pharmacy',             _today - 8),
    (_uid, _c_health,         60,    'expense', 'Dental checkup',       _today - 14),
    (_uid, _c_debt,          200,    'expense', 'Student loan payment', _today - 1);

  -- Last month's transactions
  insert into public.transactions (user_id, category_id, amount, type, description, date) values
    (_uid, _c_salary,        3200, 'income',  'February salary',      (_today - interval '1 month')::date + 1),
    (_uid, _c_freelance,      300, 'income',  'Client retainer',      (_today - interval '1 month')::date + 8),
    (_uid, _c_rent,           950, 'expense', 'Monthly rent',         (_today - interval '1 month')::date + 1),
    (_uid, _c_groceries,     210,  'expense', 'Groceries (month)',    (_today - interval '1 month')::date + 5),
    (_uid, _c_utilities,     115,  'expense', 'Electricity + internet',(_today - interval '1 month')::date + 3),
    (_uid, _c_transport,      50,  'expense', 'Bus pass',             (_today - interval '1 month')::date + 1),
    (_uid, _c_dining,         52,  'expense', 'Restaurants',          (_today - interval '1 month')::date + 10),
    (_uid, _c_entertainment,  14.99,'expense', 'Netflix',             (_today - interval '1 month')::date + 1),
    (_uid, _c_subscriptions,  21.98,'expense', 'Spotify + iCloud',    (_today - interval '1 month')::date + 1),
    (_uid, _c_travel,         95,  'expense', 'Regional train',       (_today - interval '1 month')::date + 12),
    (_uid, _c_health,         38,  'expense', 'Optician',             (_today - interval '1 month')::date + 6),
    (_uid, _c_fitness,        45,  'expense', 'Gym membership',       (_today - interval '1 month')::date + 1),
    (_uid, _c_debt,          200,  'expense', 'Student loan payment', (_today - interval '1 month')::date + 1);

  -- Two months ago — sparser data
  insert into public.transactions (user_id, category_id, amount, type, description, date) values
    (_uid, _c_salary,   3200, 'income',  'January salary',       (_today - interval '2 months')::date + 1),
    (_uid, _c_freelance,  220, 'income',  'Copywriting project',  (_today - interval '2 months')::date + 9),
    (_uid, _c_rent,      950, 'expense', 'Monthly rent',         (_today - interval '2 months')::date + 1),
    (_uid, _c_groceries, 195, 'expense', 'Groceries (month)',    (_today - interval '2 months')::date + 7),
    (_uid, _c_transport,  48, 'expense', 'Metro card',           (_today - interval '2 months')::date + 2),
    (_uid, _c_dining,     36, 'expense', 'Lunches',              (_today - interval '2 months')::date + 12),
    (_uid, _c_utilities, 130, 'expense', 'Utilities',            (_today - interval '2 months')::date + 4),
    (_uid, _c_debt,      200, 'expense', 'Student loan payment', (_today - interval '2 months')::date + 1);

  -- -------------------------------------------------------
  -- Budget allocations (current + previous month)
  -- -------------------------------------------------------
  insert into public.category_budgets (category_id, user_id, year_month, amount) values
    (_c_groceries,     _uid, _ym,      250),
    (_c_rent,          _uid, _ym,      950),
    (_c_utilities,     _uid, _ym,      130),
    (_c_transport,     _uid, _ym,       60),
    (_c_dining,        _uid, _ym,       80),
    (_c_entertainment, _uid, _ym,       30),
    (_c_subscriptions, _uid, _ym,       25),
    (_c_fitness,       _uid, _ym,       50),
    (_c_health,        _uid, _ym,       50),
    (_c_debt,          _uid, _ym,      200);

  -- Previous month budgets (same amounts)
  insert into public.category_budgets (category_id, user_id, year_month, amount) values
    (_c_groceries,     _uid, _ym_prev, 250),
    (_c_rent,          _uid, _ym_prev, 950),
    (_c_utilities,     _uid, _ym_prev, 130),
    (_c_transport,     _uid, _ym_prev,  60),
    (_c_dining,        _uid, _ym_prev,  80),
    (_c_entertainment, _uid, _ym_prev,  30),
    (_c_subscriptions, _uid, _ym_prev,  25),
    (_c_fitness,       _uid, _ym_prev,  50),
    (_c_debt,          _uid, _ym_prev, 200);

  -- Income targets
  insert into public.monthly_income_targets (user_id, year_month, amount) values
    (_uid, _ym,      3500),
    (_uid, _ym_prev, 3200);

  -- -------------------------------------------------------
  -- Reminders (mix of paid, overdue, recurring, one-time)
  -- -------------------------------------------------------
  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id, auto_create_transaction)
  values (_uid, 'Monthly Rent', 950, (_today - 2)::date, 'monthly', _c_rent, true)
  returning id into _r_monthly_rent;

  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id, auto_create_transaction) values
    (_uid, 'Gym Membership',            45, (_today + 5)::date,  'monthly',  _c_fitness,       true),
    (_uid, 'Netflix',                14.99, (_today - 7)::date,  'monthly',  _c_entertainment, false),
    (_uid, 'Spotify Premium',        11.99, (_today + 12)::date, 'monthly',  _c_subscriptions, false);

  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id, auto_create_transaction)
  values (_uid, 'Student Loan', 200, (_today - 1)::date, 'monthly', _c_debt, true)
  returning id into _r_student_loan;

  insert into public.reminders (user_id, title, amount, due_date, frequency, category_id, auto_create_transaction) values
    (_uid, 'Annual Insurance',         480, (_today + 45)::date, 'yearly',   _c_health,        true),
    (_uid, 'Weekly Groceries',          65, (_today - 3)::date,  'weekly',   _c_groceries,     false),
    (_uid, 'Laptop Insurance Top-up',  120, (_today - 5)::date,  'one_time', _c_health,        false),
    (_uid, 'Passport Renewal',         160, (_today - 20)::date, 'one_time', _c_debt,          false),
    (_uid, 'Concert Tickets',           85, (_today + 14)::date, 'one_time', _c_entertainment, false);

  select id
  into _r_laptop_insurance
  from public.reminders
  where user_id = _uid and title = 'Laptop Insurance Top-up'
  limit 1;

  -- Mark some occurrences paid
  insert into public.reminder_payments (reminder_id, user_id, due_date, paid_at) values
    (_r_monthly_rent,     _uid, (_today - 2)::date, now() - interval '1 day'),
    (_r_student_loan,     _uid, (_today - 1)::date, now() - interval '12 hours'),
    (_r_laptop_insurance, _uid, (_today - 5)::date, now() - interval '4 days');

  -- -------------------------------------------------------
  -- Debts
  -- -------------------------------------------------------
  insert into public.debts (user_id, counterparty, type, original_amount, remaining_amount, description) values
    (_uid, 'Student Finance',  'i_owe',   12000, 11400, 'Undergraduate student loan'),
    (_uid, 'Marcus',           'they_owe',   150,   150, 'Dinner + concert tickets from last month');

end;
$$;
