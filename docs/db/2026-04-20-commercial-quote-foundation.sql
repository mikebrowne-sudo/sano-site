-- Commercial Quote Engine — Foundation (Phase 0)
-- Adds the data backbone for the upgraded commercial quote flow:
--   1. commercial_quote_details  — 1:1 with quotes (commercial-only extra fields)
--   2. commercial_scope_items    — 1:N with quotes (structured scope rows)
--   3. quotes.deleted_at / deleted_by  — soft-delete columns
--   4. commercial_calculations.quote_id — FK linking pricing snapshots to quotes
--
-- Forward-only, idempotent. Run via Supabase dashboard SQL editor.
--
-- Prerequisite infrastructure (is_contractor + audit_log + record_snapshots)
-- is created idempotently at the top of this file so this migration is
-- self-contained. If those objects already exist (from an earlier partial
-- run or a separate audit-log migration), every statement is a safe no-op.

-- ══════════════════════════════════════════════════════════════════
-- 0. Prerequisite infrastructure (idempotent)
-- ══════════════════════════════════════════════════════════════════

-- is_contractor() helper — used by staff-vs-contractor RLS policies.
-- SECURITY DEFINER + pinned search_path so search_path manipulation
-- cannot subvert it. Reads auth.uid() and public.contractors only.
CREATE OR REPLACE FUNCTION public.is_contractor()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.contractors
    WHERE auth_user_id = auth.uid()
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_contractor() TO authenticated;

-- audit_log — append-only trail of sensitive mutations (price overrides,
-- soft-deletes, status transitions, etc.).
CREATE TABLE IF NOT EXISTS public.audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role    text,
  action        text NOT NULL,
  entity_table  text NOT NULL,
  entity_id     uuid,
  before        jsonb,
  after         jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON public.audit_log (entity_table, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor
  ON public.audit_log (actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action
  ON public.audit_log (action, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_log read for staff" ON public.audit_log;
CREATE POLICY "audit_log read for staff"
  ON public.audit_log
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "audit_log insert for authenticated" ON public.audit_log;
CREATE POLICY "audit_log insert for authenticated"
  ON public.audit_log
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- record_snapshots — point-in-time JSONB copy of a row taken BEFORE a
-- sensitive mutation, so pre-mutation state can be reconstructed.
CREATE TABLE IF NOT EXISTS public.record_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_table  text NOT NULL,
  entity_id     uuid NOT NULL,
  reason        text NOT NULL,
  snapshot      jsonb NOT NULL,
  created_by    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_record_snapshots_entity
  ON public.record_snapshots (entity_table, entity_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_record_snapshots_reason
  ON public.record_snapshots (reason, created_at DESC);

ALTER TABLE public.record_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "record_snapshots read for staff" ON public.record_snapshots;
CREATE POLICY "record_snapshots read for staff"
  ON public.record_snapshots
  FOR SELECT TO authenticated
  USING (NOT public.is_contractor());

DROP POLICY IF EXISTS "record_snapshots insert for authenticated" ON public.record_snapshots;
CREATE POLICY "record_snapshots insert for authenticated"
  ON public.record_snapshots
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ══════════════════════════════════════════════════════════════════
-- 1. quotes — soft-delete columns
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL REFERENCES auth.users(id) ON DELETE SET NULL;

-- Partial index: almost all quotes are active (deleted_at IS NULL), so
-- this gives "active quotes" queries an efficient index path.
CREATE INDEX IF NOT EXISTS idx_quotes_active
  ON public.quotes (created_at DESC) WHERE deleted_at IS NULL;

-- ══════════════════════════════════════════════════════════════════
-- 2. commercial_calculations — link to quote for pricing-history
-- ══════════════════════════════════════════════════════════════════

ALTER TABLE public.commercial_calculations
  ADD COLUMN IF NOT EXISTS quote_id uuid NULL
    REFERENCES public.quotes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_commercial_calculations_quote_id
  ON public.commercial_calculations (quote_id, created_at DESC)
  WHERE quote_id IS NOT NULL;

-- ══════════════════════════════════════════════════════════════════
-- 3. commercial_quote_details — 1:1 with quotes (commercial-only)
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commercial_quote_details (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                    uuid NOT NULL UNIQUE
    REFERENCES public.quotes(id) ON DELETE CASCADE,

  -- Universal commercial fields
  sector_category             text NOT NULL,        -- office | education | medical | industrial | mixed_use | custom
  sector_subtype              text NULL,
  building_type               text NULL,
  service_days                text[] NULL,          -- e.g. ['mon','tue','wed','thu','fri']
  service_window              text NULL,            -- e.g. '17:00-22:00'
  access_requirements         text NULL,
  consumables_by              text NULL,            -- sano | client | shared
  occupancy_level             text NULL,            -- low | medium | high
  traffic_level               text NULL,            -- low | medium | high
  total_area_m2               numeric NULL,
  carpet_area_m2              numeric NULL,
  hard_floor_area_m2          numeric NULL,
  floor_count                 integer NULL,
  toilets_count               integer NULL,
  urinals_count               integer NULL,
  showers_count               integer NULL,
  basins_count                integer NULL,
  kitchens_count              integer NULL,
  desks_count                 integer NULL,
  offices_count               integer NULL,
  meeting_rooms_count         integer NULL,
  reception_count             integer NULL,
  corridors_stairs_notes      text NULL,
  external_glass_notes        text NULL,
  compliance_notes            text NULL,
  assumptions                 text NULL,
  exclusions                  text NULL,

  -- Sector-specific field pack (schema-less, keyed by SECTOR_FIELD_PACKS config)
  sector_fields               jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Pricing preview summary (lightweight snapshot; full calc lives in commercial_calculations)
  selected_margin_tier        text NULL,            -- win_the_work | standard | premium | specialist
  labour_cost_basis           numeric NULL,
  estimated_service_hours     numeric NULL,
  estimated_weekly_hours      numeric NULL,
  estimated_monthly_hours     numeric NULL,

  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_quote_details_sector_category
  ON public.commercial_quote_details (sector_category);

ALTER TABLE public.commercial_quote_details ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercial_quote_details staff full access"
  ON public.commercial_quote_details;
CREATE POLICY "commercial_quote_details staff full access"
  ON public.commercial_quote_details
  FOR ALL TO authenticated
  USING (NOT public.is_contractor())
  WITH CHECK (NOT public.is_contractor());

-- ══════════════════════════════════════════════════════════════════
-- 4. commercial_scope_items — 1:N with quotes
-- ══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.commercial_scope_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id        uuid NOT NULL
    REFERENCES public.quotes(id) ON DELETE CASCADE,

  area_type       text NULL,             -- e.g. 'Ground floor offices', 'Bathrooms', 'Carpark'
  task_group      text NULL,             -- e.g. 'Floor care', 'Washroom', 'Surface'
  task_name       text NOT NULL,         -- e.g. 'Vacuum', 'Toilet clean', 'High dust'

  frequency       text NULL,             -- per_visit | daily | weekly | fortnightly | monthly | quarterly | six_monthly | annual | as_required
  quantity_type   text NULL,             -- area_m2 | fixture_count | linear_m | time_minutes | none
  quantity_value  numeric NULL,
  unit_minutes    numeric NULL,          -- minutes per unit (set one OR production_rate, not both)
  production_rate numeric NULL,          -- units per hour

  included        boolean NOT NULL DEFAULT true,
  notes           text NULL,
  display_order   integer NOT NULL DEFAULT 0,

  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_scope_items_quote_order
  ON public.commercial_scope_items (quote_id, display_order);

ALTER TABLE public.commercial_scope_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "commercial_scope_items staff full access"
  ON public.commercial_scope_items;
CREATE POLICY "commercial_scope_items staff full access"
  ON public.commercial_scope_items
  FOR ALL TO authenticated
  USING (NOT public.is_contractor())
  WITH CHECK (NOT public.is_contractor());
