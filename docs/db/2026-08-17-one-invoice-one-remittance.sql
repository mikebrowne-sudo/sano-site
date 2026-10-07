-- One contractor invoice → at most ONE active remittance item (2026-08-17).
--
-- WHAT THIS DOES
--   Installs a BEFORE INSERT OR UPDATE trigger on
--   public.contractor_remittance_items that rejects any ACTIVE invoice line
--   whose contractor_invoice_id is already carried by another ACTIVE line.
--
-- WHY
--   A contractor invoice must never be payable twice. The canonical
--   job_id + contractor_id guard in approveContractorPay is correct and stays
--   as it is — it stops a second PAYABLE being raised for the same work. The
--   defect was one stage later: the same payable could be placed on two
--   different remittances.
--
--   Confirmed historical cases (audit 2026-08-17):
--     CI-0015  Anishal Kumar  $80   on RA-0002 AND RA-0003  → $160 paid
--     CI-0012  Kritika Kumar  $175  on RA-0001 AND RA-0007  → $350 paid
--   (A third, CI-0017 $145, was already documented in July.)
--
-- WHY A TRIGGER AND NOT A UNIQUE INDEX
--   A partial unique index on contractor_invoice_id would be the simpler tool,
--   but it CANNOT BE CREATED against current data: 2 groups / 4 rows already
--   violate it, and the business decision is to preserve historical remittances
--   exactly as they happened (no deletes, no rewrites, no renumbering).
--   Postgres has no "enforce for new rows only" unique index, so a trigger is
--   the correct instrument: it constrains FUTURE writes while leaving history
--   untouched and visible.
--
--   The trigger checks NEW against OTHER rows only (id <> NEW.id), so a normal
--   UPDATE of a row's own descriptive fields is always allowed — the manual
--   remittance edit path updates job_number/job_address/note and must keep
--   working.
--
-- SCOPE / SAFETY
--   * NO historical data is read, changed, deleted or renumbered.
--   * The 4 existing duplicate rows REMAIN exactly as they are. They are
--     grandfathered: the trigger only fires on new INSERT/UPDATE.
--   * kind='adjustment' lines (contractor_invoice_id IS NULL) are unaffected —
--     manual adjustments stay possible by design.
--   * Superseded lines (tax_status='superseded') are ignored on both sides: a
--     corrected line is not an active payment, and a correction must still be
--     able to supersede an active one.
--   * Employee payroll is not touched in any way.
--   * Idempotent: safe to run more than once.
--
-- PAIRS WITH the application guard in
--   src/app/portal/contractor-invoices/_actions-remittance-batch.ts
-- which fails closed with a readable message naming the CI and the existing RA.
-- Neither layer is load-bearing on its own.


-- ════════════════════════════════════════════════════════════════════
-- STEP 1 — VERIFY BEFORE (run first; note the numbers)
-- ════════════════════════════════════════════════════════════════════

-- Known historical duplicates. Expect 2 groups / 4 rows (CI-0012, CI-0015).
-- These are PRESERVED — do not clean them up.
select ci.invoice_number, c.full_name, ci.amount,
       count(*) as active_lines,
       array_agg(r.remittance_number order by r.remittance_number) as remittances
from public.contractor_remittance_items i
join public.contractor_remittances r on r.id = i.remittance_id
join public.contractor_invoices ci on ci.id = i.contractor_invoice_id
left join public.contractors c on c.id = ci.contractor_id
where coalesce(i.tax_status,'active') <> 'superseded'
group by ci.invoice_number, c.full_name, ci.amount
having count(*) > 1
order by 1;

-- Total rows the trigger will guard from now on.
select
  (select count(*) from public.contractor_remittance_items) as total_items,
  (select count(*) from public.contractor_remittance_items where contractor_invoice_id is not null) as invoice_items,
  (select count(*) from public.contractor_remittance_items where contractor_invoice_id is null) as adjustment_items;


-- ════════════════════════════════════════════════════════════════════
-- STEP 2 — APPLY
-- ════════════════════════════════════════════════════════════════════

begin;

create or replace function public.enforce_one_active_remittance_per_invoice()
returns trigger
language plpgsql
as $$
declare
  v_existing_remittance text;
  v_ci_number           text;
begin
  -- Adjustment lines carry no invoice — always allowed.
  if new.contractor_invoice_id is null then
    return new;
  end if;

  -- A superseded line is a correction, not an active payment.
  if coalesce(new.tax_status, 'active') = 'superseded' then
    return new;
  end if;

  -- Look for ANOTHER active line already carrying this invoice. Excluding
  -- new.id makes a normal self-UPDATE (editing job_number / address / note)
  -- always safe.
  select r.remittance_number
    into v_existing_remittance
  from public.contractor_remittance_items i
  join public.contractor_remittances r on r.id = i.remittance_id
  where i.contractor_invoice_id = new.contractor_invoice_id
    and coalesce(i.tax_status, 'active') <> 'superseded'
    and i.id is distinct from new.id
  limit 1;

  if v_existing_remittance is not null then
    select invoice_number into v_ci_number
      from public.contractor_invoices where id = new.contractor_invoice_id;

    raise exception
      'Contractor invoice % is already on remittance % and cannot be paid again.',
      coalesce(v_ci_number, new.contractor_invoice_id::text), v_existing_remittance
      using errcode = 'raise_exception',
            hint = 'A contractor invoice may belong to only one active remittance. Void the existing remittance first, or add this as an explicit adjustment line.';
  end if;

  return new;
end;
$$;

drop trigger if exists one_active_remittance_per_invoice_trg on public.contractor_remittance_items;
create trigger one_active_remittance_per_invoice_trg
  before insert or update on public.contractor_remittance_items
  for each row
  execute function public.enforce_one_active_remittance_per_invoice();

comment on function public.enforce_one_active_remittance_per_invoice() is
  'Enforces: one contractor_invoice_id -> at most one ACTIVE contractor_remittance_item. Installed 2026-08-17 after CI-0012 and CI-0015 were each paid on two remittances. Historical duplicates are deliberately grandfathered (a unique index could not be created without rewriting payment history).';

commit;


-- ════════════════════════════════════════════════════════════════════
-- STEP 3 — VERIFY AFTER
-- ════════════════════════════════════════════════════════════════════

-- 3a. Trigger installed? Expect one row.
select tgname, tgrelid::regclass as on_table
from pg_trigger
where tgname = 'one_active_remittance_per_invoice_trg';

-- 3b. Historical duplicates UNCHANGED? Expect the same 2 groups / 4 rows as 1a.
select ci.invoice_number, count(*) as active_lines
from public.contractor_remittance_items i
join public.contractor_invoices ci on ci.id = i.contractor_invoice_id
where coalesce(i.tax_status,'active') <> 'superseded'
group by ci.invoice_number having count(*) > 1
order by 1;

-- 3c. Nothing was modified? Expect identical counts to 1b.
select
  (select count(*) from public.contractor_remittance_items) as total_items,
  (select count(*) from public.contractor_remittance_items where contractor_invoice_id is not null) as invoice_items,
  (select count(*) from public.contractor_remittance_items where contractor_invoice_id is null) as adjustment_items;

-- 3d. Guard actually bites? Each block below must behave as commented.
--     Run them one at a time; every one rolls back.
--
--   -- (i) must FAIL — CI-0012 is already on RA-0001/RA-0007:
--   begin;
--     insert into public.contractor_remittance_items
--       (remittance_id, kind, contractor_invoice_id, amount, tax_status)
--     select r.id, 'invoice', ci.id, 175, 'active'
--     from public.contractor_remittances r, public.contractor_invoices ci
--     where r.remittance_number = 'RA-0022' and ci.invoice_number = 'CI-0012';
--   rollback;
--
--   -- (ii) must SUCCEED — adjustment lines carry no invoice:
--   begin;
--     insert into public.contractor_remittance_items
--       (remittance_id, kind, contractor_invoice_id, label, amount, tax_status)
--     select r.id, 'adjustment', null, 'Test adjustment', 10, 'active'
--     from public.contractor_remittances r where r.remittance_number = 'RA-0022';
--   rollback;
--
--   -- (iii) must SUCCEED — editing a line's own descriptive fields:
--   begin;
--     update public.contractor_remittance_items
--       set note = coalesce(note,'') || ' (edit test)'
--       where id = (select id from public.contractor_remittance_items
--                   where contractor_invoice_id is not null limit 1);
--   rollback;


-- ════════════════════════════════════════════════════════════════════
-- ROLLBACK (only if needed)
-- ════════════════════════════════════════════════════════════════════
--   drop trigger if exists one_active_remittance_per_invoice_trg on public.contractor_remittance_items;
--   drop function if exists public.enforce_one_active_remittance_per_invoice();
