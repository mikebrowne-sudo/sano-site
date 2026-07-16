-- ════════════════════════════════════════════════════════════════════
--  Phase 7 — employee onboarding convergence onto contractors(worker_type='employee').
--
--  Live-data check confirmed the employees table is EMPTY (0 rows), so there is
--  NO data migration, no duplicates, no orphans — this is additive + code-only.
--
--  1. Grandfather existing ACTIVE employees (same transition rule as contractors).
--  2. Flip employee_required_items to the gated employee set.
--  3. Make the 4 induction modules applies_to='both' and neutralise the
--     contractor-specific wording so they suit employees too.
--  4. Mark the legacy employees table read-only via a comment (retirement plan in
--     docs). The table is NOT dropped in this phase.
--
--  Idempotent + additive. Mike-run.
-- ════════════════════════════════════════════════════════════════════

begin;

-- 1. Grandfather existing ACTIVE employees (worker_type='employee').
update public.contractors
   set onboarding_grandfathered = true
 where worker_type = 'employee'
   and status = 'active'
   and onboarding_grandfathered = false;

-- 2. Employee required-items gating set (RTW items only count where those rows
--    exist, i.e. right_to_work_required). Uploaded stays separate from verified.
update public.workforce_settings
   set value = jsonb_set(
     value,
     '{employee_required_items}',
     '["confirm_details","bank_details","contract_signed","id_uploaded","id_verified","ir330_supplied","payroll_tax_verified","kiwisaver_information_supplied","kiwisaver_verified","right_to_work_uploaded","right_to_work_verified","induction_completed","competency_confirmed"]'::jsonb
   )
 where key = 'default';

-- 3. Induction modules apply to both worker types; neutralise contractor wording.
update public.training_modules set applies_to = 'both'
 where key in ('hs_induction', 'hazardous_substances', 'security_property', 'privacy_conduct');

update public.training_modules
   set content = E'Sano Property Services is a PCBU under the Health and Safety at Work Act 2015. This induction summarises how we keep everyone safe. The full Health & Safety Plan is linked below and is the authoritative document.\n\nYour duties on every job:\n- Take reasonable care for your own health and safety and that of others.\n- Follow Sano''s safety procedures and any site-specific instructions.\n- Do your own hazard check when you arrive at each site.\n- Use the correct PPE for the task.\n- Present fit for work — free from the effects of drugs, alcohol or fatigue.\n\nReporting:\n- Report every hazard, near miss, injury and incident to Sano immediately.\n- Sano notifies WorkSafe New Zealand of any notifiable event.'
 where key = 'hs_induction';

update public.training_modules
   set description = 'Looking after client keys, alarms and property, and respecting client premises — as agreed in your agreement.'
 where key = 'security_property';

update public.training_modules
   set description = 'Client privacy and confidentiality, and professional conduct on site — as agreed in your agreement.'
 where key = 'privacy_conduct';

-- 4. Legacy-mark the (empty) employees table. Operational flow no longer writes
--    to it. Retirement plan: drop in a later migration once confirmed unused.
comment on table public.employees is
  'LEGACY (Phase 7, 2026-07-16): superseded by contractors(worker_type=''employee''). Currently EMPTY and no longer written to by the app. Retained read-only for history; do not write. Retirement: drop in a later migration after a confirmation window.';

commit;

-- Verify (read-only):
-- select status, onboarding_grandfathered, count(*) from contractors where worker_type='employee' group by 1,2;
-- select value->'employee_required_items' from workforce_settings where key='default';
-- select key, applies_to from training_modules where key is not null order by sort_order;
