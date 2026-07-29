-- 2026-08-03 — Contractor schedular withholding liability + filing (PR 8).
--
-- Extends the existing IRD liability ledger to CONTRACTOR schedular withholding.
-- A contractor withholding line is created from an APPROVED payment tax snapshot
-- (contractor_payment_tax_snapshots, PR 7) — the source of truth. It is immutable
-- (frozen at creation from the snapshot; never recomputes from current contractor
-- data). It is keyed to the same ird_liabilities period (monthly, due the 20th
-- following) so filing + payment reuse the period infrastructure.
--
-- Filing status (not_filed / filed / accepted / correction_required) mirrors the
-- MANUAL employee IR348 pattern — status flags only, NO electronic transmission,
-- NO auto-pay. Payment to IRD is recorded (not initiated) via
-- ird_liability_payments (shared) or a contractor-scoped record.
--
-- PR 8 scope: create the liability line from an approved snapshot + track filing +
-- record a payment. NO money movement (recording an existing transfer only), NO
-- auto-backfill of historical invoices, NO Myrtle line created. Additive +
-- idempotent. Admin-only RLS. Mike-run.

-- ── Read-only preflight (expect 0 rows) ─────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public' and table_name='contractor_withholding_lines';

begin;

create table if not exists public.contractor_withholding_lines (
  id                    uuid primary key default gen_random_uuid(),
  line_number           text,                        -- CWL-xxxx (assigned in app)
  ird_liability_id      uuid not null references public.ird_liabilities(id) on delete restrict,
  contractor_id         uuid not null references public.contractors(id) on delete restrict,
  -- The APPROVED snapshot this line was created from (source of truth). One line
  -- per approved snapshot (unique) — never recomputed from current data.
  payment_snapshot_id   uuid not null unique references public.contractor_payment_tax_snapshots(id) on delete restrict,
  payday                date not null,               -- the payment date (drives the period)
  supply_date           date not null,               -- echoed from the snapshot
  -- Frozen withholding figures copied from the approved snapshot.
  withholding_rate      numeric not null,
  gross_ex_gst          numeric not null,
  withholding_amount    numeric not null,            -- the schedular WHT owed to IRD
  net_bank              numeric not null,
  calc_version          text not null,
  -- Filing lifecycle (manual; no electronic transmission).
  filing_status         text not null default 'not_filed'
                          check (filing_status in ('not_filed','filed','accepted','correction_required')),
  filed_at              timestamptz,
  filed_by              uuid references auth.users(id) on delete set null,
  filing_reference      text,
  -- Correction chain (immutable): a correction supersedes; never overwrites.
  status                text not null default 'active'
                          check (status in ('active','superseded','void')),
  supersedes_id         uuid references public.contractor_withholding_lines(id) on delete set null,
  superseded_at         timestamptz,
  superseded_by_id      uuid references public.contractor_withholding_lines(id) on delete set null,
  correction_reason     text,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  -- No self-supersession.
  constraint cwl_no_self_supersede check (superseded_by_id is null or superseded_by_id <> id),
  constraint cwl_no_self_supersedes check (supersedes_id is null or supersedes_id <> id),
  constraint cwl_superseded_requires_meta
    check (status <> 'superseded' or (superseded_at is not null and superseded_by_id is not null))
);

create index if not exists cwl_period_idx on public.contractor_withholding_lines (ird_liability_id);
create index if not exists cwl_contractor_idx on public.contractor_withholding_lines (contractor_id);
create index if not exists cwl_status_idx on public.contractor_withholding_lines (status, filing_status);

comment on table public.contractor_withholding_lines is
  'Contractor schedular withholding liability lines, each created from an APPROVED payment tax snapshot (source of truth) and frozen — never recomputed from current contractor data. Keyed to an ird_liabilities period (monthly, due the 20th following). Filing is manual (status flags, no electronic transmission); payment is recorded, not initiated. A correction supersedes (never overwrites). No money movement.';

-- Immutability: the withholding facts + source refs are frozen. Only the filing +
-- lifecycle columns may change (filing_status, filed_*, filing_reference, status,
-- superseded_*, correction_reason).
create or replace function public.cwl_block_fact_updates() returns trigger as $$
begin
  if row(new.line_number, new.ird_liability_id, new.contractor_id, new.payment_snapshot_id, new.payday,
          new.supply_date, new.withholding_rate, new.gross_ex_gst, new.withholding_amount, new.net_bank,
          new.calc_version, new.supersedes_id, new.created_by, new.created_at)
     is distinct from
     row(old.line_number, old.ird_liability_id, old.contractor_id, old.payment_snapshot_id, old.payday,
          old.supply_date, old.withholding_rate, old.gross_ex_gst, old.withholding_amount, old.net_bank,
          old.calc_version, old.supersedes_id, old.created_by, old.created_at) then
    raise exception 'contractor_withholding_lines: a withholding line is immutable — create a superseding correction instead';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists cwl_immutable on public.contractor_withholding_lines;
create trigger cwl_immutable before update on public.contractor_withholding_lines
  for each row execute function public.cwl_block_fact_updates();

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

-- Contractor-scoped recorded IRD payments (records an EXISTING transfer; never
-- initiates one). Separate from the employee ird_liability_payments so the two
-- streams don't intermix.
create table if not exists public.contractor_withholding_payments (
  id                uuid primary key default gen_random_uuid(),
  ird_liability_id  uuid not null references public.ird_liabilities(id) on delete restrict,
  payment_date      date not null,
  amount            numeric not null check (amount > 0),
  ird_reference     text,
  notes             text,
  recorded_by       uuid references auth.users(id) on delete set null,
  created_at        timestamptz not null default now()
);
create index if not exists cwp_period_idx on public.contractor_withholding_payments (ird_liability_id);

comment on table public.contractor_withholding_payments is
  'Recorded (not initiated) IRD payments for contractor schedular withholding. Supports partial payments. Records an existing transfer — Sano never initiates a payment here.';

-- RLS — admin-only.
alter table public.contractor_withholding_lines enable row level security;
alter table public.contractor_withholding_payments enable row level security;
drop policy if exists "contractor_withholding_lines admin all" on public.contractor_withholding_lines;
create policy "contractor_withholding_lines admin all" on public.contractor_withholding_lines
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "contractor_withholding_payments admin all" on public.contractor_withholding_payments;
create policy "contractor_withholding_payments admin all" on public.contractor_withholding_payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select table_name from information_schema.tables where table_schema='public'
  and table_name in ('contractor_withholding_lines','contractor_withholding_payments') order by table_name;  -- 2 rows

select tgname from pg_trigger where tgrelid='public.contractor_withholding_lines'::regclass
  and tgname in ('cwl_immutable','cwl_block_delete_trg') order by tgname;  -- 2 rows

select conname from pg_constraint where conrelid='public.contractor_withholding_lines'::regclass
  and conname in ('cwl_no_self_supersede','cwl_no_self_supersedes','cwl_superseded_requires_meta') order by conname;  -- 3 rows

-- payment_snapshot_id is UNIQUE (one line per approved snapshot) + ON DELETE RESTRICT.
select confdeltype from pg_constraint where conrelid='public.contractor_withholding_lines'::regclass
  and contype='f' and conname like '%payment_snapshot%';  -- 'r'

select count(*) as policies from pg_policies where schemaname='public'
  and tablename in ('contractor_withholding_lines','contractor_withholding_payments');  -- 2

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   drop trigger if exists cwl_block_delete_trg on public.contractor_withholding_lines;
--   drop trigger if exists cwl_immutable on public.contractor_withholding_lines;
--   drop function if exists public.cwl_block_delete();
--   drop function if exists public.cwl_block_fact_updates();
--   drop table if exists public.contractor_withholding_payments;
--   drop table if exists public.contractor_withholding_lines;
-- commit;
