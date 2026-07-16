-- ════════════════════════════════════════════════════════════════════
--  Phase 2 — onboarding checklist redesign (upload vs verification split)
--  + settings migration + safe backfill for existing contractors.
--
--  Run by Mike. Idempotent and additive. Wrapped in a transaction.
--  NOTHING here completes a staff-verification item, and NOTHING is
--  inferred from agreement prose, applicant answers, insurance text
--  fields, or document presence for verification items.
--
--  Safety: verification items are added as PENDING and are NOT placed in
--  the required-items set (step 4 only renames the training key). Because
--  activation gating counts only required items that exist, no existing
--  contractor is blocked or regressed. recompute never sets status
--  downward, so no active contractor is deactivated.
-- ════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Rename the generic training item to the induction item ───────
--     Preserves status + completed_at + completed_by (history intact).
update public.contractor_onboarding
   set item_key = 'induction_completed',
       label    = 'Induction & policy modules completed',
       section  = 'Training'
 where item_key = 'onboarding_training';

-- ── 2. Add the new contractor checklist items (PENDING) ─────────────
--     Only worker_type='contractor'; only where the item is missing.
insert into public.contractor_onboarding (contractor_id, section, item_key, label, sort_order, status)
select c.id, v.section, v.item_key, v.label, v.sort_order, 'pending'
from public.contractors c
cross join (values
  ('Compliance', 'id_uploaded',          'Photo ID uploaded',               30),
  ('Compliance', 'insurance_verified',   'Insurance verified',              35),
  ('Compliance', 'tax_review',           'Tax treatment reviewed (IR330C)', 38),
  ('Competency', 'competency_confirmed', 'Competency confirmed',            60)
) as v(section, item_key, label, sort_order)
where c.worker_type = 'contractor'
  and not exists (
    select 1 from public.contractor_onboarding o
    where o.contractor_id = c.id and o.item_key = v.item_key
  );

-- ── 2b. Conditional right-to-work items — only where required ───────
insert into public.contractor_onboarding (contractor_id, section, item_key, label, sort_order, status)
select c.id, 'Compliance', v.item_key, v.label, v.sort_order, 'pending'
from public.contractors c
cross join (values
  ('right_to_work_uploaded', 'Right-to-work evidence uploaded', 36),
  ('right_to_work_verified', 'Right-to-work verified',          37)
) as v(item_key, label, sort_order)
where c.worker_type = 'contractor'
  and c.right_to_work_required is true
  and not exists (
    select 1 from public.contractor_onboarding o
    where o.contractor_id = c.id and o.item_key = v.item_key
  );

-- ── 3. Safe inference for BASE (non-verification) items only ────────
--     Touches ONLY pending rows and ONLY where explicit evidence exists.
--     No-ops on current data (all base items already complete). Never
--     touches verification items. completed_by stays NULL (system).

--  contract_signed — where a signed agreement date exists.
update public.contractor_onboarding o
   set status = 'complete', completed_at = coalesce(o.completed_at, now())
  from public.contractors c
 where o.contractor_id = c.id
   and o.item_key = 'contract_signed'
   and o.status = 'pending'
   and c.contract_signed_date is not null;

--  bank_details — where valid bank account details exist.
update public.contractor_onboarding o
   set status = 'complete', completed_at = coalesce(o.completed_at, now())
  from public.contractors c
 where o.contractor_id = c.id
   and o.item_key = 'bank_details'
   and o.status = 'pending'
   and c.bank_account_number is not null
   and length(trim(c.bank_account_number)) > 0;

--  insurance_uploaded — ONLY where an insurance document exists.
update public.contractor_onboarding o
   set status = 'complete', completed_at = coalesce(o.completed_at, now())
 where o.item_key = 'insurance_uploaded'
   and o.status = 'pending'
   and exists (
     select 1 from public.worker_documents d
     where d.contractor_id = o.contractor_id and d.document_type = 'insurance'
   );

-- ── 4. Migrate stored required-items settings (training key rename) ──
--     Verification items are intentionally NOT added to the required set.
update public.workforce_settings
   set value = jsonb_set(
     jsonb_set(
       value,
       '{contractor_required_items}',
       coalesce((
         select jsonb_agg(case when x = 'onboarding_training' then 'induction_completed' else x end)
         from jsonb_array_elements_text(value->'contractor_required_items') as x
       ), value->'contractor_required_items')
     ),
     '{employee_required_items}',
     coalesce((
       select jsonb_agg(case when x = 'onboarding_training' then 'induction_completed' else x end)
       from jsonb_array_elements_text(value->'employee_required_items') as x
     ), value->'employee_required_items')
   )
 where key = 'default';

commit;

-- ── Verification queries (run after commit; read-only) ──────────────
-- select item_key, count(*), count(*) filter (where status='complete') complete
--   from public.contractor_onboarding group by item_key order by item_key;
-- select value->'contractor_required_items', value->'employee_required_items'
--   from public.workforce_settings where key='default';
