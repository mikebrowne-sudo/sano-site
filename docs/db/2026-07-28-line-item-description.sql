-- ============================================================================
-- Add optional `description` to quote + invoice line items
-- ----------------------------------------------------------------------------
-- Gives custom priced lines (skip bins, disposal, materials, etc.) an optional
-- description underneath the name — parity with the spec's minimum line fields.
-- Additive + idempotent. No existing rows change; new column defaults to NULL.
-- Safe to run more than once.
-- ============================================================================

-- ── Read-only preflight (confirm the columns don't already exist) ───────────
select table_name, column_name
from information_schema.columns
where table_name in ('quote_items', 'invoice_items')
  and column_name = 'description';
-- Expected before running: 0 rows.

begin;

alter table public.quote_items   add column if not exists description text;
alter table public.invoice_items add column if not exists description text;

commit;

-- ── Read-only verification (expect 2 rows: quote_items + invoice_items) ──────
select table_name, column_name, data_type, is_nullable
from information_schema.columns
where table_name in ('quote_items', 'invoice_items')
  and column_name = 'description'
order by table_name;
-- Expected: quote_items | description | text | YES
--           invoice_items | description | text | YES

-- ── Rollback (commented — only if you need to reverse) ──────────────────────
-- begin;
--   alter table public.quote_items   drop column if exists description;
--   alter table public.invoice_items drop column if exists description;
-- commit;
