-- 2026-08-03 — Contractor schedular withholding liability + filing (PR 8, revised).
--
-- Contractor schedular withholding, kept STRICTLY SEPARATE from the employee
-- PAYE/KiwiSaver ledger. A withholding line is created from an APPROVED payment
-- tax snapshot (contractor_payment_tax_snapshots, PR 7) and FROZEN from it —
-- enforced by a DB trigger that re-validates the snapshot and requires the line's
-- frozen figures to match it exactly (no reinterpretation/recompute).
--
-- Its own period table (contractor_withholding_periods) — NOT the shared
-- ird_liabilities — so contractor withholding can never be attached to a PAYE/GST
-- period. Filing is MANUAL (status flags, no electronic transmission). Payments
-- are RECORDED (not initiated) and are themselves immutable + reversible (never
-- edited/deleted). NO money movement, NO auto-pay, NO backfill, Myrtle untouched.
--
-- Additive + idempotent. Admin-only RLS. Mike-run.

-- ── Read-only preflight (expect 0 rows) ─────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public' and table_name='contractor_withholding_lines';
-- Note: ird_liabilities has NO liability_type discriminator (period_key is unique
-- and shared by the employee ledger), so contractor withholding uses its OWN
-- period table below to avoid intermixing with PAYE/GST liabilities.

begin;

-- ── Contractor-withholding PERIOD (isolated from ird_liabilities) ───────────
create table if not exists public.contractor_withholding_periods (
  id           uuid primary key default gen_random_uuid(),
  period_key   text not null unique,          -- 'YYYY-MM' (contractor withholding only)
  period_start date not null,
  period_end   date not null,
  due_date     date not null,                 -- 20th of the following month
  created_at   timestamptz not null default now()
);
comment on table public.contractor_withholding_periods is
  'Contractor schedular-withholding IRD periods — separate from the employee ird_liabilities ledger so the two streams never intermix. Monthly, due the 20th following.';

-- ── Withholding LINES ───────────────────────────────────────────────────────
create table if not exists public.contractor_withholding_lines (
  id                    uuid primary key default gen_random_uuid(),
  line_number           text,
  withholding_period_id uuid not null references public.contractor_withholding_periods(id) on delete restrict,
  contractor_id         uuid not null references public.contractors(id) on delete restrict,
  payment_snapshot_id   uuid not null unique references public.contractor_payment_tax_snapshots(id) on delete restrict,
  payday                date not null,
  supply_date           date not null,
  withholding_rate      numeric not null,
  gross_ex_gst          numeric not null,
  withholding_amount    numeric not null,
  net_bank              numeric not null,
  calc_version          text not null,
  filing_status         text not null default 'not_filed'
                          check (filing_status in ('not_filed','filed','accepted','correction_required')),
  filed_at              timestamptz,
  filed_by              uuid references auth.users(id) on delete set null,
  filing_reference      text,
  status                text not null default 'active'
                          check (status in ('active','superseded','void')),
  -- Lineage refs are ON DELETE RESTRICT so the audit chain can't be erased.
  supersedes_id         uuid references public.contractor_withholding_lines(id) on delete restrict,
  superseded_at         timestamptz,
  superseded_by_id      uuid references public.contractor_withholding_lines(id) on delete restrict,
  correction_reason     text,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  constraint cwl_no_self_supersede check (superseded_by_id is null or superseded_by_id <> id),
  constraint cwl_no_self_supersedes check (supersedes_id is null or supersedes_id <> id),
  -- Filing lifecycle consistency (§2):
  constraint cwl_not_filed_no_meta
    check (filing_status <> 'not_filed' or (filed_at is null and filed_by is null)),
  constraint cwl_filed_requires_meta
    check (filing_status = 'not_filed' or (filed_at is not null and filed_by is not null)),
  -- filing_reference optional for 'filed' (IRD may not return it immediately) but
  -- REQUIRED before 'accepted'.
  constraint cwl_accepted_requires_reference
    check (filing_status <> 'accepted' or (filing_reference is not null and length(btrim(filing_reference)) > 0)),
  -- Lifecycle metadata (§2):
  constraint cwl_superseded_requires_meta
    check (status <> 'superseded' or (superseded_at is not null and superseded_by_id is not null and correction_reason is not null)),
  constraint cwl_void_requires_reason
    check (status <> 'void' or correction_reason is not null)
);

create index if not exists cwl_period_idx on public.contractor_withholding_lines (withholding_period_id);
create index if not exists cwl_contractor_idx on public.contractor_withholding_lines (contractor_id);
create index if not exists cwl_status_idx on public.contractor_withholding_lines (status, filing_status);

comment on table public.contractor_withholding_lines is
  'Contractor schedular withholding lines, each created from an APPROVED payment tax snapshot (source of truth) and FROZEN — a DB trigger re-validates the snapshot (approved/ok/schedular/same-contractor/wht>0) and requires the frozen figures to match it exactly. Keyed to a contractor_withholding_periods row (never the employee ird_liabilities). Filing is manual; payment recorded not initiated. A correction supersedes (never overwrites). No money movement.';

-- §1 — Validate the approved snapshot + exact frozen agreement ON INSERT.
create or replace function public.cwl_validate_snapshot() returns trigger as $$
declare s record;
begin
  select status, calc_status, tax_treatment, contractor_id, supply_date, withholding_rate,
         gross_ex_gst, withholding_amount, net_bank, calc_version
    into s
  from public.contractor_payment_tax_snapshots where id = new.payment_snapshot_id;
  if not found then
    raise exception 'contractor_withholding_lines: payment snapshot % does not exist', new.payment_snapshot_id;
  end if;
  if s.status <> 'approved' then raise exception 'contractor_withholding_lines: snapshot must be approved (is %)', s.status; end if;
  if s.calc_status <> 'ok' then raise exception 'contractor_withholding_lines: snapshot calc must be ok (is %)', s.calc_status; end if;
  if s.tax_treatment <> 'schedular_payment' then raise exception 'contractor_withholding_lines: snapshot must be schedular_payment (is %)', s.tax_treatment; end if;
  if coalesce(s.withholding_amount,0) <= 0 then raise exception 'contractor_withholding_lines: snapshot has no withholding'; end if;
  if s.contractor_id <> new.contractor_id then raise exception 'contractor_withholding_lines: contractor mismatch with snapshot'; end if;
  -- Exact frozen agreement — the line may not reinterpret the snapshot.
  if s.supply_date is distinct from new.supply_date
     or s.withholding_rate is distinct from new.withholding_rate
     or s.gross_ex_gst is distinct from new.gross_ex_gst
     or s.withholding_amount is distinct from new.withholding_amount
     or s.net_bank is distinct from new.net_bank
     or s.calc_version is distinct from new.calc_version then
    raise exception 'contractor_withholding_lines: line figures must match the snapshot exactly (no recalculation)';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cwl_validate_snapshot_trg on public.contractor_withholding_lines;
create trigger cwl_validate_snapshot_trg before insert on public.contractor_withholding_lines
  for each row execute function public.cwl_validate_snapshot();

-- §2 — Immutability: frozen facts + source refs never change; accepted can't
-- revert to not_filed; filed/accepted can't have filing metadata cleared.
create or replace function public.cwl_block_fact_updates() returns trigger as $$
begin
  -- Frozen facts (incl. source snapshot + amounts) never change.
  if row(new.line_number, new.withholding_period_id, new.contractor_id, new.payment_snapshot_id, new.payday,
          new.supply_date, new.withholding_rate, new.gross_ex_gst, new.withholding_amount, new.net_bank,
          new.calc_version, new.supersedes_id, new.created_by, new.created_at)
     is distinct from
     row(old.line_number, old.withholding_period_id, old.contractor_id, old.payment_snapshot_id, old.payday,
          old.supply_date, old.withholding_rate, old.gross_ex_gst, old.withholding_amount, old.net_bank,
          old.calc_version, old.supersedes_id, old.created_by, old.created_at) then
    raise exception 'contractor_withholding_lines: a withholding line is immutable — create a superseding correction instead';
  end if;
  -- accepted is terminal for filing — cannot revert to not_filed.
  if old.filing_status = 'accepted' and new.filing_status = 'not_filed' then
    raise exception 'contractor_withholding_lines: an accepted filing cannot revert to not_filed';
  end if;
  -- filed/accepted cannot have their filing metadata cleared.
  if old.filing_status in ('filed','accepted') and (new.filed_at is null or new.filed_by is null) then
    raise exception 'contractor_withholding_lines: filing metadata cannot be cleared once filed';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cwl_immutable on public.contractor_withholding_lines;
create trigger cwl_immutable before update on public.contractor_withholding_lines
  for each row execute function public.cwl_block_fact_updates();

-- §2 — Same-contractor supersession (cross-row).
create or replace function public.cwl_same_contractor() returns trigger as $$
declare prior_contractor uuid;
begin
  if new.supersedes_id is not null then
    select contractor_id into prior_contractor from public.contractor_withholding_lines where id = new.supersedes_id;
    if prior_contractor is not null and prior_contractor <> new.contractor_id then
      raise exception 'contractor_withholding_lines: a correction must belong to the same contractor';
    end if;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cwl_same_contractor_trg on public.contractor_withholding_lines;
create trigger cwl_same_contractor_trg before insert or update on public.contractor_withholding_lines
  for each row execute function public.cwl_same_contractor();

-- No deletion of a filed/superseded/void line (retained record). An active,
-- not-yet-filed line may be deleted by the admin-gated action only.
create or replace function public.cwl_block_delete() returns trigger as $$
begin
  if old.status in ('superseded','void') or old.filing_status <> 'not_filed' then
    raise exception 'contractor_withholding_lines: a filed/superseded/void line cannot be deleted — it is a retained record';
  end if;
  return old;
end;
$$ language plpgsql;

drop trigger if exists cwl_block_delete_trg on public.contractor_withholding_lines;
create trigger cwl_block_delete_trg before delete on public.contractor_withholding_lines
  for each row execute function public.cwl_block_delete();

-- ── Recorded IRD PAYMENTS (§3) — immutable + reversible, never edited/deleted ─
create table if not exists public.contractor_withholding_payments (
  id                uuid primary key default gen_random_uuid(),
  withholding_period_id uuid not null references public.contractor_withholding_periods(id) on delete restrict,
  payment_date      date not null,
  amount            numeric not null check (amount > 0),
  ird_reference     text,
  notes             text,
  -- Reversal (never edit/delete): a reversal preserves the original + a reason.
  status            text not null default 'active' check (status in ('active','reversed')),
  reversed_at       timestamptz,
  reversed_by       uuid references auth.users(id) on delete set null,
  reversal_reason   text,
  reverses_id       uuid references public.contractor_withholding_payments(id) on delete restrict,
  recorded_by       uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  constraint cwp_reversed_requires_reason
    check (status <> 'reversed' or (reversed_at is not null and reversal_reason is not null))
);
create index if not exists cwp_period_idx on public.contractor_withholding_payments (withholding_period_id);

comment on table public.contractor_withholding_payments is
  'Recorded (not initiated) IRD payments for contractor schedular withholding. Immutable once inserted (trigger); an incorrect payment is REVERSED (status=reversed + reason), never edited/deleted; a corrective payment references reverses_id. Records an existing transfer — Sano never initiates a payment.';

-- Freeze payment facts after insert; only the reversal fields may change.
create or replace function public.cwp_block_fact_updates() returns trigger as $$
begin
  if row(new.withholding_period_id, new.payment_date, new.amount, new.ird_reference, new.reverses_id,
          new.recorded_by, new.created_at)
     is distinct from
     row(old.withholding_period_id, old.payment_date, old.amount, old.ird_reference, old.reverses_id,
          old.recorded_by, old.created_at) then
    raise exception 'contractor_withholding_payments: a recorded payment is immutable — reverse it (do not edit)';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cwp_immutable on public.contractor_withholding_payments;
create trigger cwp_immutable before update on public.contractor_withholding_payments
  for each row execute function public.cwp_block_fact_updates();

-- No physical deletion of a recorded payment.
create or replace function public.cwp_block_delete() returns trigger as $$
begin
  raise exception 'contractor_withholding_payments: recorded payments cannot be deleted — reverse them instead';
end;
$$ language plpgsql;

drop trigger if exists cwp_block_delete_trg on public.contractor_withholding_payments;
create trigger cwp_block_delete_trg before delete on public.contractor_withholding_payments
  for each row execute function public.cwp_block_delete();

-- RLS — admin-only.
alter table public.contractor_withholding_periods enable row level security;
alter table public.contractor_withholding_lines enable row level security;
alter table public.contractor_withholding_payments enable row level security;
drop policy if exists "cwp_periods admin all" on public.contractor_withholding_periods;
create policy "cwp_periods admin all" on public.contractor_withholding_periods
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "cwl admin all" on public.contractor_withholding_lines;
create policy "cwl admin all" on public.contractor_withholding_lines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "cwp admin all" on public.contractor_withholding_payments;
create policy "cwp admin all" on public.contractor_withholding_payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select table_name from information_schema.tables where table_schema='public'
  and table_name in ('contractor_withholding_periods','contractor_withholding_lines','contractor_withholding_payments') order by table_name;  -- 3 rows

select tgname from pg_trigger where tgrelid='public.contractor_withholding_lines'::regclass
  and tgname in ('cwl_validate_snapshot_trg','cwl_immutable','cwl_same_contractor_trg','cwl_block_delete_trg') order by tgname;  -- 4 rows

select tgname from pg_trigger where tgrelid='public.contractor_withholding_payments'::regclass
  and tgname in ('cwp_immutable','cwp_block_delete_trg') order by tgname;  -- 2 rows

select conname from pg_constraint where conrelid='public.contractor_withholding_lines'::regclass
  and conname in ('cwl_not_filed_no_meta','cwl_filed_requires_meta','cwl_accepted_requires_reference',
    'cwl_superseded_requires_meta','cwl_void_requires_reason','cwl_no_self_supersede','cwl_no_self_supersedes') order by conname;  -- 7 rows

-- payment_snapshot_id + lineage refs are ON DELETE RESTRICT ('r').
select conname, confdeltype from pg_constraint where conrelid='public.contractor_withholding_lines'::regclass
  and contype='f' and (conname like '%payment_snapshot%' or conname like '%supersedes%' or conname like '%superseded_by%');

select count(*) as policies from pg_policies where schemaname='public'
  and tablename in ('contractor_withholding_periods','contractor_withholding_lines','contractor_withholding_payments');  -- 3

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   drop trigger if exists cwp_block_delete_trg on public.contractor_withholding_payments;
--   drop trigger if exists cwp_immutable on public.contractor_withholding_payments;
--   drop trigger if exists cwl_block_delete_trg on public.contractor_withholding_lines;
--   drop trigger if exists cwl_same_contractor_trg on public.contractor_withholding_lines;
--   drop trigger if exists cwl_immutable on public.contractor_withholding_lines;
--   drop trigger if exists cwl_validate_snapshot_trg on public.contractor_withholding_lines;
--   drop function if exists public.cwp_block_delete(); drop function if exists public.cwp_block_fact_updates();
--   drop function if exists public.cwl_block_delete(); drop function if exists public.cwl_same_contractor();
--   drop function if exists public.cwl_block_fact_updates(); drop function if exists public.cwl_validate_snapshot();
--   drop table if exists public.contractor_withholding_payments;
--   drop table if exists public.contractor_withholding_lines;
--   drop table if exists public.contractor_withholding_periods;
-- commit;
