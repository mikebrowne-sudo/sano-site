-- 2026-08-04 — Contractor remittance + statement tax snapshots (PR 9).
--
-- Persists the per-line tax breakdown (gross ex GST, GST, withholding, net) onto
-- contractor remittance items and freezes the same figures into the immutable
-- statement issued_snapshot. Each remittance line optionally references the
-- APPROVED contractor_payment_tax_snapshots row (PR 7) it was frozen from, so the
-- figures are copied — never recomputed — and the source stays auditable.
--
-- SCOPE / GUARDRAILS:
--   * Additive columns only — all NULLABLE, defaulting to today's behaviour. An
--     ordinary contractor with no approved schedular snapshot keeps an amount-only
--     line (all tax columns null); nothing about existing remittances changes.
--   * NO backfill of historical remittance items. NO money movement. NO Myrtle
--     change. NO recomputation on read — figures are frozen at write time from the
--     approved snapshot.
--   * Snapshot FK is ON DELETE RESTRICT so a referenced approved snapshot can't be
--     deleted out from under a remittance line.
--   * Once a remittance line carries frozen tax figures, they are IMMUTABLE (a
--     trigger blocks changing the tax columns / snapshot ref after they're set);
--     the display columns (note/label/etc.) are untouched by this migration.
--
-- Additive + idempotent. Mike-run.

-- ── Read-only preflight ─────────────────────────────────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='contractor_remittance_items'
  and column_name in ('contractor_payment_snapshot_id','gross_ex_gst','gst_amount',
    'wht_rate','wht_amount','net_paid','tax_declaration_id','supply_date');  -- expect 0 rows

begin;

-- ── Remittance-item tax snapshot columns (all nullable, additive) ────────────
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
  add column if not exists supply_date        date;

create index if not exists cri_payment_snapshot_idx
  on public.contractor_remittance_items (contractor_payment_snapshot_id);

comment on column public.contractor_remittance_items.contractor_payment_snapshot_id is
  'The APPROVED contractor_payment_tax_snapshots row this line was FROZEN from (PR 9). Null for ordinary/non-schedular lines with no approved snapshot — those keep amount only.';
comment on column public.contractor_remittance_items.gross_ex_gst is
  'Frozen from the approved snapshot. GST-exclusive contractor fee. Null when no snapshot.';
comment on column public.contractor_remittance_items.wht_amount is
  'Frozen schedular withholding to IRD (from the approved snapshot). Null when not schedular / no snapshot.';
comment on column public.contractor_remittance_items.net_paid is
  'Frozen net paid to the contractor bank (gross_ex_gst + gst - wht). Null when no snapshot.';

-- ── Immutability: once a line carries a frozen snapshot ref, the tax figures +
--    the ref cannot change (a correction re-snapshots on a new remittance). The
--    display columns are unaffected. Lines with no snapshot ref are untouched. ──
create or replace function public.cri_freeze_tax_snapshot() returns trigger as $$
begin
  -- Only guard rows that were frozen from a snapshot.
  if old.contractor_payment_snapshot_id is null then
    return new;
  end if;
  if new.contractor_payment_snapshot_id is distinct from old.contractor_payment_snapshot_id
     or new.gross_ex_gst        is distinct from old.gross_ex_gst
     or new.gst_amount          is distinct from old.gst_amount
     or new.wht_rate            is distinct from old.wht_rate
     or new.wht_amount          is distinct from old.wht_amount
     or new.net_paid            is distinct from old.net_paid
     or new.tax_declaration_id  is distinct from old.tax_declaration_id
     or new.supply_date         is distinct from old.supply_date then
    raise exception 'contractor_remittance_items: frozen tax figures are immutable — re-snapshot on a new remittance instead';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cri_freeze_tax_snapshot_trg on public.contractor_remittance_items;
create trigger cri_freeze_tax_snapshot_trg before update on public.contractor_remittance_items
  for each row execute function public.cri_freeze_tax_snapshot();

-- ── Validate a referenced snapshot is genuinely APPROVED + same contractor and
--    that the frozen figures match it EXACTLY on insert (no reinterpretation). ─
create or replace function public.cri_validate_tax_snapshot() returns trigger as $$
declare s record;
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

  select status, calc_status, contractor_id, gross_ex_gst, gst_amount, withholding_rate,
         withholding_amount, net_bank, tax_declaration_id, supply_date
    into s
  from public.contractor_payment_tax_snapshots where id = new.contractor_payment_snapshot_id;
  if not found then
    raise exception 'contractor_remittance_items: payment snapshot % does not exist', new.contractor_payment_snapshot_id;
  end if;
  if s.status <> 'approved' or s.calc_status <> 'ok' then
    raise exception 'contractor_remittance_items: only an approved, ok snapshot can be frozen onto a remittance line';
  end if;
  if new.contractor_id is not null and s.contractor_id <> new.contractor_id then
    raise exception 'contractor_remittance_items: snapshot contractor does not match the line';
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

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name, is_nullable from information_schema.columns
where table_schema='public' and table_name='contractor_remittance_items'
  and column_name in ('contractor_payment_snapshot_id','gross_ex_gst','gst_amount',
    'wht_rate','wht_amount','net_paid','tax_declaration_id','supply_date')
order by column_name;  -- 8 rows, all is_nullable = YES

select tgname from pg_trigger where tgrelid='public.contractor_remittance_items'::regclass
  and tgname in ('cri_freeze_tax_snapshot_trg','cri_validate_tax_snapshot_trg') order by tgname;  -- 2 rows

-- snapshot + declaration FKs are ON DELETE RESTRICT ('r')
select conname, confdeltype from pg_constraint
where conrelid='public.contractor_remittance_items'::regclass and contype='f'
  and (conname like '%payment_snapshot%' or conname like '%tax_declaration%');

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   drop trigger if exists cri_validate_tax_snapshot_trg on public.contractor_remittance_items;
--   drop trigger if exists cri_freeze_tax_snapshot_trg on public.contractor_remittance_items;
--   drop function if exists public.cri_validate_tax_snapshot();
--   drop function if exists public.cri_freeze_tax_snapshot();
--   alter table public.contractor_remittance_items
--     drop column if exists contractor_payment_snapshot_id,
--     drop column if exists gross_ex_gst, drop column if exists gst_amount,
--     drop column if exists wht_rate, drop column if exists wht_amount,
--     drop column if exists net_paid, drop column if exists tax_declaration_id,
--     drop column if exists supply_date;
-- commit;
