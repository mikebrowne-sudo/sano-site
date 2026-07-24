-- ============================================================================
-- Phase 6 — assign the SIX CORE H&S modules to EXISTING ACTIVE workers.
-- PREPARED — DO NOT RUN until Mike approves. Mike-run, AFTER the content seed
-- (docs/db/2026-07-24-phase6-hs-module-content.sql) has been applied.
-- ============================================================================
-- New signings already auto-get the core modules. This one-off assigns them to
-- workers who signed BEFORE the modules existed. It targets the SIX APPROVED
-- CORE MODULES BY KEY (never `auto_assign = true`, which could sweep in a future
-- auto-assigned module). It is deliberately safe:
--   • ONLY the six core keys below. Role modules (working_at_height, team_leader)
--     are excluded.
--   • ONLY active workers (employees + contractors).
--   • NO duplicates (ON CONFLICT DO NOTHING on the unique (contractor, module)).
--   • status = 'assigned' — NO auto-completion, NO acknowledged_at/completed_at.
--   • NO worker_training_acknowledgements rows — no invented acknowledgement.
--   • NO change to any worker's status, activation, onboarding or completion.
-- The workers then read + acknowledge each module themselves (scroll-gate).
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
  assigned_at
)
select
  c.id,
  m.id,
  'assigned',
  now()
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
-- Every active worker now has exactly the six core modules assigned:
select c.full_name, count(a.id) as core_modules_assigned   -- expect 6 for each
from public.contractors c
left join public.worker_training_assignments a on a.contractor_id = c.id
  and a.training_module_id in (
    select id from public.training_modules
    where key in ('hs_induction','hazardous_substances','safe_work_practices',
                  'hazard_incident_reporting','security_property','privacy_conduct')
  )
where c.status = 'active'
group by c.full_name order by c.full_name;
-- No Working at Height or Team Leader assignments were created by this script:
select count(*) as role_module_assignments
from public.worker_training_assignments a
join public.training_modules m on m.id = a.training_module_id
where m.key in ('working_at_height','team_leader');   -- expect 0 (unless staff assigned one manually)
-- Nothing was auto-completed or acknowledged:
select count(*) as core_assigned_still_pending
from public.worker_training_assignments a
join public.training_modules m on m.id = a.training_module_id
where m.key in ('hs_induction','hazardous_substances','safe_work_practices',
                'hazard_incident_reporting','security_property','privacy_conduct')
  and a.status = 'assigned' and a.acknowledged_at is null and a.completed_at is null;
select count(*) as acknowledgements from public.worker_training_acknowledgements;   -- unchanged by this script


-- ---- ROLLBACK ---------------------------------------------------------------
-- Removes ONLY the six-core assignments that have NOT been acted on (never
-- touches an acknowledged or completed assignment, and never a role module).
-- begin;
--   delete from public.worker_training_assignments a
--   using public.training_modules m
--   where a.training_module_id = m.id
--     and m.key in ('hs_induction','hazardous_substances','safe_work_practices',
--                   'hazard_incident_reporting','security_property','privacy_conduct')
--     and a.status = 'assigned' and a.acknowledged_at is null and a.completed_at is null;
-- commit;
