-- Full book text moves out of the repo into a private table.
-- No anon/authenticated grants: only server-side service_role code reads it,
-- so a clone of the public repo no longer contains the book.
CREATE TABLE public.book_sections (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL DEFAULT 'et-EE',
  ord INTEGER NOT NULL,
  kind TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT '',
  title TEXT NOT NULL DEFAULT '',
  page INTEGER NOT NULL DEFAULT 0,
  words INTEGER NOT NULL DEFAULT 0,
  blocks JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.book_sections TO service_role;
ALTER TABLE public.book_sections ENABLE ROW LEVEL SECURITY;

-- No policy for anon or authenticated: the Data API cannot reach this table at all.
CREATE POLICY "service role only" ON public.book_sections FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_book_sections_ord ON public.book_sections (ord);