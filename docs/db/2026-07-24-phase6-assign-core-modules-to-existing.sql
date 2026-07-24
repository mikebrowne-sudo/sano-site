-- ============================================================================
-- Phase 6 — assign the SIX CORE H&S modules to EXISTING ACTIVE workers.
-- PREPARED — DO NOT RUN until Mike approves. Mike-run, AFTER the content seed
-- (docs/db/2026-07-24-phase6-hs-module-content.sql) has been applied.
-- ============================================================================
-- New signings already auto-get the core modules. This one-off assigns them to
-- workers who signed BEFORE the modules existed. It is deliberately safe:
--   • ONLY the six core modules (auto_assign = true). Role modules excluded.
--   • ONLY active workers (employees + contractors).
--   • NO duplicates (ON CONFLICT DO NOTHING on the unique (contractor, module)).
--   • status = 'assigned' — NO auto-completion, NO acknowledged_at/completed_at.
--   • NO worker_training_acknowledgements rows — no invented acknowledgement.
--   • NO change to any worker's status, activation, onboarding or completion.
-- The workers then read + acknowledge each module themselves (scroll-gate).
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
-- The six core modules that will be assigned (expect 6):
select key, title from public.training_modules where auto_assign = true and status = 'active' order by sort_order;
-- Active workers in scope:
select count(*) filter (where worker_type = 'employee') as active_employees,
       count(*) filter (where worker_type = 'contractor') as active_contractors
from public.contractors where status = 'active';
-- How many NEW assignments this would create (rows that don't already exist):
select count(*) as would_create
from public.contractors c
cross join public.training_modules m
where c.status = 'active' and m.auto_assign = true and m.status = 'active'
  and not exists (select 1 from public.worker_training_assignments a
                  where a.contractor_id = c.id and a.training_module_id = m.id);


-- ---- ASSIGNMENT (run after review) ------------------------------------------
begin;

insert into public.worker_training_assignments (contractor_id, training_module_id, status, assigned_at)
select c.id, m.id, 'assigned', now()
from public.contractors c
cross join public.training_modules m
where c.status = 'active'
  and m.auto_assign = true      -- the six CORE modules only (role modules are auto_assign = false)
  and m.status = 'active'
on conflict (contractor_id, training_module_id) do nothing;   -- no duplicates

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
-- Every active worker now has the six core modules assigned:
select c.full_name, count(a.id) as core_modules_assigned
from public.contractors c
left join public.worker_training_assignments a on a.contractor_id = c.id
  and a.training_module_id in (select id from public.training_modules where auto_assign = true and status = 'active')
where c.status = 'active'
group by c.full_name order by c.full_name;
-- Nothing was auto-completed or acknowledged by this assignment:
select count(*) as newly_assigned_still_pending
from public.worker_training_assignments where status = 'assigned' and acknowledged_at is null and completed_at is null;
select count(*) as acknowledgements from public.worker_training_acknowledgements;   -- unchanged
-- No role-specific module was assigned by this script:
select count(*) as role_module_assignments
from public.worker_training_assignments a
join public.training_modules m on m.id = a.training_module_id
where m.auto_assign = false;   -- expect 0 (unless staff assigned one manually)


-- ---- ROLLBACK ---------------------------------------------------------------
-- Removes ONLY the assignments created by this script that have NOT been acted on
-- (never touches an acknowledged or completed assignment).
-- begin;
--   delete from public.worker_training_assignments a
--   using public.training_modules m
--   where a.training_module_id = m.id and m.auto_assign = true
--     and a.status = 'assigned' and a.acknowledged_at is null and a.completed_at is null;
-- commit;
