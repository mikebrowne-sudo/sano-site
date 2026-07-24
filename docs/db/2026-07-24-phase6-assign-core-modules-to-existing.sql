-- ============================================================================
-- Phase 6 — assign the SIX CORE H&S modules to EXISTING ACTIVE workers.
-- PREPARED — DO NOT RUN until Mike approves. Mike-run, AFTER both the content
-- seed (2026-07-24-phase6-hs-module-content.sql) AND the assignment-source
-- migration (2026-07-24-phase6-assignment-source.sql) have been applied.
-- ============================================================================
-- Every row created here is stamped assignment_source = 'phase6_existing_worker_backfill'
-- so the batch is fully traceable and the rollback removes ONLY these rows —
-- never a pre-existing or manually created assignment.
--
-- Safe by design:
--   • ONLY the six core keys below. Role modules (working_at_height, team_leader)
--     are excluded.
--   • ONLY active workers (employees + contractors).
--   • NO duplicates (ON CONFLICT DO NOTHING).
--   • status = 'assigned' — NO auto-completion, NO acknowledged_at/completed_at.
--   • NO worker_training_acknowledgements rows.
--   • NO change to any worker's status, activation, onboarding or completion.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
-- The six core modules that will be assigned (expect exactly these 6):
select key, title from public.training_modules
where key in ('hs_induction','hazardous_substances','safe_work_practices',
              'hazard_incident_reporting','security_property','privacy_conduct')
order by sort_order;
-- Active workers in scope:
select count(*) filter (where worker_type = 'employee') as active_employees,
       count(*) filter (where worker_type = 'contractor') as active_contractors
from public.contractors where status = 'active';
-- How many NEW assignments this would create (rows that don't already exist):
select count(*) as would_create
from public.contractors c
cross join public.training_modules m
where c.status = 'active'
  and m.status = 'active'
  and m.key in ('hs_induction','hazardous_substances','safe_work_practices',
                'hazard_incident_reporting','security_property','privacy_conduct')
  and not exists (select 1 from public.worker_training_assignments a
                  where a.contractor_id = c.id and a.training_module_id = m.id);


-- ---- ASSIGNMENT (run after review) ------------------------------------------
begin;

insert into public.worker_training_assignments (
  contractor_id,
  training_module_id,
  status,
  assigned_at,
  assignment_source
)
select
  c.id,
  m.id,
  'assigned',
  now(),
  'phase6_existing_worker_backfill'
from public.contractors c
cross join public.training_modules m
where c.status = 'active'
  and m.status = 'active'
  and m.key in (
    'hs_induction',
    'hazardous_substances',
    'safe_work_practices',
    'hazard_incident_reporting',
    'security_property',
    'privacy_conduct'
  )
on conflict (contractor_id, training_module_id) do nothing;   -- no duplicates

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
-- Number created by THIS batch (traceable by source):
select count(*) as created_by_phase6_backfill
from public.worker_training_assignments where assignment_source = 'phase6_existing_worker_backfill';
-- Every active worker now has exactly the six core modules assigned (expect 6 each):
select c.full_name, count(a.id) as core_modules_assigned
from public.contractors c
left join public.worker_training_assignments a on a.contractor_id = c.id
  and a.training_module_id in (
    select id from public.training_modules
    where key in ('hs_induction','hazardous_substances','safe_work_practices',
                  'hazard_incident_reporting','security_property','privacy_conduct'))
where c.status = 'active'
group by c.full_name order by c.full_name;
-- Zero role-specific assignments created by this batch:
select count(*) as role_module_backfill_assignments
from public.worker_training_assignments a
join public.training_modules m on m.id = a.training_module_id
where a.assignment_source = 'phase6_existing_worker_backfill'
  and m.key in ('working_at_height','team_leader');   -- expect 0
-- Zero completed / acknowledged rows in this batch:
select count(*) filter (where status = 'completed') as batch_completed,
       count(*) filter (where acknowledged_at is not null) as batch_acknowledged
from public.worker_training_assignments where assignment_source = 'phase6_existing_worker_backfill';  -- expect 0 / 0
select count(*) as acknowledgements from public.worker_training_acknowledgements;   -- unchanged by this script
-- Worker status / onboarding untouched (spot-check the employees):
select full_name, status, onboarding_status from public.contractors where worker_type = 'employee' order by full_name;


-- ---- ROLLBACK ---------------------------------------------------------------
-- Removes ONLY this batch's rows (by source marker) that have NOT been acted on.
-- The source marker guarantees pre-existing / manual assignments are never
-- touched; the acted-on guard avoids the RESTRICT error from ack-history FKs.
-- begin;
--   delete from public.worker_training_assignments
--   where assignment_source = 'phase6_existing_worker_backfill'
--     and status = 'assigned' and acknowledged_at is null and completed_at is null;
-- commit;
