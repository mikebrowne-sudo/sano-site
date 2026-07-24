-- ============================================================================
-- Phase 3 — worker_tax_declarations (immutable IR330 electronic declarations).
-- Mike-run. ADDITIVE + IDEMPOTENT. Creates a NEW table only; touches no
-- existing table or row. No employee is activated / deactivated / re-gated.
-- ============================================================================
-- The declaration record is the source of truth. Submitted facts are frozen by
-- a trigger (a correction must create a NEW declaration that supersedes the
-- prior one). Only lifecycle fields (verification + supersession) may change,
-- and those are audited by the application.
--
-- RLS is written against the ACTUAL model: helper fns is_admin() / is_contractor()
-- exist (is_finance() too); there is NO is_staff(). "Staff" is defined here as an
-- admin OR an active row in the `staff` registry (NOT `not is_contractor()`, which
-- would admit non-staff authenticated logins). Workers link to auth via
-- contractors.auth_user_id.
--
-- RETENTION: this table is append-only (no delete path in the app), the worker FK
-- is ON DELETE RESTRICT, and declaration_number is unique. Records are retained
-- for at least 7 years (NZ employer record-keeping) — a correction supersedes,
-- never deletes.
--
-- Run PREFLIGHT first, then MIGRATION.
-- ============================================================================


-- ---- PREFLIGHT (read-only) --------------------------------------------------
-- Table must not already exist:
select to_regclass('public.worker_tax_declarations') as existing_table;   -- expect null
-- Helper functions present (expect is_admin + is_contractor):
select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and proname in ('is_admin','is_contractor');
-- Staff registry the staff-only RLS relies on (expect the staff table + the
-- auth_user_id / access_disabled_at columns it references):
select column_name from information_schema.columns
where table_schema='public' and table_name='staff' and column_name in ('auth_user_id','access_disabled_at');
-- Employees in scope (context for the legacy report):
select count(*) filter (where worker_type='employee') as employees,
       count(*) filter (where worker_type='employee' and status='active') as active_employees
from public.contractors;


-- ---- MIGRATION --------------------------------------------------------------
begin;

create sequence if not exists public.worker_tax_declaration_number_seq;

create table if not exists public.worker_tax_declarations (
  id                          uuid primary key default gen_random_uuid(),
  declaration_number          text not null unique default ('TAX-' || lpad(nextval('public.worker_tax_declaration_number_seq')::text, 4, '0')),
  -- ON DELETE RESTRICT for 7-year retention: a worker with tax declarations
  -- cannot be hard-deleted (the tax record must be retained). Archive instead.
  worker_id                   uuid not null references public.contractors(id) on delete restrict,

  -- Immutable submitted facts (frozen by trigger) --------------------------
  declaration_type            text not null default 'ir330',
  declaration_version         text not null,
  employee_legal_name         text not null,
  ird_number                  text,
  declared_tax_code           text not null,
  has_student_loan            boolean not null default false,
  selections                  jsonb not null default '{}'::jsonb,
  declaration_text            text not null,   -- exact wording agreed, stored per-row
  acknowledged                boolean not null default true,
  signed_name                 text not null,   -- electronic signature (typed legal name)
  submitted_at                timestamptz not null default now(),
  submitted_via               text not null default 'agreement_wizard',
  agreement_id                uuid,

  -- Lifecycle (mutable, audited) -------------------------------------------
  status                      text not null default 'submitted',
  applied_tax_code            text,            -- payroll code staff confirmed at verification
  payroll_effective_date      date,
  verified_at                 timestamptz,
  verified_by                 uuid references auth.users(id) on delete set null,
  supersedes_declaration_id   uuid references public.worker_tax_declarations(id) on delete set null,
  superseded_at               timestamptz,
  superseded_by_declaration_id uuid references public.worker_tax_declarations(id) on delete set null,

  created_at                  timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname='worker_tax_declarations_type_chk') then
    alter table public.worker_tax_declarations add constraint worker_tax_declarations_type_chk
      check (declaration_type in ('ir330'));
  end if;
  if not exists (select 1 from pg_constraint where conname='worker_tax_declarations_status_chk') then
    alter table public.worker_tax_declarations add constraint worker_tax_declarations_status_chk
      check (status in ('submitted','verified','superseded'));
  end if;
end $$;

create index if not exists wtd_worker_idx on public.worker_tax_declarations (worker_id);
create index if not exists wtd_status_idx on public.worker_tax_declarations (status);
-- At most ONE current (non-superseded) declaration per worker.
create unique index if not exists wtd_one_current_per_worker
  on public.worker_tax_declarations (worker_id) where status <> 'superseded';

-- Immutability: reject any UPDATE that changes a submitted-fact column. Only
-- lifecycle fields may change. Runs for ALL writers (incl. service-role/admin).
create or replace function public.wtd_block_fact_updates() returns trigger as $$
begin
  if row(new.declaration_number, new.worker_id, new.declaration_type, new.declaration_version,
          new.employee_legal_name, new.ird_number, new.declared_tax_code, new.has_student_loan,
          new.selections, new.declaration_text, new.acknowledged, new.signed_name,
          new.submitted_at, new.submitted_via, new.agreement_id)
     is distinct from
     row(old.declaration_number, old.worker_id, old.declaration_type, old.declaration_version,
          old.employee_legal_name, old.ird_number, old.declared_tax_code, old.has_student_loan,
          old.selections, old.declaration_text, old.acknowledged, old.signed_name,
          old.submitted_at, old.submitted_via, old.agreement_id) then
    raise exception 'worker_tax_declarations: submitted declaration facts are immutable — a correction must create a new declaration';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists wtd_immutable_facts on public.worker_tax_declarations;
create trigger wtd_immutable_facts before update on public.worker_tax_declarations
  for each row execute function public.wtd_block_fact_updates();

-- RLS ----------------------------------------------------------------------
alter table public.worker_tax_declarations enable row level security;

-- Genuinely staff-only READ: an admin, OR an active member of the staff
-- registry. Deliberately NOT `not is_contractor()` — that admits any
-- authenticated non-contractor (e.g. future client-portal logins). Tax
-- declarations are sensitive PII, so this is restricted to internal Sano staff.
-- (The external accountant/finance role is NOT granted read here by design; add
--  `or public.is_finance()` only if that access is explicitly required.)
drop policy if exists wtd_staff_read on public.worker_tax_declarations;
create policy wtd_staff_read on public.worker_tax_declarations
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.staff s
      where s.auth_user_id = auth.uid() and s.access_disabled_at is null
    )
  );

-- A worker may READ ONLY THEIR OWN declaration (blocks cross-worker access).
drop policy if exists wtd_worker_own_read on public.worker_tax_declarations;
create policy wtd_worker_own_read on public.worker_tax_declarations
  for select using (
    exists (select 1 from public.contractors c where c.id = worker_id and c.auth_user_id = auth.uid())
  );

-- Only admins may INSERT / UPDATE via the user client (the sign flow uses the
-- service-role client, which bypasses RLS). No public access; no delete policy.
drop policy if exists wtd_admin_insert on public.worker_tax_declarations;
create policy wtd_admin_insert on public.worker_tax_declarations
  for insert with check (public.is_admin());

drop policy if exists wtd_admin_update on public.worker_tax_declarations;
create policy wtd_admin_update on public.worker_tax_declarations
  for update using (public.is_admin()) with check (public.is_admin());

commit;


-- ---- VERIFICATION (read-only) -----------------------------------------------
select to_regclass('public.worker_tax_declarations') as table_created;        -- not null
select conname, pg_get_constraintdef(oid) from pg_constraint
where conrelid='public.worker_tax_declarations'::regclass;                    -- incl. unique(declaration_number) + FK ON DELETE RESTRICT
select indexname from pg_indexes where schemaname='public' and tablename='worker_tax_declarations';  -- incl. a unique index on declaration_number
select policyname, cmd, qual from pg_policies where schemaname='public' and tablename='worker_tax_declarations' order by policyname;  -- wtd_staff_read must use is_admin() + staff registry, NOT is_contractor()
select tgname from pg_trigger where tgrelid='public.worker_tax_declarations'::regclass and not tgisinternal;
select relrowsecurity from pg_class where oid='public.worker_tax_declarations'::regclass;  -- expect true
-- Retention: worker FK is ON DELETE RESTRICT (declarations can't be cascade-deleted):
select confdeltype from pg_constraint where conrelid='public.worker_tax_declarations'::regclass and contype='f' and conname like '%worker_id%';  -- expect 'r'


-- ---- ROLLBACK ---------------------------------------------------------------
-- begin;
--   drop table if exists public.worker_tax_declarations cascade;
--   drop function if exists public.wtd_block_fact_updates();
--   drop sequence if exists public.worker_tax_declaration_number_seq;
-- commit;
