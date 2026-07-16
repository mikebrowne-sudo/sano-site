-- 2026-07-09 — Test-run flag on employment agreements.
--
-- Lets staff create a throwaway "test run" agreement to dry-run the online
-- sign flow without touching the workforce area or notifying the team. A test
-- agreement, on signing, skips creating/updating a contractor/employee record
-- and sends the confirmation email only to the tester (not Carol / the admin
-- inbox). See the sign action for the behaviour.
--
-- Additive + idempotent. Run before deploying the test-run toggle.

begin;

alter table public.employment_agreements
  add column if not exists is_test boolean not null default false;

commit;
