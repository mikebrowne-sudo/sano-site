-- ════════════════════════════════════════════════════════════════════
--  Commercial scope items — input_mode column (Phase 2)
--
--  Persists the UI-only input_mode that Phase 1 introduced as a
--  derived field. Values:
--    measured   → quantity × unit_minutes
--    time_based → 1 × unit_minutes (fixed time per visit)
--
--  Safe + idempotent: can be run multiple times on the same DB.
--  Forward-compatible: Phase 1 clients still work after this lands
--  because the NOT NULL DEFAULT backfills any omitted column on insert.
-- ════════════════════════════════════════════════════════════════════

-- 1. Add the column with a safe default. Idempotent via IF NOT EXISTS.
ALTER TABLE public.commercial_scope_items
  ADD COLUMN IF NOT EXISTS input_mode text NOT NULL DEFAULT 'measured';

-- 2. Constrain the allowed values. Idempotent via DO block
--    (CHECK constraints don't support IF NOT EXISTS in all pg versions).
DO $$
BEGIN
  ALTER TABLE public.commercial_scope_items
    ADD CONSTRAINT commercial_scope_items_input_mode_check
    CHECK (input_mode IN ('measured', 'time_based'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 3. One-time backfill for legacy rows that used production_rate only.
--    Mirrors the Phase 1 client-side hydration heuristic:
--      unit_minutes set            → measured   (default already applied)
--      only production_rate set    → time_based
--      both set or neither set     → measured   (default already applied)
--    Idempotent — re-running the UPDATE yields the same assignment.
UPDATE public.commercial_scope_items
   SET input_mode = 'time_based'
 WHERE input_mode = 'measured'
   AND (unit_minutes IS NULL OR unit_minutes <= 0)
   AND production_rate IS NOT NULL
   AND production_rate > 0;

-- 4. Column comment for future readers (safe to re-run).
COMMENT ON COLUMN public.commercial_scope_items.input_mode IS
  'measured: quantity × unit_minutes; time_based: 1 × unit_minutes (fixed time per visit)';
