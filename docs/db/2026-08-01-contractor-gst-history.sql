-- 2026-08-01 — Effective-dated contractor GST history (PR 5).
--
-- Immutable, superseding GST status per contractor — the GST analogue of the
-- contractor_tax_declarations model. Mirrors its lifecycle exactly so GST status
-- is captured, verified, superseded and DATE-RESOLVED (the GST status that
-- applied on a supply/payment date, not "whatever is current today").
--
-- The existing flat contractors.gst_* columns become a DERIVED CACHE of the
-- current verified row (kept in sync by the app). GST resolution
-- (resolveContractorPaymentGst) is unchanged — it just reads the window resolved
-- from this history for the relevant date.
--
-- PR 5 scope: CAPTURE, VERIFY, SUPERSEDE, DATE-RESOLVE GST status only. NO
-- withholding calc, NO invoice deductions, NO IRD liabilities, NO money movement.
-- GST is NEVER inferred from turnover — only from explicit, verified evidence, and
-- never applied before the verified effective date. Nothing sent to any
-- contractor. Additive + idempotent. Admin-only RLS; token reads via service-role
-- + a strict contractor-safe allowlist. Mike-run.

-- ── Read-only preflight (expect 0 rows) ─────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public' and table_name='contractor_gst_history';

begin;

create table if not exists public.contractor_gst_history (
  id                  uuid primary key default gen_random_uuid(),
  gst_number_ref      text,                          -- GST-record number (GSTR-xxxx) assigned in app
  contractor_id       uuid not null references public.contractors(id) on delete restrict,
  gst_registered      boolean not null,              -- the declared/verified state for this window
  gst_number          text,                          -- required when registered (CHECK below)
  effective_date      date,                          -- window start (registration effective date)
  end_date            date,                          -- window end / deregistration (null = open)
  evidence_ref        text,                          -- registration evidence (internal reference)
  signed_name         text,
  signed_at           timestamptz,
  declaration_text    text,
  declaration_version text,
  source              text not null default 'staff_recorded'
                        check (source in ('contractor_submitted','staff_recorded')),
  status              text not null default 'submitted'
                        check (status in ('submitted','verified','rejected','superseded')),
  verified_at         timestamptz,
  verified_by         uuid references auth.users(id) on delete set null,
  review_notes        text,                          -- STAFF-ONLY — never exposed via the token route
  supersedes_id       uuid references public.contractor_gst_history(id) on delete set null,
  superseded_at       timestamptz,
  superseded_by_id    uuid references public.contractor_gst_history(id) on delete set null,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now()
);

-- ── Consistency + verified-completeness CHECK constraints ───────────────────
do $$ begin
  -- A registered status must carry a GST number; not-registered must not require one.
  if not exists (select 1 from pg_constraint where conname='cgh_registered_number_chk') then
    alter table public.contractor_gst_history add constraint cgh_registered_number_chk
      check (gst_registered = false or (gst_number is not null and length(btrim(gst_number)) > 0));
  end if;
  -- end_date not before effective_date (when both present).
  if not exists (select 1 from pg_constraint where conname='cgh_end_after_effective_chk') then
    alter table public.contractor_gst_history add constraint cgh_end_after_effective_chk
      check (end_date is null or effective_date is null or end_date >= effective_date);
  end if;
  -- A VERIFIED registered status must have an effective date + signature + wording
  -- + verifier. (A verified NOT-registered status needs the signature/verifier but
  -- no effective date, since there is no registration window.)
  if not exists (select 1 from pg_constraint where conname='cgh_verified_complete_chk') then
    alter table public.contractor_gst_history add constraint cgh_verified_complete_chk check (
      status <> 'verified' or (
        signed_name is not null and signed_at is not null and
        declaration_text is not null and declaration_version is not null and
        verified_at is not null and verified_by is not null and
        (gst_registered = false or effective_date is not null)
      )
    );
  end if;
end $$;

create index if not exists cgh_contractor_idx on public.contractor_gst_history (contractor_id);
create index if not exists cgh_status_idx on public.contractor_gst_history (status);
-- SEPARATE one-of rules so a VERIFIED status and a PENDING replacement can coexist:
--   • at most ONE submitted (pending) per contractor;
--   • at most ONE current verified (not yet superseded) per contractor.
create unique index if not exists cgh_one_submitted_per_contractor
  on public.contractor_gst_history (contractor_id) where status = 'submitted';
create unique index if not exists cgh_one_current_verified_per_contractor
  on public.contractor_gst_history (contractor_id) where status = 'verified' and superseded_at is null;

comment on table public.contractor_gst_history is
  'Immutable, superseding contractor GST status history. Facts are append-only (see trigger); a correction creates a new row and supersedes the prior current one. A verified status and a pending replacement may coexist; the applicable status is selected by supply/payment date (not newest). GST is NEVER inferred from turnover — only explicit verified evidence, never applied before the verified effective date. contractors.gst_* is a derived cache of the current verified row. review_notes + verified_* are staff-only (never via the token route).';

-- Immutability: reject any UPDATE that changes a submitted FACT column. Only
-- lifecycle columns (status, verified_*, review_notes, superseded_*, supersedes_id)
-- may change. Runs for ALL writers, incl. service-role/admin.
create or replace function public.cgh_block_fact_updates() returns trigger as $$
begin
  if row(new.gst_number_ref, new.contractor_id, new.gst_registered, new.gst_number, new.effective_date,
          new.end_date, new.evidence_ref, new.signed_name, new.signed_at, new.declaration_text,
          new.declaration_version, new.source)
     is distinct from
     row(old.gst_number_ref, old.contractor_id, old.gst_registered, old.gst_number, old.effective_date,
          old.end_date, old.evidence_ref, old.signed_name, old.signed_at, old.declaration_text,
          old.declaration_version, old.source) then
    raise exception 'contractor_gst_history: submitted GST facts are immutable — a correction must create a new row';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cgh_immutable_facts on public.contractor_gst_history;
create trigger cgh_immutable_facts before update on public.contractor_gst_history
  for each row execute function public.cgh_block_fact_updates();

-- ── RLS — admin-only (token reads use the service-role client + app allowlist) ─
alter table public.contractor_gst_history enable row level security;
drop policy if exists "contractor_gst_history admin all" on public.contractor_gst_history;
create policy "contractor_gst_history admin all" on public.contractor_gst_history
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- ── Backfill (explicit, evidence-preserving — NOT an inference) ─────────────
-- Seed one verified history row per contractor that currently has a GST flag set,
-- from their EXISTING contractors.gst_* columns, so the history reflects what was
-- already recorded. This copies existing recorded state; it does not infer
-- registration from turnover. Run AFTER reviewing the counts; safe to skip and
-- record fresh declarations instead. Idempotent: only seeds contractors with no
-- history row yet.
--
-- insert into public.contractor_gst_history
--   (contractor_id, gst_registered, gst_number, effective_date, end_date,
--    declaration_text, declaration_version, source, status, verified_at, created_at)
-- select c.id, coalesce(c.gst_registered,false), c.gst_number, c.gst_effective_date, c.gst_end_date,
--        'Backfilled from the existing contractor GST record.', 'gst-backfill-2026-v1',
--        'staff_recorded', 'verified', now(), now()
-- from public.contractors c
-- where c.gst_registered is true
--   and not exists (select 1 from public.contractor_gst_history h where h.contractor_id = c.id);

-- ── Read-only verification ──────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public' and table_name='contractor_gst_history';   -- 1 row

select indexname from pg_indexes where schemaname='public' and tablename='contractor_gst_history'
  and indexname in ('cgh_contractor_idx','cgh_status_idx','cgh_one_submitted_per_contractor','cgh_one_current_verified_per_contractor')
order by indexname;   -- 4 rows

select conname from pg_constraint where conrelid='public.contractor_gst_history'::regclass
  and conname in ('cgh_registered_number_chk','cgh_end_after_effective_chk','cgh_verified_complete_chk')
order by conname;   -- 3 rows

select tgname from pg_trigger where tgrelid='public.contractor_gst_history'::regclass and tgname='cgh_immutable_facts';  -- 1 row

select count(*) as policies from pg_policies where schemaname='public' and tablename='contractor_gst_history';  -- 1

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   drop trigger if exists cgh_immutable_facts on public.contractor_gst_history;
--   drop function if exists public.cgh_block_fact_updates();
--   drop table if exists public.contractor_gst_history;
-- commit;
