-- ============================================================================
-- BASELINE (Phase 0) — contractor_incidents
-- ============================================================================
-- Staff-managed performance / complaint / incident log on the contractor detail
-- page. Created directly in Supabase; no prior tracked migration. This documents
-- the EXACT live schema (captured read-only from production 2026-07-24).
--
-- Idempotent + NON-DESTRUCTIVE (`if not exists`). Live data at capture: 0 rows.
--
-- This is a STAFF performance/complaint register, NOT the worker-facing H&S
-- reporting model. Worker hazard/near-miss/incident reporting is a separate new
-- table built in a later phase; this table is left for staff-management records.
-- ============================================================================

create table if not exists public.contractor_incidents (
  id             uuid primary key default gen_random_uuid(),
  contractor_id  uuid not null references public.contractors(id) on delete cascade,
  incident_date  date not null,
  severity       text not null,
  description    text not null,
  resolved_at    date,
  notes          text,
  created_at     timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'contractor_incidents_severity_check') then
    alter table public.contractor_incidents add constraint contractor_incidents_severity_check
      check (severity = any (array['low','medium','high','complaint','performance']));
  end if;
end $$;

create index if not exists contractor_incidents_contractor_id_idx on public.contractor_incidents (contractor_id);

alter table public.contractor_incidents enable row level security;
-- NOTE (flagged Phase 0): the live policy is `authenticated_all` FOR ALL
-- USING(true) — any authenticated user, INCLUDING contractor logins, can read
-- and write every incident row (confidential staff notes). Same class as the
-- contractor_invoices RLS hole closed in #408. 0 rows today so nothing is
-- exposed yet; tightened to staff-only in the Phase 1 consistency migration.
-- Reproduced here to reflect current reality.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='contractor_incidents' and policyname='authenticated_all') then
    create policy authenticated_all on public.contractor_incidents for all to authenticated using (true) with check (true);
  end if;
end $$;
