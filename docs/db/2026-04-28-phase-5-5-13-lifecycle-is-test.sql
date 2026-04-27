-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.13 — operational lifecycle: is_test flag.
--
--  Adds `is_test` to quotes / jobs / invoices so live operational
--  views can exclude trial / demo / one-off test records without
--  losing them. Archive continues to use the existing `deleted_at`
--  column on each table (introduced Phase 6).
--
--  Live record rule applied across the portal:
--    deleted_at IS NULL AND is_test = false
--
--  Default for new rows is `false` so existing flows are unaffected.
--  Operators flip the flag via the new lifecycle actions (Mark as
--  test / Archive / Restore).
--
--  Additive + idempotent.
-- ════════════════════════════════════════════════════════════════════

alter table public.quotes    add column if not exists is_test boolean not null default false;
alter table public.jobs      add column if not exists is_test boolean not null default false;
alter table public.invoices  add column if not exists is_test boolean not null default false;

create index if not exists quotes_live_idx
  on public.quotes (created_at desc) where deleted_at is null and is_test = false;
create index if not exists jobs_live_idx
  on public.jobs (scheduled_date desc) where deleted_at is null and is_test = false;
create index if not exists invoices_live_idx
  on public.invoices (created_at desc) where deleted_at is null and is_test = false;
