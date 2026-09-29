-- 2026-09-29 — Make the duplicate-payable index item-aware.
--
-- THE BUG (found in production while approving a real carpet clean)
--
--   Could not create the contractor payable: duplicate key value violates
--   unique constraint "contractor_invoices_active_job_contractor_uq"
--
-- contractor_invoices_active_job_contractor_uq was added 2026-07-21 as the DB
-- backstop for "one active payable per (job, contractor)" — a race guard behind
-- the application check in approveContractorPay. It predates job items and knows
-- nothing about job_item_id.
--
-- So when a contractor is paid for the CLEAN and then for an EXTRA on the same
-- job (Nasrin: $315 for 9h, plus $200 for the carpet), the second insert trips
-- the index even though it is a legitimately different payable. The application
-- guard was made item-aware in PR #600; this index was not, so the DB refuses
-- what the app allows.
--
-- THE FIX: split the one index into two, mirroring the application guard exactly
-- (see the duplicate-guard comment block in _actions-approve-pay.ts):
--
--   the JOB itself  — one active payable per (job, contractor) WHERE job_item_id IS NULL
--   an EXTRA        — at most one active payable per job_item_id
--                     (already enforced by contractor_invoices_job_item_uniq)
--
-- The `job_item_id is null` clause is what preserves the original protection
-- exactly: approving the job twice is still refused, and the race the July index
-- was created for is still closed. It only stops a job payable and an item
-- payable being treated as the same thing.
--
-- PRE-FLIGHT, verified on the live database 2026-09-29:
--   0 duplicate (job_id, contractor_id) groups among active job payables
--   (job_item_id is null), so the replacement index builds cleanly.
--
-- Additive + idempotent. No row is changed. Run in the Supabase SQL Editor.

begin;

-- Replace the item-blind index with one scoped to the JOB's own payable.
drop index if exists public.contractor_invoices_active_job_contractor_uq;

create unique index if not exists contractor_invoices_active_job_contractor_uq
  on public.contractor_invoices (job_id, contractor_id)
  where status <> 'void'
    and job_id is not null
    and contractor_id is not null
    and job_item_id is null;

comment on index public.contractor_invoices_active_job_contractor_uq is
  'One active payable per (job, contractor) for the JOB OCCURRENCE itself. Payables for a job EXTRA are excluded via job_item_id is null and are constrained instead by contractor_invoices_job_item_uniq (one per item). Mirrors the application guard in _actions-approve-pay.ts.';

-- Already present (2026-09-17), restated here so the pair is documented together:
-- one active payable per job item.
create unique index if not exists contractor_invoices_job_item_uniq
  on public.contractor_invoices (job_item_id)
  where job_item_id is not null and status <> 'void';

commit;

-- ── VERIFY ──────────────────────────────────────────────────────────────────
-- Both indexes should be listed, and the first must now include job_item_id:
--   select indexname, indexdef from pg_indexes
--   where tablename = 'contractor_invoices'
--     and indexname in ('contractor_invoices_active_job_contractor_uq',
--                       'contractor_invoices_job_item_uniq');
--
-- ── ROLLBACK ────────────────────────────────────────────────────────────────
-- Restores the July behaviour (and re-blocks paying an extra on a job the
-- contractor is already paid for):
--   drop index if exists public.contractor_invoices_active_job_contractor_uq;
--   create unique index contractor_invoices_active_job_contractor_uq
--     on public.contractor_invoices (job_id, contractor_id)
--     where status <> 'void' and job_id is not null;
