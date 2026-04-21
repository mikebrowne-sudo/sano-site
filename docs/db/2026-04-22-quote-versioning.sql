-- Quote versioning — lightweight version tracking + snapshots
--
-- Adds a per-quote version counter (v1, v2, v3...) to the quotes table
-- and a quote_versions snapshot table that holds the row state BEFORE
-- each update. Not a full audit log — just enough to:
--   * show "v2" on the quote
--   * surface "this quote has been revised"
--   * support rollback / proposal-snapshot lookups later
--
-- Forward-only, idempotent. Run via Supabase dashboard SQL editor.

-- ══════════════════════════════════════════════════════════════════
-- 1. quotes — version columns
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS version              integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS version_created_at   timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS version_note         text NULL;

-- Existing quote rows get version=1 by default. Any future updateQuote
-- call will snapshot the current row before bumping the version, so
-- legacy quotes naturally enter the versioned flow on first edit.

-- ══════════════════════════════════════════════════════════════════
-- 2. quote_versions — snapshots taken BEFORE each update
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.quote_versions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id    uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  version     integer NOT NULL,                            -- the OLD version that was snapshotted
  snapshot    jsonb NOT NULL,                              -- full quote row + items
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Lookup pattern: WHERE quote_id = ? ORDER BY version DESC (most recent
-- snapshot first). Combined index supports both that lookup and the
-- "give me snapshot of version N" lookup.
CREATE INDEX IF NOT EXISTS idx_quote_versions_quote_version
  ON public.quote_versions (quote_id, version DESC);

ALTER TABLE public.quote_versions ENABLE ROW LEVEL SECURITY;

-- Mirrors the audit_log pattern: staff can read; contractors cannot;
-- any authenticated session can insert (the updateQuote server action
-- runs under the user's session and is the only writer).

DROP POLICY IF EXISTS "quote_versions read for staff" ON public.quote_versions;
CREATE POLICY "quote_versions read for staff"
  ON public.quote_versions
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "quote_versions insert for authenticated" ON public.quote_versions;
CREATE POLICY "quote_versions insert for authenticated"
  ON public.quote_versions
  FOR INSERT TO authenticated
  WITH CHECK (true);
