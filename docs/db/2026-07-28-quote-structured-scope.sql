-- ============================================================================
-- Add `structured_scope` (JSONB) to quotes — Full Property Reset scope format
-- ----------------------------------------------------------------------------
-- Optional, additive. NULL on every existing quote → they keep rendering the
-- existing free-text `generated_scope` unchanged. When present, the quote
-- renders the structured Full Property Reset layout (title, intro, sections,
-- completion, important notes, exclusions, expected duration — all inside the
-- one JSON blob). Descriptive only: pricing/GST/line-items are untouched.
-- Idempotent + safe to run more than once.
-- ============================================================================

-- ── Read-only preflight (expect 0 rows) ────────────────────────────────────
select column_name
from information_schema.columns
where table_name = 'quotes' and column_name = 'structured_scope';

begin;

alter table public.quotes
  add column if not exists structured_scope jsonb;

commit;

-- ── Read-only verification (expect 1 row: structured_scope | jsonb | YES) ───
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'quotes' and column_name = 'structured_scope';

-- ── Rollback (commented — only if you need to reverse) ──────────────────────
-- begin;
--   alter table public.quotes drop column if exists structured_scope;
-- commit;
