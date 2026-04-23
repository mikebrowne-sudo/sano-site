-- ════════════════════════════════════════════════════════════════════
--  Proposal Settings — Phase 2 (proposal content + commercial defaults)
--
--  Single key/value/jsonb table for editable proposal content
--  (executive summary default, terms HTML, footer contact, section
--  toggles, pricing suffixes, etc.). Designed so future scoped
--  overrides (per-region, per-client) can land as additional
--  namespaced rows without a schema change.
--
--  Read: staff (non-contractors). Write: admin only (michael@sano.nz),
--  matches the established pricing_* + portal_settings RLS pattern.
--
--  Safe + idempotent. The app falls back to in-code defaults when
--  no row exists, so this migration is non-destructive on first run.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.proposal_settings (
  key         text         PRIMARY KEY,
  value       jsonb        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  updated_by  uuid         REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.proposal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proposal_settings staff read" ON public.proposal_settings;
CREATE POLICY "proposal_settings staff read"
  ON public.proposal_settings
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "proposal_settings admin write" ON public.proposal_settings;
CREATE POLICY "proposal_settings admin write"
  ON public.proposal_settings
  FOR ALL TO authenticated
  USING      ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz')
  WITH CHECK ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz');

COMMENT ON TABLE  public.proposal_settings IS 'Phase 2: editable proposal content + commercial defaults. Currently uses single key "default"; future rows may namespace per region/client.';
COMMENT ON COLUMN public.proposal_settings.key   IS 'Settings key — currently always "default".';
COMMENT ON COLUMN public.proposal_settings.value IS 'Settings JSON. Validated server-side on write; loader merges with code defaults on read.';
