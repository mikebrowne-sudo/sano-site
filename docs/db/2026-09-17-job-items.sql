-- 2026-09-17 — job_items: charge-out extras that flow through to contractor pay.
--
-- WHY
-- A job's entire money today is one number (jobs.job_price). There is no job
-- line-item table, so work identified AFTER the job is created — the canonical
-- case being a carpet clean the cleaner spots on site — has nowhere to live.
-- Staff type the charge into Notes instead (which is exactly what the
-- noteLooksLikePrice warning in src/lib/doc-totals.ts exists to catch), and the
-- contractor can only be paid for it by voiding their hourly payable.
--
-- A job item is one thing done on a job that has a PRICE to the client and,
-- optionally, a COST to a contractor with its own pay basis. That single object
-- covers all three ways a carpet clean arrives: quoted up front, found on site,
-- or its own job.
--
-- MONEY RULE
-- jobs.job_price stays the price of the job AS QUOTED. Only source='added'
-- items are additive on top of it:
--     client total = job_price + sum(price) where source = 'added'
-- This mirrors the existing invoice_items semantic ("items are ADDONS, not the
-- full breakdown" — src/lib/invoice-total.ts). source='quote' rows are copied
-- at conversion purely to carry the contractor-pay half; their charge is ALREADY
-- inside job_price and counting it again would double-bill. src/lib/job-items.ts
-- enforces that filter in exactly one place.
--
-- ADDITIVE + IDEMPOTENT. No existing column is dropped, altered or backfilled,
-- and job_items starts empty, so every existing job keeps behaving exactly as it
-- does today. Safe to apply BEFORE the code deploys.
--
-- Run in the Supabase SQL Editor.

begin;

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. The table
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.job_items (
  id            uuid primary key default gen_random_uuid(),
  job_id        uuid not null references public.jobs(id) on delete cascade,

  -- What the client sees on the invoice.
  label         text not null,
  description   text,
  price         numeric not null default 0,

  -- What Sano pays out. Nullable throughout: an item can be billed before
  -- anyone is assigned, or done in-house with no payable at all.
  contractor_id uuid references public.contractors(id) on delete set null,
  cost_amount   numeric,
  cost_basis    text not null default 'fixed',
  cost_hours    numeric,

  -- 'quote' = copied from the source quote at conversion (charge already inside
  -- job_price — carries the pay half only). 'added' = created on the job later
  -- (charge is additive and reaches the invoice as a new line).
  source        text not null default 'added',

  sort_order    integer not null default 0,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null
);

comment on table public.job_items is
  'Per-job line items: a charge to the client plus an optional contractor cost with its own pay basis. Only source=added rows are additive to jobs.job_price.';
comment on column public.job_items.price is
  'Charged to the client. Additive to jobs.job_price only when source = added.';
comment on column public.job_items.cost_amount is
  'Paid to the contractor. For cost_basis=hourly this is the TOTAL (hours x rate), not the rate.';
comment on column public.job_items.cost_basis is
  'fixed = cost_amount is the whole payable. hourly = cost_amount is hours x rate, with cost_hours set. Deliberately NOT per_visit: that word answers "is this recurring occurrence payable?" (see src/lib/job-worker-pay-basis.ts) and a one-off item never asks it.';
comment on column public.job_items.source is
  'quote = copied at conversion, charge already inside job_price. added = created on the job, charge is additive.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Constraints
-- ─────────────────────────────────────────────────────────────────────────────

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'job_items_cost_basis_chk') then
    alter table public.job_items
      add constraint job_items_cost_basis_chk check (cost_basis in ('fixed', 'hourly'));
  end if;

  if not exists (select 1 from pg_constraint where conname = 'job_items_source_chk') then
    alter table public.job_items
      add constraint job_items_source_chk check (source in ('quote', 'added'));
  end if;

  -- A job item is work DONE, so its charge is never negative. (invoice_items
  -- does allow a negative correction line; a credit belongs on the invoice, not
  -- on the job.)
  if not exists (select 1 from pg_constraint where conname = 'job_items_price_chk') then
    alter table public.job_items
      add constraint job_items_price_chk check (price >= 0);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'job_items_cost_chk') then
    alter table public.job_items
      add constraint job_items_cost_chk check (cost_amount is null or cost_amount >= 0);
  end if;

  -- Hourly cost must carry its hours (so the payable can be re-explained and the
  -- remittance can show them); a fixed cost must not, so a stale hours figure can
  -- never imply an hourly basis.
  if not exists (select 1 from pg_constraint where conname = 'job_items_hours_chk') then
    alter table public.job_items
      add constraint job_items_hours_chk check (
        (cost_basis = 'hourly' and (cost_amount is null or cost_hours is not null))
        or
        (cost_basis = 'fixed' and cost_hours is null)
      );
  end if;

  -- A label is what the client reads on the invoice; blank is never meaningful.
  if not exists (select 1 from pg_constraint where conname = 'job_items_label_chk') then
    alter table public.job_items
      add constraint job_items_label_chk check (length(btrim(label)) > 0);
  end if;
end $$;

create index if not exists job_items_job_id_idx
  on public.job_items (job_id);

create index if not exists job_items_contractor_id_idx
  on public.job_items (contractor_id)
  where contractor_id is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. RLS — staff and finance only. Contractors are NOT granted read.
--
--    job_items.price is client charge-out data and cost_amount is another
--    contractor's pay; neither may reach a contractor session. Contractor-facing
--    surfaces get label-only data through an explicit server-side projection.
--
--    NOTE: this deliberately does NOT copy the job_workers pattern. That table's
--    "Staff full access" policy is `using (true)` for every authenticated role,
--    which means a signed-in contractor can already read it. Reproducing that
--    here would leak charge-out prices, so staff access is gated on
--    NOT public.is_contractor() — the same gate pay_run_items uses.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.job_items enable row level security;

drop policy if exists "job_items staff all" on public.job_items;
create policy "job_items staff all"
  on public.job_items
  for all
  to authenticated
  using      (not public.is_contractor())
  with check (not public.is_contractor());

drop policy if exists "job_items finance read" on public.job_items;
create policy "job_items finance read"
  on public.job_items
  for select
  to authenticated
  using (public.is_finance());

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Link a contractor payable to the job item it pays for.
--
--    Today one payable is allowed per (job_id, contractor_id) — see the
--    duplicate guard in _actions-approve-pay.ts. A job item is separately
--    identified work, so paying it must not be mistaken for paying the job
--    again; equally, the same item must never be paid twice.
--
--    The partial unique index enforces the second half at the DB level. The
--    first half (the job itself is still one payable per contractor) stays in
--    the application guard, which becomes item-aware rather than weaker.
--
--    on delete restrict: a job item that has been paid cannot be deleted out
--    from under its payable.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.contractor_invoices
  add column if not exists job_item_id uuid references public.job_items(id) on delete restrict;

comment on column public.contractor_invoices.job_item_id is
  'The job item this payable pays for, when it pays for an extra rather than the job occurrence itself. NULL for an ordinary job payable.';

create unique index if not exists contractor_invoices_job_item_uniq
  on public.contractor_invoices (job_item_id)
  where job_item_id is not null and status <> 'void';

commit;
