-- Contractors could UPDATE any column of a job where they're the primary
-- cleaner (hours, status, dates, price) straight through the public API with
-- their own login. The app never needs this: contractor actions (mark
-- complete, notes) authorise the contractor and write server-side.
-- Run AFTER the PR that moves those writes server-side is merged.

drop policy if exists "jobs contractor update own" on public.jobs;

-- verify: expect no UPDATE policy for contractors on jobs
select policyname, cmd from pg_policies where schemaname = 'public' and tablename = 'jobs' order by cmd;
