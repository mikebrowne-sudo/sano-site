-- 2026-08-04 — Contractor remittance + statement tax snapshots (PR 9, revised).
--
-- Persists the per-line tax breakdown (gross ex GST, GST, withholding rate +
-- amount, net paid) onto contractor remittance items and freezes the same figures
-- into the immutable statement issued_snapshot.
--
-- EXPLICIT LINK ONLY (revised): the source snapshot is identified by an EXPLICIT
-- id carried on the payable — contractor_invoices.contractor_payment_snapshot_id —
-- set when a schedular/tax-bearing payable is created from an approved snapshot.
-- The remittance copies THAT exact id. There is NO (contractor_id, supply_date)
-- lookup: a same-day pair of payments is disambiguated purely by their explicit
-- ids. A payable with no snapshot id is an ordinary amount-only line.
--
-- The referenced snapshot is validated (exists, approved, calc ok, same
-- contractor, matches the payable's service schedule, not superseded/void) and the
-- frozen figures must match it EXACTLY — copied, never recomputed. One approved
-- snapshot backs at most one ACTIVE remittance item (a partial-unique index); a
-- reissue/correction supersedes the prior item and keeps explicit lineage.
--
-- SCOPE / GUARDRAILS: additive nullable columns only; ordinary contractors and
-- every existing remittance are unchanged. NO backfill, NO money movement, NO
-- Myrtle change. Source FKs ON DELETE RESTRICT. Additive + idempotent. Mike-run.

-- ── Read-only preflight ─────────────────────────────────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='contractor_remittance_items'
  and column_name in ('contractor_payment_snapshot_id','gross_ex_gst','gst_amount',
    'wht_rate','wht_amount','net_paid','tax_declaration_id','supply_date');  -- expect 0 rows
select column_name from information_schema.columns
where table_schema='public' and table_name='contractor_invoices'
  and column_name = 'contractor_payment_snapshot_id';  -- expect 0 rows

begin;

-- ── 1. Explicit link on the PAYABLE (source of truth) ───────────────────────
-- A schedular/tax-bearing contractor_invoice carries the exact approved snapshot
-- it was priced from. Null for every existing (ordinary) payable — unchanged.
alter table public.contractor_invoices
  add column if not exists contractor_payment_snapshot_id uuid
    references public.contractor_payment_tax_snapshots(id) on delete restrict;

comment on column public.contractor_invoices.contractor_payment_snapshot_id is
  'The APPROVED contractor_payment_tax_snapshots row this schedular/tax-bearing payable was priced from (PR 9). Set explicitly when the payable is created from a snapshot; NULL for ordinary amount-only payables. The remittance copies this exact id — never searched.';

-- ── 2. Remittance-item tax snapshot columns (all nullable, additive) ────────
alter table public.contractor_remittance_items
  add column if not exists contractor_payment_snapshot_id uuid
    references public.contractor_payment_tax_snapshots(id) on delete restrict,
  add column if not exists gross_ex_gst       numeric,
  add column if not exists gst_amount         numeric,
  add column if not exists wht_rate           numeric,
  add column if not exists wht_amount         numeric,
  add column if not exists net_paid           numeric,
  add column if not exists tax_declaration_id uuid
    references public.contractor_tax_declarations(id) on delete restrict,
  add column if not exists supply_date        date,
  -- Correction lineage: a reissued remittance item supersedes the prior one and
  -- records WHY. Lineage ref is ON DELETE RESTRICT so the chain can't be erased.
  add column if not exists tax_status         text not null default 'active'
    check (tax_status in ('active','superseded')),
  add column if not exists supersedes_item_id uuid
    references public.contractor_remittance_items(id) on delete restrict,
  add column if not exists correction_reason  text;

create index if not exists cri_payment_snapshot_idx
  on public.contractor_remittance_items (contractor_payment_snapshot_id);

-- One approved snapshot backs at most one ACTIVE remittance item. A reissue
-- supersedes the prior (tax_status='superseded') before the replacement goes
-- active, so the frozen tax is never double-counted across live remittances.
create unique index if not exists cri_one_active_snapshot_uidx
  on public.contractor_remittance_items (contractor_payment_snapshot_id)
  where contractor_payment_snapshot_id is not null and tax_status = 'active';

comment on column public.contractor_remittance_items.contractor_payment_snapshot_id is
  'The APPROVED snapshot this line was FROZEN from (copied verbatim from the payable''s explicit link). Null for ordinary/amount-only lines.';
comment on column public.contractor_remittance_items.wht_amount is
  'Frozen schedular withholding retained to IRD (from the approved snapshot). Null when not schedular / no snapshot.';
comment on column public.contractor_remittance_items.net_paid is
  'Frozen net paid to the contractor bank. Null when no snapshot.';

-- ── 3. Validate the referenced snapshot on INSERT (explicit id, exact copy) ──
create or replace function public.cri_validate_tax_snapshot() returns trigger as $$
declare s record; ci record;
begin
  if new.contractor_payment_snapshot_id is null then
    -- No snapshot ref → the tax columns must all be null (no orphan figures).
    if new.gross_ex_gst is not null or new.gst_amount is not null or new.wht_rate is not null
       or new.wht_amount is not null or new.net_paid is not null
       or new.tax_declaration_id is not null or new.supply_date is not null then
      raise exception 'contractor_remittance_items: tax figures require a contractor_payment_snapshot_id';
    end if;
    return new;
  end if;

  select status, calc_status, contractor_id, service_schedule_id, gross_ex_gst, gst_amount,
         withholding_rate, withholding_amount, net_bank, tax_declaration_id, supply_date
    into s
  from public.contractor_payment_tax_snapshots where id = new.contractor_payment_snapshot_id;
  if not found then
    raise exception 'contractor_remittance_items: payment snapshot % does not exist', new.contractor_payment_snapshot_id;
  end if;
  if s.status <> 'approved' or s.calc_status <> 'ok' then
    raise exception 'contractor_remittance_items: only an approved, ok snapshot can be frozen (status=%, calc=%)', s.status, s.calc_status;
  end if;
  if new.contractor_id is not null and s.contractor_id <> new.contractor_id then
    raise exception 'contractor_remittance_items: snapshot contractor does not match the line';
  end if;

  -- The snapshot must belong to the SAME payable being remitted: the payable's
  -- explicit link must equal this snapshot, and (where the snapshot names a
  -- schedule) the payable's schedule must match. Guards against attaching one
  -- payable's snapshot to another line.
  if new.contractor_invoice_id is not null then
    select contractor_payment_snapshot_id, contractor_id, service_schedule_id into ci
    from public.contractor_invoices where id = new.contractor_invoice_id;
    if ci.contractor_payment_snapshot_id is distinct from new.contractor_payment_snapshot_id then
      raise exception 'contractor_remittance_items: the payable is not linked to this snapshot (explicit link mismatch)';
    end if;
    if s.service_schedule_id is not null and ci.service_schedule_id is not null
       and s.service_schedule_id <> ci.service_schedule_id then
      raise exception 'contractor_remittance_items: snapshot service schedule does not match the payable';
    end if;
  end if;

  -- Exact frozen agreement — the line copies the snapshot, never reinterprets it.
  if s.gross_ex_gst        is distinct from new.gross_ex_gst
     or s.gst_amount       is distinct from new.gst_amount
     or s.withholding_rate is distinct from new.wht_rate
     or s.withholding_amount is distinct from new.wht_amount
     or s.net_bank         is distinct from new.net_paid
     or s.tax_declaration_id is distinct from new.tax_declaration_id
     or s.supply_date      is distinct from new.supply_date then
    raise exception 'contractor_remittance_items: frozen tax figures must match the approved snapshot exactly';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cri_validate_tax_snapshot_trg on public.contractor_remittance_items;
create trigger cri_validate_tax_snapshot_trg before insert on public.contractor_remittance_items
  for each row execute function public.cri_validate_tax_snapshot();

-- ── 4. Immutability: once frozen, the snapshot ref + tax figures never change.
-- Only the correction-lineage fields (tax_status active→superseded,
-- supersedes_item_id, correction_reason) may change, so a reissue can supersede. ─
create or replace function public.cri_freeze_tax_snapshot() returns trigger as $$
begin
  if old.contractor_payment_snapshot_id is null then
    return new;   -- ordinary line — unaffected.
  end if;
  if new.contractor_payment_snapshot_id is distinct from old.contractor_payment_snapshot_id
     or new.gross_ex_gst        is distinct from old.gross_ex_gst
     or new.gst_amount          is distinct from old.gst_amount
     or new.wht_rate            is distinct from old.wht_rate
     or new.wht_amount          is distinct from old.wht_amount
     or new.net_paid            is distinct from old.net_paid
     or new.tax_declaration_id  is distinct from old.tax_declaration_id
     or new.supply_date         is distinct from old.supply_date then
    raise exception 'contractor_remittance_items: frozen tax figures are immutable — supersede with a corrected remittance instead';
  end if;
  -- Superseding is one-way and requires a reason + a target.
  if old.tax_status = 'superseded' and new.tax_status <> 'superseded' then
    raise exception 'contractor_remittance_items: a superseded line cannot revert to active';
  end if;
  if new.tax_status = 'superseded' and old.tax_status = 'active'
     and (new.correction_reason is null or length(btrim(new.correction_reason)) = 0) then
    raise exception 'contractor_remittance_items: superseding a frozen line requires a correction_reason';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cri_freeze_tax_snapshot_trg on public.contractor_remittance_items;
create trigger cri_freeze_tax_snapshot_trg before update on public.contractor_remittance_items
  for each row execute function public.cri_freeze_tax_snapshot();

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name, is_nullable from information_schema.columns
where table_schema='public' and table_name='contractor_remittance_items'
  and column_name in ('contractor_payment_snapshot_id','gross_ex_gst','gst_amount',
    'wht_rate','wht_amount','net_paid','tax_declaration_id','supply_date',
    'tax_status','supersedes_item_id','correction_reason')
order by column_name;  -- 11 rows

select column_name from information_schema.columns
where table_schema='public' and table_name='contractor_invoices'
  and column_name = 'contractor_payment_snapshot_id';  -- 1 row

select tgname from pg_trigger where tgrelid='public.contractor_remittance_items'::regclass
  and tgname in ('cri_freeze_tax_snapshot_trg','cri_validate_tax_snapshot_trg') order by tgname;  -- 2 rows

select indexname from pg_indexes where schemaname='public'
  and tablename='contractor_remittance_items' and indexname='cri_one_active_snapshot_uidx';  -- 1 row

-- snapshot + declaration + payable-link FKs are ON DELETE RESTRICT ('r')
select conname, confdeltype from pg_constraint
where contype='f' and confdeltype='r'
  and conrelid in ('public.contractor_remittance_items'::regclass,'public.contractor_invoices'::regclass)
  and (conname like '%payment_snapshot%' or conname like '%tax_declaration%' or conname like '%supersedes_item%');

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   drop trigger if exists cri_validate_tax_snapshot_trg on public.contractor_remittance_items;
--   drop trigger if exists cri_freeze_tax_snapshot_trg on public.contractor_remittance_items;
--   drop function if exists public.cri_validate_tax_snapshot();
--   drop function if exists public.cri_freeze_tax_snapshot();
--   drop index if exists public.cri_one_active_snapshot_uidx;
--   alter table public.contractor_remittance_items
--     drop column if exists contractor_payment_snapshot_id, drop column if exists gross_ex_gst,
--     drop column if exists gst_amount, drop column if exists wht_rate, drop column if exists wht_amount,
--     drop column if exists net_paid, drop column if exists tax_declaration_id, drop column if exists supply_date,
--     drop column if exists tax_status, drop column if exists supersedes_item_id, drop column if exists correction_reason;
--   alter table public.contractor_invoices drop column if exists contractor_payment_snapshot_id;
-- commit;
