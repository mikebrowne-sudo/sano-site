-- 2026-08-02 — Immutable contractor payment tax snapshots (PR 7).
--
-- The first table that PERSISTS computed tax figures. It stores the COMPLETE
-- canonical result of computeContractorPayment (contractor-payment-v1) verbatim —
-- no recalculation or reinterpretation on read. Once a snapshot is APPROVED it is
-- immutable: later GST / tax-declaration / service-schedule changes never alter
-- it; a correction creates a REPLACEMENT (superseding) row; the source ids +
-- calc version stay identifiable for audit.
--
-- HARD GATES: a snapshot may exist as a DRAFT in any calc status, but can only be
-- APPROVED (payable) when calc_status = 'ok'. blocked / pending_tax /
-- gst_unresolved / gst_incomplete / unsupported can NEVER be approved (CHECK +
-- app guard).
--
-- PR 7 scope: persist the snapshot + approve/supersede + read. NO IRD liability,
-- NO payday filing, NO payment to IRD, NO money movement, NO auto-backfill of
-- existing invoices. Nothing about Myrtle is created/approved/paid. The full IRD
-- number and internal review notes are NOT copied here (only the source ids are).
-- Additive + idempotent. Admin-only RLS. Mike-run.

-- ── Read-only preflight (expect 0 rows) ─────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public' and table_name='contractor_payment_tax_snapshots';

begin;

create table if not exists public.contractor_payment_tax_snapshots (
  id                    uuid primary key default gen_random_uuid(),
  snapshot_number       text,                        -- CPS-xxxx (assigned in app)
  contractor_id         uuid not null references public.contractors(id) on delete restrict,
  -- Link to a contractor_service_schedule version (the exact version used).
  service_schedule_id   uuid references public.contractor_service_schedules(id) on delete set null,
  schedule_version_key  text,

  -- ── The canonical computeContractorPayment result (verbatim) ──────────────
  calc_status           text not null
                          check (calc_status in ('ok','pending_tax','gst_unresolved','gst_incomplete','blocked','unsupported')),
  calc_reason           text,
  calc_version          text not null,               -- e.g. 'contractor-payment-v1'
  rounding_method       text,
  supply_date           date not null,
  payment_method        text,
  payment_basis         text,                        -- gross_fee | guaranteed_net
  rate_basis            text,                        -- gst_inclusive | gst_exclusive
  agreed_amount         numeric,
  tax_treatment         text,
  gst_resolution        text,                        -- registered | not_registered | unresolved
  -- Source identity used (for audit / re-explaining the figures) — NOT the full
  -- IRD number or review notes, only the row ids + type.
  gst_history_id        uuid references public.contractor_gst_history(id) on delete set null,
  tax_declaration_id    uuid references public.contractor_tax_declarations(id) on delete set null,
  declaration_type      text,
  withholding_rate      numeric,
  gross_ex_gst          numeric,
  gst_amount            numeric,
  gross_incl_gst        numeric,
  withholding_amount    numeric,
  net_bank              numeric,
  sano_cost             numeric,
  recoverable_gst       numeric,

  -- ── Lifecycle ─────────────────────────────────────────────────────────────
  status                text not null default 'draft'
                          check (status in ('draft','approved','superseded','void')),
  approved_at           timestamptz,
  approved_by           uuid references auth.users(id) on delete set null,
  -- Correction chain (immutability): a replacement supersedes the prior one.
  supersedes_id         uuid references public.contractor_payment_tax_snapshots(id) on delete set null,
  superseded_at         timestamptz,
  superseded_by_id      uuid references public.contractor_payment_tax_snapshots(id) on delete set null,
  correction_reason     text,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),

  -- HARD GATE: only a fully-resolved ('ok') calc may be approved.
  constraint cpts_approved_requires_ok
    check (status <> 'approved' or calc_status = 'ok')
);

create index if not exists cpts_contractor_idx on public.contractor_payment_tax_snapshots (contractor_id);
create index if not exists cpts_schedule_idx on public.contractor_payment_tax_snapshots (service_schedule_id);
create index if not exists cpts_status_idx on public.contractor_payment_tax_snapshots (status);

comment on table public.contractor_payment_tax_snapshots is
  'Immutable persisted result of computeContractorPayment (calc_version). Approved snapshots are frozen — a correction creates a superseding replacement (never overwrites); later GST/declaration/schedule changes do not alter an approved snapshot. Only a calc_status=ok result may be approved (hard gate). Stores source ids (gst_history_id, tax_declaration_id, schedule version) for audit, NOT the full IRD number or review notes. No IRD liability / filing / money movement here.';

-- Immutability: once APPROVED, reject any UPDATE that changes a fact column. A
-- draft may still be edited (re-previewed) before approval; only the lifecycle
-- columns (status→superseded/void, superseded_*) may change on an approved row.
create or replace function public.cpts_block_approved_fact_updates() returns trigger as $$
begin
  if old.status = 'approved' then
    if row(new.contractor_id, new.service_schedule_id, new.schedule_version_key, new.calc_status,
            new.calc_version, new.supply_date, new.payment_basis, new.rate_basis, new.agreed_amount,
            new.tax_treatment, new.gst_resolution, new.gst_history_id, new.tax_declaration_id,
            new.declaration_type, new.withholding_rate, new.gross_ex_gst, new.gst_amount,
            new.gross_incl_gst, new.withholding_amount, new.net_bank, new.sano_cost, new.recoverable_gst,
            new.approved_at, new.approved_by)
       is distinct from
       row(old.contractor_id, old.service_schedule_id, old.schedule_version_key, old.calc_status,
            old.calc_version, old.supply_date, old.payment_basis, old.rate_basis, old.agreed_amount,
            old.tax_treatment, old.gst_resolution, old.gst_history_id, old.tax_declaration_id,
            old.declaration_type, old.withholding_rate, old.gross_ex_gst, old.gst_amount,
            old.gross_incl_gst, old.withholding_amount, old.net_bank, old.sano_cost, old.recoverable_gst,
            old.approved_at, old.approved_by) then
      raise exception 'contractor_payment_tax_snapshots: an approved snapshot is immutable — create a superseding correction instead';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cpts_immutable_approved on public.contractor_payment_tax_snapshots;
create trigger cpts_immutable_approved before update on public.contractor_payment_tax_snapshots
  for each row execute function public.cpts_block_approved_fact_updates();

-- RLS — admin-only.
alter table public.contractor_payment_tax_snapshots enable row level security;
drop policy if exists "contractor_payment_tax_snapshots admin all" on public.contractor_payment_tax_snapshots;
create policy "contractor_payment_tax_snapshots admin all" on public.contractor_payment_tax_snapshots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public' and table_name='contractor_payment_tax_snapshots';   -- 1 row

select conname from pg_constraint where conrelid='public.contractor_payment_tax_snapshots'::regclass
  and conname='cpts_approved_requires_ok';   -- 1 row (the hard gate)

select tgname from pg_trigger where tgrelid='public.contractor_payment_tax_snapshots'::regclass
  and tgname='cpts_immutable_approved';   -- 1 row

select indexname from pg_indexes where schemaname='public' and tablename='contractor_payment_tax_snapshots'
  and indexname in ('cpts_contractor_idx','cpts_schedule_idx','cpts_status_idx') order by indexname;   -- 3 rows

select count(*) as policies from pg_policies where schemaname='public' and tablename='contractor_payment_tax_snapshots';  -- 1

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   drop trigger if exists cpts_immutable_approved on public.contractor_payment_tax_snapshots;
--   drop function if exists public.cpts_block_approved_fact_updates();
--   drop table if exists public.contractor_payment_tax_snapshots;
-- commit;
