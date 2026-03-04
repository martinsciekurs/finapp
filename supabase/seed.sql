-- Seed data — default banner presets
-- =============================================================================
-- NOTE: Categories are NOT seeded here. They are created per-user during
-- the onboarding flow.

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
