-- Phase residential-pricing-tweaks: seed pricing_residential_settings
-- with the full default object so the admin UI shows populated values
-- instead of relying on per-key fallback. Includes two normalisations:
--   - average_condition multiplier 1.10 → 1.00 (neutral, not uplift)
--   - airbnb.turnover service multiplier 0.9 → 1.0 (no auto-discount)
-- Idempotent: replaces the singleton row's `value` jsonb. Pre-existing
-- value was `{}` (relying on fallback); after this seed the table
-- holds the full object. The loader's per-key fallback still applies
-- defensively for any future malformed row.

UPDATE public.pricing_residential_settings
SET value = '{
  "default_hourly_rate": 75,
  "service_fee": 25,
  "minimum_job_hours": 2.0,
  "buffer_standard": 0.05,
  "buffer_heavy": 0.08,
  "heavy_buffer_service_types": ["deep_clean","move_in_out","end_of_tenancy","deep_reset","post_construction"],
  "rounding_step_hours": 0.5,
  "base_hours_by_bedroom": {"1":2.0,"2":2.75,"3":3.5,"4":5.0,"5":6.0,"6":7.5,"7":9.0},
  "bathroom_extra_hours": 0.5,
  "high_use_extra_hours": 0.5,
  "service_multipliers": {
    "residential.standard_clean":1.0,
    "residential.deep_clean":1.6,
    "residential.move_in_out":1.65,
    "residential.pre_sale":1.2,
    "residential.post_construction":1.5,
    "property_management.routine":1.0,
    "property_management.end_of_tenancy":1.65,
    "property_management.pre_inspection":1.2,
    "property_management.handover":1.2,
    "airbnb.turnover":1.0,
    "airbnb.deep_reset":1.25
  },
  "condition_multipliers": {
    "average_condition":1.00,
    "build_up_present":1.20,
    "furnished_property":1.10,
    "recently_renovated":1.20,
    "inspection_focus":1.10
  },
  "condition_multiplier_cap": 1.45,
  "addon_hours": {
    "oven_clean":1.0,"fridge_clean":0.5,"interior_window":1.0,"wall_spot_cleaning":0.75,
    "carpet_cleaning":0.5,"spot_treatment":0.5,"mould_treatment":1.5,
    "upholstery_cleaning":1.0,"exterior_window":0.75,"pressure_washing":1.5,
    "rubbish_removal":0.75,"garage_full":2.0,
    "inside_cupboards":1.5,"inside_wardrobes":1.0,"blinds_shutters":1.0,
    "full_wall_wash":2.0,"high_dusting":0.75,"balcony_deck":0.75,
    "heavy_grease":1.5,"post_construction_residue":2.0
  }
}'::jsonb,
    updated_at = now()
WHERE key = 'default';
