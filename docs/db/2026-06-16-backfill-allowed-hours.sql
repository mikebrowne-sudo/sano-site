-- One-off DATA backfill (not a schema migration) for the "hours not
-- pulling through to contractors" fix. Safe + idempotent. Run once.
--
-- Context: contractor pay is driven by jobs.allowed_hours (numeric),
-- but some jobs only had the free-text "Duration estimate" filled, and
-- some job_workers rows never had their per-worker hours_allocated
-- seeded. Going forward the createJob/updateJob actions auto-derive
-- allowed_hours from a plain-number duration estimate and seed
-- hours_allocated; this backfill fixes the existing rows.
--
-- JOB-0048 is deliberately EXCLUDED: Kritika is being paid 8h there
-- (6 + 2h travel) via an approved extra-hours adjustment. Setting
-- allowed_hours on it would stack on top of that and overpay.

begin;

-- 1) Fill Allowed hours from a clean numeric Duration estimate where
--    Allowed hours is blank (e.g. JOB-0027 "4", JOB-0039 "5").
update public.jobs
set allowed_hours = duration_estimate::numeric
where allowed_hours is null
  and deleted_at is null
  and duration_estimate ~ '^[0-9]+(\.[0-9]+)?$'
  and (duration_estimate)::numeric > 0
  and job_number <> 'JOB-0048';

-- 2) Seed each worker's hours_allocated from the job's allowed hours
--    where it's still null (Group A: ~23 jobs). Each worker is allocated
--    the job's full allowed hours — matching how the assign + approval
--    paths already treat allowed_hours (per-worker, not split).
update public.job_workers jw
set hours_allocated = j.allowed_hours
from public.jobs j
where jw.job_id = j.id
  and jw.hours_allocated is null
  and j.allowed_hours is not null
  and j.allowed_hours > 0;

commit;

-- After running, re-check there are no stranded rows (expect only the
-- legacy fixed-price jobs with no estimate, which is correct):
--   select j.job_number, j.allowed_hours, jw.hours_allocated
--   from job_workers jw join jobs j on j.id = jw.job_id
--   where jw.hours_allocated is null and j.allowed_hours > 0;
