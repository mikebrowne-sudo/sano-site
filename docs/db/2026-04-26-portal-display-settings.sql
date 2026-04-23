-- ════════════════════════════════════════════════════════════════════
--  Portal display settings — Phase 2 foundation
--
--  Single key/value/jsonb table for global presentation settings
--  (which fields show in lists, default sort order, primary/secondary
--  display field, etc.). Designed to expand later to per-user or
--  per-region overrides without a schema change — additional rows
--  with namespaced keys (e.g. 'display:user:<uuid>') will work.
--
--  Read: staff (non-contractors). Write: admin only (michael@sano.nz),
--  matches the established pricing_*  RLS pattern.
--
--  Safe + idempotent. The app falls back to in-code defaults when no
--  row exists, so this migration is non-destructive on first run.
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.portal_settings (
  key         text         PRIMARY KEY,
  value       jsonb        NOT NULL DEFAULT '{}'::jsonb,
  updated_at  timestamptz  NOT NULL DEFAULT now(),
  updated_by  uuid         REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.portal_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "portal_settings staff read" ON public.portal_settings;
CREATE POLICY "portal_settings staff read"
  ON public.portal_settings
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "portal_settings admin write" ON public.portal_settings;
CREATE POLICY "portal_settings admin write"
  ON public.portal_settings
  FOR ALL TO authenticated
  USING      ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz')
  WITH CHECK ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz');

COMMENT ON TABLE  public.portal_settings IS 'Phase 2: global portal presentation settings keyed by string. Currently uses the single key "display"; future rows may namespace per user/region.';
COMMENT ON COLUMN public.portal_settings.key   IS 'Settings key — currently always "display".';
COMMENT ON COLUMN public.portal_settings.value IS 'Settings JSON. Validated server-side before write; loader merges with code defaults on read.';
