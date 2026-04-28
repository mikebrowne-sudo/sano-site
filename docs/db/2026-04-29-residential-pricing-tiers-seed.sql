-- Phase residential-pricing-tiers: extend the seeded
-- pricing_residential_settings row with explicit per-tier rates +
-- default_pricing_tier. JSONB merge is idempotent and additive — does
-- not touch any other key.
--
-- Defaults:
--   win  = $70/hr
--   std  = $75/hr
--   prem = $80/hr
--   default tier = 'standard'

UPDATE public.pricing_residential_settings
SET value = value || jsonb_build_object(
  'win_hourly_rate',      70,
  'standard_hourly_rate', 75,
  'premium_hourly_rate',  80,
  'default_pricing_tier', 'standard'
),
    updated_at = now()
WHERE key = 'default';
