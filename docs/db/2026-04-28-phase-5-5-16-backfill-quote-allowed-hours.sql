-- Phase 5.5.16 — backfill quotes.allowed_hours from estimated_hours.
--
-- The column already exists on the schema; it's just been NULL for
-- every legacy row because nothing was setting it. Phase 5.5.16
-- promotes allowed_hours to first-class quote-time information so
-- the job-setup wizard inherits it instead of asking for it again.
--
-- Idempotent — only fills rows where allowed_hours IS NULL.

UPDATE public.quotes
SET allowed_hours = estimated_hours
WHERE allowed_hours IS NULL
  AND estimated_hours IS NOT NULL;
