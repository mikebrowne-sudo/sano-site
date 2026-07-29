-- 2026-07-31 — Immutable contractor IR330C tax declarations + per-schedule tax
--             classification (PR 4).
--
-- TWO SEPARATE concepts, deliberately not conflated:
--   1. contractor_tax_declarations — the contractor/entity's IR330C, chosen rate,
--      tailored rate or exemption. Append-only + superseding (mirrors the employee
--      worker_tax_declarations model). One CURRENT declaration per contractor.
--   2. contractor_service_schedules.tax_treatment — whether payments under a
--      PARTICULAR work arrangement are schedular / ordinary trade creditor /
--      exempt / pending. A verified IR330C does NOT make every schedule schedular;
--      each schedule's treatment is set/reviewed independently by staff.
--
-- PR 4 scope: CAPTURE, SUBMIT, VERIFY, PRESERVE tax declarations, and wire the
-- real tax gate to payment-readiness. NO withholding calc, NO invoice deductions,
-- NO IRD liabilities / filing / money movement. Nothing sent to any contractor.
-- The full IRD number is NOT rendered in the general signed agreement PDF.
-- Additive + idempotent. Admin-only RLS; token reads via the service-role client
-- with a strict contractor-safe allowlist in app code. Mike-run.

-- ── Read-only preflight (expect 0 rows / absent column) ─────────────────────
select table_name from information_schema.tables
where table_schema='public' and table_name='contractor_tax_declarations';
select column_name from information_schema.columns
where table_schema='public' and table_name='contractor_service_schedules' and column_name='tax_treatment';

begin;

-- ── 1. contractor_tax_declarations — immutable, superseding ─────────────────
create table if not exists public.contractor_tax_declarations (
  id                    uuid primary key default gen_random_uuid(),
  declaration_number    text,                       -- CTD-xxxx (assigned in app)
  contractor_id         uuid not null references public.contractors(id) on delete restrict,
  -- Contracting identity (as declared).
  contracting_entity_type text,                     -- sole_trader|company|partnership|trust|other
  contracting_legal_name  text,
  contracting_ird_number  text,                     -- SENSITIVE — never in the general agreement PDF
  residency_status        text,                     -- resident|non_resident (for rate validation)
  -- Declaration path.
  declaration_type      text not null
                          check (declaration_type in
                            ('ir330c_standard','contractor_chosen','tailored_rate','exemption','prescribed')),
  ir330c_activity_number text,
  ir330c_activity_description text,
  withholding_rate      numeric,                    -- decimal e.g. 0.20 = 20%; null for exemption
  declaration_date      date,
  effective_date        date,
  expiry_date           date,                       -- tailored-rate / exemption expiry where applicable
  tailored_rate_certificate_ref text,
  exemption_certificate_ref     text,
  evidence_ref          text,                       -- uploaded IR330C / certificate (internal reference)
  signed_name           text,
  signed_at             timestamptz,
  declaration_text      text,                       -- exact wording shown
  declaration_version   text,
  source                text not null default 'staff_recorded'
                          check (source in ('contractor_submitted','staff_recorded')),
  -- Lifecycle.
  status                text not null default 'submitted'
                          check (status in ('submitted','verified','rejected','superseded')),
  verified_at           timestamptz,
  verified_by           uuid references auth.users(id) on delete set null,
  review_notes          text,                        -- STAFF-ONLY — never exposed via the token route
  supersedes_id         uuid references public.contractor_tax_declarations(id) on delete set null,
  superseded_at         timestamptz,
  superseded_by_id      uuid references public.contractor_tax_declarations(id) on delete set null,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now()
);

create index if not exists ctd_contractor_idx on public.contractor_tax_declarations (contractor_id);
create index if not exists ctd_status_idx on public.contractor_tax_declarations (status);
-- At most ONE current (non-superseded, non-rejected) declaration per contractor.
create unique index if not exists ctd_one_current_per_contractor
  on public.contractor_tax_declarations (contractor_id)
  where status in ('submitted','verified');

comment on table public.contractor_tax_declarations is
  'Immutable, superseding contractor IR330C / tailored-rate / exemption declarations. Facts are append-only (see trigger); a correction creates a new row and supersedes the prior current one — a verified declaration is never overwritten. One current (submitted/verified) declaration per contractor. Independent of per-schedule tax_treatment. review_notes + verified_* are staff-only (never exposed via the token route). contracting_ird_number is sensitive and is not rendered in the general agreement PDF.';

-- Immutability: reject any UPDATE that changes a submitted FACT column. Only
-- lifecycle columns (status, verified_*, review_notes, superseded_*) may change.
-- Runs for ALL writers, incl. service-role/admin.
create or replace function public.ctd_block_fact_updates() returns trigger as $$
begin
  if row(new.declaration_number, new.contractor_id, new.contracting_entity_type, new.contracting_legal_name,
          new.contracting_ird_number, new.residency_status, new.declaration_type, new.ir330c_activity_number,
          new.ir330c_activity_description, new.withholding_rate, new.declaration_date, new.effective_date,
          new.expiry_date, new.tailored_rate_certificate_ref, new.exemption_certificate_ref, new.evidence_ref,
          new.signed_name, new.signed_at, new.declaration_text, new.declaration_version, new.source)
     is distinct from
     row(old.declaration_number, old.contractor_id, old.contracting_entity_type, old.contracting_legal_name,
          old.contracting_ird_number, old.residency_status, old.declaration_type, old.ir330c_activity_number,
          old.ir330c_activity_description, old.withholding_rate, old.declaration_date, old.effective_date,
          old.expiry_date, old.tailored_rate_certificate_ref, old.exemption_certificate_ref, old.evidence_ref,
          old.signed_name, old.signed_at, old.declaration_text, old.declaration_version, old.source) then
    raise exception 'contractor_tax_declarations: submitted declaration facts are immutable — a correction must create a new declaration';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists ctd_immutable_facts on public.contractor_tax_declarations;
create trigger ctd_immutable_facts before update on public.contractor_tax_declarations
  for each row execute function public.ctd_block_fact_updates();

-- ── 2. Per-schedule tax classification (part of the effective-dated version) ─
-- A verified IR330C does NOT make every schedule schedular. Each schedule's
-- treatment is set/reviewed independently by staff. The classification is PART OF
-- the effective-dated schedule version: a DRAFT can be edited in place; changing
-- an ACTIVE schedule's classification SUPERSEDES it with a new effective-dated
-- version (see setScheduleTaxTreatment). supersedes_id is the back-pointer
-- (new → old) complementing the existing superseded_by (old → new), so a payment
-- snapshot can reconstruct the exact version + classification that applied on a
-- given date.
alter table public.contractor_service_schedules
  add column if not exists tax_treatment text
    check (tax_treatment in ('schedular_payment','ordinary_trade_creditor','exempt_certificate','pending_review')),
  add column if not exists tax_treatment_note text,
  add column if not exists supersedes_id uuid references public.contractor_service_schedules(id) on delete set null;

create index if not exists idx_css_supersedes on public.contractor_service_schedules (supersedes_id);

comment on column public.contractor_service_schedules.tax_treatment is
  'Per-schedule tax classification, set/reviewed independently of the contractor tax declaration and forming part of the effective-dated schedule version. schedular_payment → gated on a verified IR330C/exemption; ordinary_trade_creditor → not gated by IR330C; exempt_certificate → covered by a verified exemption; pending_review → unresolved (blocks). Null = not yet classified (treated as pending). Changing an ACTIVE schedule''s classification supersedes the version rather than mutating in place.';
comment on column public.contractor_service_schedules.supersedes_id is
  'Back-pointer to the schedule version this row replaced (new → old), complementing superseded_by (old → new). Lets a payment/job snapshot resolve the exact schedule version + tax classification effective on a date.';

-- ── RLS — admin-only (token reads use the service-role client + app allowlist) ─
alter table public.contractor_tax_declarations enable row level security;
drop policy if exists "contractor_tax_declarations admin all" on public.contractor_tax_declarations;
create policy "contractor_tax_declarations admin all" on public.contractor_tax_declarations
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public' and table_name='contractor_tax_declarations';   -- 1 row

select indexname from pg_indexes
where schemaname='public' and tablename='contractor_tax_declarations'
  and indexname in ('ctd_contractor_idx','ctd_status_idx','ctd_one_current_per_contractor')
order by indexname;   -- 3 rows

select tgname from pg_trigger where tgrelid = 'public.contractor_tax_declarations'::regclass
  and tgname = 'ctd_immutable_facts';   -- 1 row

select column_name from information_schema.columns
where table_schema='public' and table_name='contractor_service_schedules'
  and column_name in ('tax_treatment','tax_treatment_note','supersedes_id') order by column_name;   -- 3 rows

select count(*) as policies from pg_policies
where schemaname='public' and tablename='contractor_tax_declarations';   -- 1

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   drop trigger if exists ctd_immutable_facts on public.contractor_tax_declarations;
--   drop function if exists public.ctd_block_fact_updates();
--   drop table if exists public.contractor_tax_declarations;
--   alter table public.contractor_service_schedules
--     drop column if exists tax_treatment, drop column if exists tax_treatment_note,
--     drop column if exists supersedes_id;
-- commit;
