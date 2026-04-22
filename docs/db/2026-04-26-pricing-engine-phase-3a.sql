-- ════════════════════════════════════════════════════════════════════
--  Pricing engine — Phase 3A foundation
--
--  Four admin-editable tables that expose the hardcoded pricing
--  knobs from src/lib/commercialQuote.ts for in-DB configuration:
--    1. pricing_global_settings     — scalars (labour cost, weeks/month)
--    2. pricing_margin_tiers        — commercial margin tier ranges
--    3. pricing_sector_multipliers  — sector labour-time multiplier
--    4. pricing_traffic_multipliers — traffic-level labour-time multiplier
--
--  Read access: staff (non-contractors) — so the quote form can load them.
--  Write access: admin only (michael@sano.nz, existing pattern).
--
--  Safe + idempotent: every statement can be re-run.
--  Backward-compatible: the seed values match the current hardcoded
--  constants exactly, so immediately after this migration lands the
--  computed pricing is byte-identical to before.
--  Forward-compatible: src/lib/pricingSettings.ts falls back to the
--  in-code constants when any row is missing, so the tables can even
--  be emptied without breaking pricing.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. pricing_global_settings ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_global_settings (
  key           text         PRIMARY KEY,
  value_numeric numeric      NOT NULL,
  description   text,
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  updated_by    uuid         REFERENCES auth.users(id)
);

ALTER TABLE public.pricing_global_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_global_settings staff read"
  ON public.pricing_global_settings;
CREATE POLICY "pricing_global_settings staff read"
  ON public.pricing_global_settings
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "pricing_global_settings admin write"
  ON public.pricing_global_settings;
CREATE POLICY "pricing_global_settings admin write"
  ON public.pricing_global_settings
  FOR ALL TO authenticated
  USING      ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz')
  WITH CHECK ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz');

-- ── 2. pricing_margin_tiers ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_margin_tiers (
  tier          text         PRIMARY KEY,
  label         text         NOT NULL,
  min_pct       numeric      NOT NULL,
  max_pct       numeric      NOT NULL,
  default_pct   numeric      NOT NULL,
  display_order int          NOT NULL DEFAULT 0,
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  updated_by    uuid         REFERENCES auth.users(id)
);

DO $$ BEGIN
  ALTER TABLE public.pricing_margin_tiers
    ADD CONSTRAINT pricing_margin_tiers_tier_check
    CHECK (tier IN ('win_the_work','standard','premium','specialist'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pricing_margin_tiers
    ADD CONSTRAINT pricing_margin_tiers_values_check
    CHECK (min_pct > 0
       AND max_pct < 1
       AND min_pct <= default_pct
       AND default_pct <= max_pct);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pricing_margin_tiers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_margin_tiers staff read"
  ON public.pricing_margin_tiers;
CREATE POLICY "pricing_margin_tiers staff read"
  ON public.pricing_margin_tiers
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "pricing_margin_tiers admin write"
  ON public.pricing_margin_tiers;
CREATE POLICY "pricing_margin_tiers admin write"
  ON public.pricing_margin_tiers
  FOR ALL TO authenticated
  USING      ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz')
  WITH CHECK ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz');

-- ── 3. pricing_sector_multipliers ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_sector_multipliers (
  sector_category text         PRIMARY KEY,
  multiplier      numeric      NOT NULL,
  updated_at      timestamptz  NOT NULL DEFAULT now(),
  updated_by      uuid         REFERENCES auth.users(id)
);

DO $$ BEGIN
  ALTER TABLE public.pricing_sector_multipliers
    ADD CONSTRAINT pricing_sector_multipliers_category_check
    CHECK (sector_category IN ('office','education','medical','industrial','mixed_use','custom'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pricing_sector_multipliers
    ADD CONSTRAINT pricing_sector_multipliers_value_check
    CHECK (multiplier > 0 AND multiplier < 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pricing_sector_multipliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_sector_multipliers staff read"
  ON public.pricing_sector_multipliers;
CREATE POLICY "pricing_sector_multipliers staff read"
  ON public.pricing_sector_multipliers
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "pricing_sector_multipliers admin write"
  ON public.pricing_sector_multipliers;
CREATE POLICY "pricing_sector_multipliers admin write"
  ON public.pricing_sector_multipliers
  FOR ALL TO authenticated
  USING      ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz')
  WITH CHECK ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz');

-- ── 4. pricing_traffic_multipliers ─────────────────────────────────
CREATE TABLE IF NOT EXISTS public.pricing_traffic_multipliers (
  traffic_level text         PRIMARY KEY,
  multiplier    numeric      NOT NULL,
  updated_at    timestamptz  NOT NULL DEFAULT now(),
  updated_by    uuid         REFERENCES auth.users(id)
);

DO $$ BEGIN
  ALTER TABLE public.pricing_traffic_multipliers
    ADD CONSTRAINT pricing_traffic_multipliers_level_check
    CHECK (traffic_level IN ('low','medium','high'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.pricing_traffic_multipliers
    ADD CONSTRAINT pricing_traffic_multipliers_value_check
    CHECK (multiplier > 0 AND multiplier < 5);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.pricing_traffic_multipliers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "pricing_traffic_multipliers staff read"
  ON public.pricing_traffic_multipliers;
CREATE POLICY "pricing_traffic_multipliers staff read"
  ON public.pricing_traffic_multipliers
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "pricing_traffic_multipliers admin write"
  ON public.pricing_traffic_multipliers;
CREATE POLICY "pricing_traffic_multipliers admin write"
  ON public.pricing_traffic_multipliers
  FOR ALL TO authenticated
  USING      ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz')
  WITH CHECK ((SELECT auth.jwt() ->> 'email') = 'michael@sano.nz');

-- ════════════════════════════════════════════════════════════════════
--  Seed data — values match the current hardcoded constants in
--  src/lib/commercialQuote.ts exactly.  ON CONFLICT DO NOTHING keeps
--  this idempotent: re-running the migration never overwrites live
--  admin edits.
-- ════════════════════════════════════════════════════════════════════

INSERT INTO public.pricing_global_settings (key, value_numeric, description) VALUES
  ('labour_cost_basis_default', 45,   'Default $/hr used when commercial_quote_details.labour_cost_basis is not set'),
  ('weeks_per_month',           4.33, 'Conversion factor: weekly hours × weeks_per_month = monthly hours')
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.pricing_margin_tiers (tier, label, min_pct, max_pct, default_pct, display_order) VALUES
  ('win_the_work', 'Win the work',           0.15, 0.20, 0.18, 1),
  ('standard',     'Standard',               0.22, 0.28, 0.25, 2),
  ('premium',      'Premium',                0.30, 0.38, 0.34, 3),
  ('specialist',   'Specialist / high-risk', 0.35, 0.50, 0.40, 4)
ON CONFLICT (tier) DO NOTHING;

INSERT INTO public.pricing_sector_multipliers (sector_category, multiplier) VALUES
  ('office',     1.00),
  ('education',  1.05),
  ('medical',    1.20),
  ('industrial', 1.15),
  ('mixed_use',  1.05),
  ('custom',     1.00)
ON CONFLICT (sector_category) DO NOTHING;

INSERT INTO public.pricing_traffic_multipliers (traffic_level, multiplier) VALUES
  ('low',    1.00),
  ('medium', 1.05),
  ('high',   1.10)
ON CONFLICT (traffic_level) DO NOTHING;

-- ── Table comments (safe to re-run) ─────────────────────────────────
COMMENT ON TABLE public.pricing_global_settings     IS 'Phase 3A: scalar pricing knobs (labour cost, weeks per month).';
COMMENT ON TABLE public.pricing_margin_tiers        IS 'Phase 3A: commercial margin tier ranges used by computeCommercialPreview.';
COMMENT ON TABLE public.pricing_sector_multipliers  IS 'Phase 3A: sector-category labour-time multiplier.';
COMMENT ON TABLE public.pricing_traffic_multipliers IS 'Phase 3A: traffic-level labour-time multiplier.';
