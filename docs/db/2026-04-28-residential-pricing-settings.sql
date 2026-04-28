-- Phase: time-based residential pricing engine.
--
-- 1. Singleton jsonb table for residential pricing knobs. Mirrors
--    workforce_settings + job_settings shape so the loader pattern
--    is reused. RLS: staff read, admin (michael@sano.nz) write.
-- 2. quotes.override_hours — optional numeric, feeds allowed_hours
--    when override is active.
-- Idempotent.

CREATE TABLE IF NOT EXISTS public.pricing_residential_settings (
  key         text  PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  updated_by  uuid REFERENCES auth.users(id)
);

INSERT INTO public.pricing_residential_settings (key, value)
VALUES ('default', '{}'::jsonb)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.pricing_residential_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_residential_settings read for authenticated"
  ON public.pricing_residential_settings;
CREATE POLICY "pricing_residential_settings read for authenticated"
  ON public.pricing_residential_settings
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "pricing_residential_settings write for admin"
  ON public.pricing_residential_settings;
CREATE POLICY "pricing_residential_settings write for admin"
  ON public.pricing_residential_settings
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'michael@sano.nz')
  WITH CHECK (auth.jwt() ->> 'email' = 'michael@sano.nz');

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS override_hours numeric;

COMMENT ON COLUMN public.quotes.override_hours IS
  'Operator-set hours when an admin overrides the calculated time. NULL when the calculated estimate is accepted as-is.';
