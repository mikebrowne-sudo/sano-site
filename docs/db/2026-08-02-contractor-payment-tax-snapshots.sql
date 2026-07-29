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
  -- Source refs use ON DELETE RESTRICT so an approved snapshot can NEVER silently
  -- lose its audit references — the source schedule/declaration/GST row cannot be
  -- deleted while a snapshot references it.
  service_schedule_id   uuid references public.contractor_service_schedules(id) on delete restrict,
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
  gst_history_id        uuid references public.contractor_gst_history(id) on delete restrict,
  tax_declaration_id    uuid references public.contractor_tax_declarations(id) on delete restrict,
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

  -- HARD GATE: an APPROVED snapshot requires a resolved calc AND approval metadata.
  constraint cpts_approved_requires_ok
    check (status <> 'approved' or (calc_status = 'ok' and approved_at is not null and approved_by is not null)),
  -- Lifecycle consistency: a SUPERSEDED row must carry its supersession metadata.
  constraint cpts_superseded_requires_meta
    check (status <> 'superseded' or (superseded_at is not null and superseded_by_id is not null)),
  -- No self-supersession (either direction).
  constraint cpts_no_self_supersede check (superseded_by_id is null or superseded_by_id <> id),
  constraint cpts_no_self_supersedes check (supersedes_id is null or supersedes_id <> id)
);

create index if not exists cpts_contractor_idx on public.contractor_payment_tax_snapshots (contractor_id);
create index if not exists cpts_schedule_idx on public.contractor_payment_tax_snapshots (service_schedule_id);
create index if not exists cpts_status_idx on public.contractor_payment_tax_snapshots (status);

comment on table public.contractor_payment_tax_snapshots is
  'Immutable persisted result of computeContractorPayment (calc_version). Approved snapshots are frozen — a correction creates a superseding replacement (never overwrites); later GST/declaration/schedule changes do not alter an approved snapshot. Only a calc_status=ok result may be approved (hard gate). Stores source ids (gst_history_id, tax_declaration_id, schedule version) for audit, NOT the full IRD number or review notes. No IRD liability / filing / money movement here.';

-- Immutability: once APPROVED, reject any UPDATE that changes ANY canonical
-- calculation/identity field OR the created/approved metadata. ONLY the four
-- controlled lifecycle columns (status, superseded_at, superseded_by_id,
-- correction_reason) may change on an approved row — and only to supersede/void
-- it via the dedicated server action. Compares the FULL row EXCEPT those four.
create or replace function public.cpts_block_approved_fact_updates() returns trigger as $$
begin
  if old.status = 'approved' then
    if row(new.snapshot_number, new.contractor_id, new.service_schedule_id, new.schedule_version_key,
            new.calc_status, new.calc_reason, new.calc_version, new.rounding_method, new.supply_date,
            new.payment_method, new.payment_basis, new.rate_basis, new.agreed_amount, new.tax_treatment,
            new.gst_resolution, new.gst_history_id, new.tax_declaration_id, new.declaration_type,
            new.withholding_rate, new.gross_ex_gst, new.gst_amount, new.gross_incl_gst,
            new.withholding_amount, new.net_bank, new.sano_cost, new.recoverable_gst,
            new.supersedes_id, new.approved_at, new.approved_by, new.created_by, new.created_at)
       is distinct from
       row(old.snapshot_number, old.contractor_id, old.service_schedule_id, old.schedule_version_key,
            old.calc_status, old.calc_reason, old.calc_version, old.rounding_method, old.supply_date,
            old.payment_method, old.payment_basis, old.rate_basis, old.agreed_amount, old.tax_treatment,
            old.gst_resolution, old.gst_history_id, old.tax_declaration_id, old.declaration_type,
            old.withholding_rate, old.gross_ex_gst, old.gst_amount, old.gross_incl_gst,
            old.withholding_amount, old.net_bank, old.sano_cost, old.recoverable_gst,
            old.supersedes_id, old.approved_at, old.approved_by, old.created_by, old.created_at) then
      raise exception 'contractor_payment_tax_snapshots: an approved snapshot is immutable — only supersede/void it (create a correction) — do not edit its fields';
    end if;
    -- An approved row may only transition to superseded or void.
    if new.status not in ('approved','superseded','void') then
      raise exception 'contractor_payment_tax_snapshots: an approved snapshot can only become superseded or void';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cpts_immutable_approved on public.contractor_payment_tax_snapshots;
create trigger cpts_immutable_approved before update on public.contractor_payment_tax_snapshots
  for each row execute function public.cpts_block_approved_fact_updates();

-- No physical deletion of an approved/superseded/void snapshot — financial records
-- must persist for audit. A DRAFT that was never approved may be deleted (by the
-- admin-gated action). Corrections create a replacement + preserve the original.
create or replace function public.cpts_block_delete_final() returns trigger as $$
begin
  if old.status in ('approved','superseded','void') then
    raise exception 'contractor_payment_tax_snapshots: an approved/superseded/void snapshot cannot be deleted — it is a retained financial record';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists cpts_block_delete on public.contractor_payment_tax_snapshots;
create trigger cpts_block_delete before delete on public.contractor_payment_tax_snapshots
  for each row execute function public.cpts_block_delete_final();

-- Cross-row: a superseding replacement must belong to the SAME contractor as the
-- snapshot it supersedes (a correction can't re-point to another contractor).
create or replace function public.cpts_same_contractor_supersession() returns trigger as $$
declare prior_contractor uuid;
begin
  if new.supersedes_id is not null then
    select contractor_id into prior_contractor from public.contractor_payment_tax_snapshots where id = new.supersedes_id;
    if prior_contractor is not null and prior_contractor <> new.contractor_id then
      raise exception 'contractor_payment_tax_snapshots: a correction must belong to the same contractor as the snapshot it supersedes';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cpts_same_contractor on public.contractor_payment_tax_snapshots;
create trigger cpts_same_contractor before insert or update on public.contractor_payment_tax_snapshots
  for each row execute function public.cpts_same_contractor_supersession();

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
  and conname in ('cpts_approved_requires_ok','cpts_superseded_requires_meta','cpts_no_self_supersede','cpts_no_self_supersedes')
order by conname;   -- 4 rows

select tgname from pg_trigger where tgrelid='public.contractor_payment_tax_snapshots'::regclass
  and tgname in ('cpts_immutable_approved','cpts_block_delete','cpts_same_contractor') order by tgname;   -- 3 rows

-- Source FKs must be ON DELETE RESTRICT (approved snapshots never lose audit refs).
select conname, confdeltype from pg_constraint
where conrelid='public.contractor_payment_tax_snapshots'::regclass and contype='f'
  and conname like '%service_schedule%' or conname like '%gst_history%' or conname like '%tax_declaration%';
-- confdeltype should be 'r' (RESTRICT) for service_schedule_id / gst_history_id / tax_declaration_id.

select indexname from pg_indexes where schemaname='public' and tablename='contractor_payment_tax_snapshots'
  and indexname in ('cpts_contractor_idx','cpts_schedule_idx','cpts_status_idx') order by indexname;   -- 3 rows

select count(*) as policies from pg_policies where schemaname='public' and tablename='contractor_payment_tax_snapshots';  -- 1

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   drop trigger if exists cpts_same_contractor on public.contractor_payment_tax_snapshots;
--   drop trigger if exists cpts_block_delete on public.contractor_payment_tax_snapshots;
--   drop trigger if exists cpts_immutable_approved on public.contractor_payment_tax_snapshots;
--   drop function if exists public.cpts_same_contractor_supersession();
--   drop function if exists public.cpts_block_delete_final();
--   drop function if exists public.cpts_block_approved_fact_updates();
--   drop table if exists public.contractor_payment_tax_snapshots;
-- commit;
