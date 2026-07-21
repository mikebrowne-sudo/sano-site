-- 2026-07-21 — Contractor payment statements: draft foundation (Stage 1 PR A).
--
-- A contractor payment statement is a per-contractor, per-period GROUPING layer
-- over the canonical flow: contractor_invoices (lines) -> contractor_statements
-- -> contractor_remittances (final snapshot). It is NOT a third payment system.
-- Statement lines ARE contractor_invoices (via statement_id); events are audit_log.
--
-- This migration is the smallest foundation for STAFF-ONLY DRAFT statements:
--   • contractor_statements table (only 'draft' is used yet; full status set is
--     constrained now to avoid a re-migration)
--   • STMT-#### numbering via a sequence + column DEFAULT (mirrors RA-####;
--     stable across a draft refresh because refresh is an UPDATE, not re-insert)
--   • one ACTIVE statement per (contractor, period) via a PARTIAL unique index
--     that still permits a future superseded row + a fresh one
--   • contractor_invoices.statement_id (nullable FK) — a CI belongs to one
--     statement at a time; on statement delete the CI is unlinked, never deleted
--   • contractor_invoices.service_date (nullable) — the OPERATIONAL service date
--     (statement-period basis) for jobless manual/fixed/adjustment CIs, kept
--     SEPARATE from the GST tax point (gst_supply_date). Resolver priority:
--     job.completed_at (job-derived) -> service_date -> gst_supply_date -> none.
--   • staff-only RLS (contractors get no access in this PR)
--
-- Additive + idempotent. No historical rows are modified. No drafts are created.

begin;

create extension if not exists pgcrypto;
create sequence if not exists public.contractor_statement_number_seq;

create table if not exists public.contractor_statements (
  id                uuid primary key default gen_random_uuid(),
  statement_number  text not null unique
                    default ('STMT-' || lpad(nextval('public.contractor_statement_number_seq')::text, 4, '0')),
  contractor_id     uuid not null references public.contractors(id) on delete restrict,
  period_start      date not null,
  period_end        date not null,
  status            text not null default 'draft'
                    check (status in ('draft','issued','queried','confirmed','superseded','paid')),
  subtotal          numeric(12,2) not null default 0,   -- sum of line amounts (GST-inclusive)
  gst_total         numeric(12,2) not null default 0,   -- informational: sum(gst_amount) where gst_status='applied'
  total_payable     numeric(12,2) not null default 0,   -- = subtotal (rates are GST-inclusive)
  -- Future lifecycle (nullable, NO behaviour in this PR — present to avoid a re-migration).
  issued_at         timestamptz,
  issued_by         uuid references auth.users(id) on delete set null,
  viewed_at         timestamptz,
  confirmed_at      timestamptz,
  confirmed_source  text check (confirmed_source in ('contractor','sano')),
  confirmed_by      uuid references auth.users(id) on delete set null,
  remittance_id     uuid references public.contractor_remittances(id) on delete set null,
  created_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id) on delete set null,
  updated_at        timestamptz not null default now(),
  constraint contractor_statements_period_order check (period_start <= period_end)
);

comment on table public.contractor_statements is
  'Per-contractor, per-period grouping of approved contractor_invoices (statement lines) over the canonical CI -> remittance flow. Draft foundation only; issue/confirm/query/remittance behaviour arrives in later PRs.';

-- One ACTIVE statement per contractor+period. Partial (excludes superseded) so a
-- future superseded statement can coexist with its regenerated replacement.
create unique index if not exists contractor_statements_contractor_period_active_uq
  on public.contractor_statements (contractor_id, period_start, period_end)
  where status <> 'superseded';

-- Statement lines ARE contractor_invoices.
alter table public.contractor_invoices
  add column if not exists statement_id uuid references public.contractor_statements(id) on delete set null;

comment on column public.contractor_invoices.statement_id is
  'The draft/issued statement this CI is grouped into (nullable). A CI belongs to at most one statement at a time.';

-- Operational service date for jobless CIs (statement-period basis). Separate
-- from gst_supply_date (the GST tax point). Job-derived CIs resolve their
-- service date from the linked job completed_at instead.
alter table public.contractor_invoices
  add column if not exists service_date date;

comment on column public.contractor_invoices.service_date is
  'Operational service date used for statement-period membership on jobless (manual/fixed/adjustment) CIs. Distinct from gst_supply_date (GST tax point). Job-derived CIs use job.completed_at.';

create index if not exists idx_contractor_invoices_statement on public.contractor_invoices (statement_id);
-- Fast eligible-line lookup (approved, not yet on a statement).
create index if not exists idx_contractor_invoices_eligible
  on public.contractor_invoices (contractor_id)
  where status = 'approved' and statement_id is null;

-- RLS — staff/admin only. Contractors have NO access to statements in this PR.
alter table public.contractor_statements enable row level security;
drop policy if exists "contractor_statements staff all" on public.contractor_statements;
create policy "contractor_statements staff all"
  on public.contractor_statements for all to authenticated
  using (not public.is_contractor()) with check (not public.is_contractor());

commit;

-- ── Verify (after applying) ──────────────────────────────────────────
-- select column_name, is_nullable from information_schema.columns
--   where table_name='contractor_statements' order by ordinal_position;
-- select indexdef from pg_indexes where tablename='contractor_statements';
-- select polname, polcmd from pg_policy where polrelid='public.contractor_statements'::regclass;
-- select 1 from information_schema.columns where table_name='contractor_invoices' and column_name in ('statement_id','service_date');
