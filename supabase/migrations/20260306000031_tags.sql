-- 031: Tags & Transaction-Tags tables
-- =============================================================================

-- ──────────────────────────────────────────────
-- Tags table
-- ──────────────────────────────────────────────
CREATE TABLE public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (char_length(btrim(name)) > 0 AND char_length(name) <= 30),
  color TEXT NOT NULL CHECK (color ~ '^#[0-9a-fA-F]{6}$'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Case-insensitive unique per user
CREATE UNIQUE INDEX idx_tags_user_name ON public.tags (user_id, lower(btrim(name)));

-- Updated_at trigger (reuses existing function)
CREATE TRIGGER set_tags_updated_at BEFORE UPDATE ON public.tags
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tags" ON public.tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.tags FOR DELETE USING (auth.uid() = user_id);

-- Index for lookups
CREATE INDEX idx_tags_user_id ON public.tags (user_id);

-- ──────────────────────────────────────────────
-- Transaction-Tag junction table
-- ──────────────────────────────────────────────
CREATE TABLE public.transaction_tags (
  transaction_id UUID NOT NULL,
  tag_id UUID NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (transaction_id, tag_id),
  FOREIGN KEY (transaction_id, user_id) REFERENCES public.transactions (id, user_id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES public.tags (id) ON DELETE CASCADE
);

-- RLS (no UPDATE policy — assignments are add/remove only)
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transaction_tags" ON public.transaction_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transaction_tags" ON public.transaction_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own transaction_tags" ON public.transaction_tags FOR DELETE USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_transaction_tags_tag_id ON public.transaction_tags (tag_id);
CREATE INDEX idx_transaction_tags_user_id ON public.transaction_tags (user_id);
