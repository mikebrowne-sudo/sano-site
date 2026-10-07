-- 2026-09-18 — Stop contractors reading every contractor's pay, IRD and bank details.
--
-- THE HOLE
-- public.contractors and public.job_workers each carry a policy
--   "Staff full access to X"  FOR ALL TO authenticated  USING (true)
-- `true` means EVERY signed-in user, and contractors sign in to /contractor.
-- So any contractor could read the whole contractors table — every hourly_rate,
-- ird_number and bank_account_number in the business — and every job_workers
-- row, meaning every other worker's pay rate on every job.
--
-- Both are tightened to NOT public.is_contractor(), the same gate
-- pay_run_items, audit_log and contractor_invoices already use.
--
-- WHY A SELF-READ POLICY IS MANDATORY, NOT OPTIONAL
-- Eight contractor-portal reads resolve auth.uid() -> their own contractors row
-- on the USER client, including src/app/contractor/layout.tsx and
-- src/middleware.ts. Tightening WITHOUT the self-read policy below does not
-- merely hide data — it logs every contractor out of their own portal and
-- bounces them to /portal. The policy is added in the same transaction.
--
-- job_workers already has its self-read policy, added 2026-06-12.
--
-- PRE-FLIGHT, verified on the live database 2026-09-18:
--   relforcerowsecurity = false on both tables  -> is_contractor() cannot recurse
--   is_contractor() is SECURITY DEFINER owned by postgres -> bypasses RLS
--   0 staff rows share an auth_user_id with a contractors row -> no staff lockout
--
-- SHIPS WITH CODE. Two reads had to change first, and are already deployed:
--   contractor-job-detail-data.ts  — the job ROSTER query (not the caller's own
--     row) moved to the service client. rosterIds.length is the divisor for the
--     hours fallback, so under the tightened policy it would collapse to 1 and
--     show each cleaner on a 2-cleaner job the WHOLE job's hours and pay. Three
--     live jobs are on that fallback path today.
--   _actions-access.ts markContractorInviteAccepted() — a contractor-session
--     UPDATE, moved to the service client so it does not silently no-op.
--
-- Run in the Supabase SQL Editor AFTER that code is live.

begin;

-- ── contractors ─────────────────────────────────────────────────────────────

drop policy if exists "Staff full access to contractors" on public.contractors;
create policy "Staff full access to contractors"
  on public.contractors
  for all
  to authenticated
  using      (not public.is_contractor())
  with check (not public.is_contractor());

-- REQUIRED. Without this the contractor portal cannot resolve who is logged in.
-- Direct auth_user_id = auth.uid() with no subquery, so there is no recursion
-- concern even if is_contractor() were ever changed.
--
-- Row-level, not column-level: a contractor can read their OWN ird_number and
-- bank_account_number. That is data they submitted themselves through the
-- agreement flow and already see on their own profile. No other row is visible.
drop policy if exists "contractors reads own" on public.contractors;
create policy "contractors reads own"
  on public.contractors
  for select
  to authenticated
  using (auth_user_id = auth.uid());

-- Deliberately NO self-UPDATE policy. A row-level update policy cannot restrict
-- WHICH columns change, so it would let a contractor rewrite their own
-- hourly_rate, status or auth_user_id. The one legitimate contractor-session
-- write (invite_accepted_at) uses the service client instead.

-- ── job_workers ─────────────────────────────────────────────────────────────

drop policy if exists "Staff full access to job_workers" on public.job_workers;
create policy "Staff full access to job_workers"
  on public.job_workers
  for all
  to authenticated
  using      (not public.is_contractor())
  with check (not public.is_contractor());

-- "job_workers contractor reads own" already exists and is left untouched: it
-- scopes a contractor to their OWN rows, which is what the pay statement needs.

commit;

-- ── SMOKE TEST, as a real contractor account (not staff) ────────────────────
--  1. /contractor/login  — signs in, no error, no forced sign-out
--  2. /contractor/jobs   — loads, topbar shows their name
--  3. a MULTI-WORKER job — hours and pay match what they showed before
--  4. /contractor/payroll and /contractor/profile load
--  5. as staff: /portal/jobs/[id] and /portal/contractors still load
--
-- ROLLBACK — restores the previous (open) behaviour:
--   alter policy "Staff full access to contractors" on public.contractors
--     using (true) with check (true);
--   alter policy "Staff full access to job_workers" on public.job_workers
--     using (true) with check (true);
