-- ============================================================================
-- Oranga Tamariki + NZCL: set up recurring jobs, cancel 2 duplicate OT jobs
-- Run in: Supabase SQL Editor, project "Sano" (rcfzlvablzehyawmrdqs)
-- Date: 2026-09-15
--
-- Existing jobs are NOT changed or deleted (except the 2 named duplicates,
-- which are SOFT-deleted so they stay recoverable).
--
-- IMPORTANT: start dates are deliberately set AFTER the last existing manual
-- job. Duplicate prevention in the generator matches on (recurring_job_id,
-- scheduled_date), and the existing manual jobs have recurring_job_id = NULL —
-- so starting on a date that already has a manual job would create a SECOND
-- job on that date.
-- ============================================================================

BEGIN;

-- ── 1. Cancel the 2 duplicate OT jobs (no address, created 30 Aug) ──────────
-- Both are unpaid, uninvoiced, no approved hours, no contractor invoice.
-- Soft delete = reversible; the portal treats deleted_at IS NOT NULL as gone.
UPDATE jobs
SET deleted_at = now()
WHERE job_number IN ('JOB-0342', 'JOB-0345')
  AND deleted_at IS NULL;
-- Expect: UPDATE 2

-- Exclude their worker rows so they can never reach a pay run.
-- 'excluded' is the schema's term for "not payable" (job_workers_pay_status_check
-- allows pending | approved | included_in_pay_run | paid | excluded).
UPDATE job_workers jw
SET pay_status = 'excluded'
FROM jobs j
WHERE j.id = jw.job_id
  AND j.job_number IN ('JOB-0342', 'JOB-0345')
  AND jw.pay_status = 'pending';
-- Expect: UPDATE 2

-- ── 2. Oranga Tamariki — 157 Celtic Crescent, Ellerslie ────────────────────
-- Pattern: every Wednesday AND Friday, 9am, 7 hours, $32.20/hr.
-- The generator steps weekly/fortnightly/monthly only — a Wed+Fri pattern is
-- not expressible as one rule, so this is TWO weekly recurrences.
-- Last existing job: Wed 14 Oct. So Wednesdays start 21 Oct, Fridays 16 Oct.
INSERT INTO recurring_jobs
  (client_id, title, address, scheduled_time, duration_estimate,
   contractor_id, frequency, start_date, next_due_date, status,
   contractor_pay_type, contractor_pay_mode, contractor_rate_override,
   billing_mode)
VALUES
  ((SELECT id FROM clients WHERE name = 'Oranga Tamariki - Ministry For Children'),
   'Oranga Tamariki — Celtic Crescent (Wednesdays)',
   '157 Celtic Crescent, Ellerslie, Auckland 1051, New Zealand',
   '9am', '7',
   (SELECT id FROM contractors WHERE full_name ILIKE '%upasni%'),
   'weekly', DATE '2026-10-21', DATE '2026-10-21', 'active',
   'hourly', 'fixed', 32.20, 'fixed'),
  ((SELECT id FROM clients WHERE name = 'Oranga Tamariki - Ministry For Children'),
   'Oranga Tamariki — Celtic Crescent (Fridays)',
   '157 Celtic Crescent, Ellerslie, Auckland 1051, New Zealand',
   '9am', '7',
   (SELECT id FROM contractors WHERE full_name ILIKE '%upasni%'),
   'weekly', DATE '2026-10-16', DATE '2026-10-16', 'active',
   'hourly', 'fixed', 32.20, 'fixed');
-- Expect: INSERT 0 2

-- ── 3. NZCL — 58B Trias Road, Tōtara Vale ──────────────────────────────────
-- Pattern: every Wednesday, 9:30am, 3 hours.
-- Contractor is paid a SET AMOUNT of $126.00 per clean (not hourly).
-- The Aug–Oct gap was a client holiday — future cleans only, so the
-- recurrence starts after the last existing job (Wed 14 Oct) on Wed 21 Oct.
INSERT INTO recurring_jobs
  (client_id, title, address, scheduled_time, duration_estimate,
   contractor_id, frequency, start_date, next_due_date, status,
   contractor_pay_type, contractor_pay_mode, contractor_per_visit_rate,
   service_days_of_week, billing_mode)
VALUES
  ((SELECT id FROM clients WHERE name = 'NZCL'),
   'NZCL — 58B Trias Road',
   '58B Trias Road, Tōtara Vale, Auckland 0629, New Zealand',
   '9:30am', '3',
   (SELECT id FROM contractors WHERE full_name ILIKE '%upasni%'),
   'weekly', DATE '2026-10-21', DATE '2026-10-21', 'active',
   'fixed', 'per_visit', 126.00,
   ARRAY[3],           -- 3 = Wednesday
   'fixed');
-- Expect: INSERT 0 1

COMMIT;

-- ============================================================================
-- VERIFY
-- ============================================================================

-- 3 recurring jobs (1 Pukekohe + the 3 new = 4 total)
SELECT r.title, cl.name AS client, ct.full_name AS worker, r.frequency,
       r.start_date, r.next_due_date, r.status,
       r.contractor_pay_type, r.contractor_pay_mode,
       r.contractor_rate_override, r.contractor_per_visit_rate
FROM recurring_jobs r
LEFT JOIN clients cl ON cl.id = r.client_id
LEFT JOIN contractors ct ON ct.id = r.contractor_id
ORDER BY cl.name, r.title;

-- The 2 duplicates should now be soft-deleted
SELECT job_number, scheduled_date, deleted_at
FROM jobs WHERE job_number IN ('JOB-0342','JOB-0345');

-- Upasni's OT jobs should now be 19, not 21 (duplicates excluded)
SELECT COUNT(*) AS ot_jobs_visible
FROM jobs j JOIN clients cl ON cl.id = j.client_id
WHERE cl.name ILIKE '%Oranga%' AND j.deleted_at IS NULL;
