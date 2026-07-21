# Migration — partial unique index on active contractor invoices (Stage 0 PR D)

**Date:** 2026-07-21 · **Status: prepared, NOT YET RUN — awaiting Mike.**

Prevents more than one **active** (non-void) contractor invoice for the same
`(job_id, contractor_id)`. Job-less payables — manual fixed-contract invoices,
adjustments, and the historically-corrected duplicates (job_id nulled) — are
deliberately **excluded** via `job_id is not null`, so legitimate job-less
records are never constrained.

## Pre-flight (must be 0 before running — verified 2026-07-21)
```sql
select count(*) as active_dup_groups from (
  select job_id, contractor_id from public.contractor_invoices
  where status <> 'void' and job_id is not null
  group by job_id, contractor_id having count(*) > 1
) t;   -- must return 0
```

## Migration
```sql
create unique index if not exists contractor_invoices_active_job_contractor_uq
  on public.contractor_invoices (job_id, contractor_id)
  where status <> 'void' and job_id is not null;
```

## Verify after running
```sql
select indexname, indexdef
from pg_indexes
where tablename = 'contractor_invoices'
  and indexname = 'contractor_invoices_active_job_contractor_uq';
```

## Notes
- The application-level duplicate guard in `approveContractorPay`
  (`_actions-approve-pay.ts`) stays for good user feedback; this index is the
  DB backstop that also stops any race between two near-simultaneous approvals.
- A voided payable does not block a valid replacement (excluded by
  `status <> 'void'`).
- If the pre-flight count is ever > 0, the `create unique index` will fail
  loudly rather than silently mangle data — resolve the duplicates first
  (see the duplicate-control review process).
