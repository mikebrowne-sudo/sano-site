-- 2026-07-29 — Contractor setup workflow + service schedules + insurance arrangement (PR 1).
--
-- The staff-led contractor setup platform's foundation. Staff create a setup
-- draft, enter known commercial details, mark uncertain fields "contractor to
-- confirm", email a secure link; the contractor confirms identity/structure and
-- reviews service schedules; staff review + accept critical changes.
--
-- PR 1 scope: NO tax money movement, and — deliberately — NO structured tax/GST
-- declaration columns. Those belong to the immutable contractor_tax_declarations
-- and contractor_gst_history tables in later PRs. Here, tax/GST/banking/identity/
-- insurance/schedules/agreement are tracked ONLY as section STATUSES on
-- contractor_setup.section_status (a jsonb map of section -> state), so PR 1
-- creates no temporary tax/GST fields that could later conflict.
--
-- RETENTION NOTE: contractor_setup is a SIBLING of the schedules + insurance
-- tables, not their parent — all three reference contractors(id) independently.
-- Deleting a contractor_setup row therefore does NOT delete any service schedule
-- or insurance history. Only deleting the CONTRACTOR cascades to all three
-- (correct — a removed contractor takes its own records). The rollback's
-- `drop table ... cascade` only removes FKs pointing INTO the dropped table.
--
-- INSURANCE MODEL: multiple effective-dated, superseding rows per contractor.
-- Scope is either contractor_default (the fallback) or schedule_override (for one
-- service schedule). One CURRENT default per contractor and one CURRENT override
-- per schedule are enforced by partial unique indexes. A schedule_override is tied
-- to its schedule by a COMPOSITE FK (service_schedule_id, contractor_id) so the
-- database guarantees the override belongs to the SAME contractor as the schedule.
--
-- Additive + idempotent. Admin-only RLS via public.is_admin(); the secure-link
-- (token) reads use the service-role client. Run in the Supabase SQL Editor. Mike-run.

-- ── Read-only preflight (expect 0 rows) ─────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public'
  and table_name in ('contractor_setup','contractor_service_schedules','contractor_insurance_arrangement');

begin;

-- ── 1. contractor_setup — the staff draft + secure-link workflow ────────────
create table if not exists public.contractor_setup (
  id                 uuid primary key default gen_random_uuid(),
  contractor_id      uuid not null references public.contractors(id) on delete cascade,
  token              text not null unique,        -- secure email link (no portal login)
  -- Overall workflow status. Active/payment-ready are NOT reachable from PR 1
  -- (identity+structure+schedules accepted is necessary, not sufficient — tax
  -- verification lands in later PRs and gates the final states in app logic).
  status             text not null default 'draft'
                       check (status in ('draft','ready_to_send','awaiting_contractor',
                         'contractor_submitted','sano_review_required','changes_requested',
                         'ready_to_sign','signed','active','expired','superseded')),
  -- Per-section ownership + completion state. Keys: identity, structure, gst,
  -- tax_declaration, banking, insurance, service_schedules, agreement_acceptance.
  -- Values: not_requested | awaiting_contractor | awaiting_sano_review | verified
  --         | blocked_pending_workflow | not_applicable | confirmed_by_sano
  --         | contractor_to_confirm | contractor_to_complete.
  section_status     jsonb not null default '{}'::jsonb,
  -- Contractor submissions pending staff acceptance: {field: {old, new}}.
  -- Critical fields NEVER overwrite the live record until a human accepts them.
  proposed_changes   jsonb not null default '{}'::jsonb,
  contractor_note    text,                         -- contractor's flagged-term note
  sent_at            timestamptz,
  submitted_at       timestamptz,
  reviewed_at        timestamptz,
  reviewed_by        uuid references auth.users(id) on delete set null,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_contractor_setup_contractor on public.contractor_setup (contractor_id);
create index if not exists idx_contractor_setup_token on public.contractor_setup (token);

comment on table public.contractor_setup is
  'Staff-led contractor setup workflow. Sibling of the schedules/insurance tables (all reference contractors independently) — deleting a setup never deletes schedule or insurance history. section_status tracks per-section ownership/completion (incl. deferred tax/GST as blocked_pending_workflow); proposed_changes buffers contractor edits to critical fields for staff acceptance. No structured tax/GST columns here — see contractor_tax_declarations / contractor_gst_history (later PRs).';

-- ── 2. contractor_service_schedules — many arrangements per master agreement ─
create table if not exists public.contractor_service_schedules (
  id                    uuid primary key default gen_random_uuid(),
  contractor_id         uuid not null references public.contractors(id) on delete cascade,
  schedule_ref          text,                      -- SCH-xxxx (assigned in app)
  name                  text not null,
  -- Linkage to existing entities (all optional).
  customer_client_id    uuid references public.clients(id) on delete set null,
  site_id               uuid references public.sites(id) on delete set null,
  linked_quote_id       uuid references public.quotes(id) on delete set null,
  linked_recurring_job_id uuid references public.recurring_jobs(id) on delete set null,
  service_address       text,
  classification        text check (classification in ('residential','commercial')),
  service_type          text,
  work_description      text,
  start_date            date,
  end_date              date,
  term                  text check (term in ('ongoing','fixed')),
  frequency             text,
  expected_units        text,                      -- "hours/visits/cleans" free text
  work_variability      text check (work_variability in ('fixed','variable')),
  -- Payment model — three orthogonal axes (see the design spec §3).
  payment_method        text check (payment_method in
                          ('hourly','fixed_per_clean','fixed_weekly','fixed_fortnightly',
                           'fixed_monthly','project','custom')),
  payment_basis         text check (payment_basis in ('gross_fee','guaranteed_net')),
  rate_basis            text check (rate_basis in ('gst_inclusive','gst_exclusive')),
  agreed_amount         numeric,
  payment_frequency     text,
  -- Operational / commercial terms.
  equipment_products    text,
  additional_work_approval text,
  closure_treatment     text,
  missed_clean_treatment text,
  rework_responsibility text,
  expenses_treatment    text,
  travel_mileage        text,
  notice_period         text,
  price_review_date     date,
  payment_reference     text,
  cost_centre           text,
  -- Lifecycle + effective-dating (supersede, never overwrite).
  status                text not null default 'draft'
                          check (status in ('draft','active','paused','ended','superseded')),
  effective_from        date,
  superseded_at         timestamptz,
  superseded_by         uuid references public.contractor_service_schedules(id) on delete set null,
  created_by            uuid references auth.users(id) on delete set null,
  approved_by           uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  -- Composite target so a schedule_override insurance row can reference
  -- (service_schedule_id, contractor_id) and the DB guarantees the schedule
  -- belongs to the same contractor as the override.
  constraint uq_css_id_contractor unique (id, contractor_id)
);
create index if not exists idx_css_contractor on public.contractor_service_schedules (contractor_id);
create index if not exists idx_css_status on public.contractor_service_schedules (status);

comment on table public.contractor_service_schedules is
  'Work arrangements under one master contractor agreement. Each carries its own payment_method/payment_basis/rate_basis + commercial terms. Effective-dated + superseding — changes create a new version, never overwrite. Insurance requirements come from contractor_insurance_arrangement (a contractor_default, optionally overridden per schedule). Withholding/GST are computed later (calc engine PR) from these + the tax/GST declarations.';

-- ── 3. contractor_insurance_arrangement — multi-row, scoped, effective-dated ─
create table if not exists public.contractor_insurance_arrangement (
  id                  uuid primary key default gen_random_uuid(),
  contractor_id       uuid not null references public.contractors(id) on delete cascade,
  -- Scope: the contractor's default arrangement, or an override for ONE schedule.
  scope               text not null default 'contractor_default'
                        check (scope in ('contractor_default','schedule_override')),
  -- Set (and required) only for scope='schedule_override'. The composite FK below
  -- ties it to a schedule OF THE SAME CONTRACTOR.
  service_schedule_id uuid,
  mode                text not null default 'pending_review'
                        check (mode in ('own_required','covered_by_sano','not_required','pending_review')),
  -- own_required:
  required_type       text,
  min_cover           numeric,
  insurer             text,
  policy_number       text,
  effective_date      date,
  expiry_date         date,
  certificate_ref     text,
  verification_status text check (verification_status in ('unverified','verified','expired')),
  block_config        text,          -- which block an expired/missing policy triggers
  -- covered_by_sano (internal only — never exposed to the contractor):
  sano_policy_ref     text,
  cover_type          text,
  cover_limit         numeric,
  confirmed_by        uuid references auth.users(id) on delete set null,
  confirmed_at        timestamptz,
  internal_evidence_ref text,
  notes               text,
  -- Effective-dating + supersession (history, not overwrite).
  effective_from      date,
  status              text not null default 'current'
                        check (status in ('current','superseded')),
  supersedes_id       uuid references public.contractor_insurance_arrangement(id) on delete set null,
  superseded_at       timestamptz,
  created_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  -- A default has no schedule; an override must name one.
  constraint cia_scope_schedule_ck check (
    (scope = 'contractor_default' and service_schedule_id is null) or
    (scope = 'schedule_override'  and service_schedule_id is not null)
  ),
  -- Cross-contractor integrity: the referenced schedule must belong to the SAME
  -- contractor as this insurance row (composite FK into the unique key above).
  constraint cia_schedule_same_contractor_fk
    foreign key (service_schedule_id, contractor_id)
    references public.contractor_service_schedules (id, contractor_id) on delete cascade
);
create index if not exists idx_cia_contractor on public.contractor_insurance_arrangement (contractor_id);
create index if not exists idx_cia_schedule on public.contractor_insurance_arrangement (service_schedule_id);

-- One CURRENT default per contractor.
create unique index if not exists uq_cia_current_default
  on public.contractor_insurance_arrangement (contractor_id)
  where scope = 'contractor_default' and status = 'current';
-- One CURRENT override per service schedule.
create unique index if not exists uq_cia_current_override
  on public.contractor_insurance_arrangement (service_schedule_id)
  where scope = 'schedule_override' and status = 'current';

comment on table public.contractor_insurance_arrangement is
  'Insurance arrangements: multiple effective-dated, superseding rows per contractor. scope=contractor_default is the fallback (one current per contractor); scope=schedule_override applies to one service schedule (one current per schedule) and is tied to a same-contractor schedule by a composite FK. mode=covered_by_sano records internal policy details (never shown to the contractor) and suppresses the upload step / "insurance missing" / onboarding blocks. Changes supersede (status=superseded, supersedes_id) rather than overwrite.';

-- ── RLS — admin-only (token reads use the service-role client) ──────────────
alter table public.contractor_setup enable row level security;
alter table public.contractor_service_schedules enable row level security;
alter table public.contractor_insurance_arrangement enable row level security;

drop policy if exists "contractor_setup admin all" on public.contractor_setup;
create policy "contractor_setup admin all" on public.contractor_setup
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contractor_service_schedules admin all" on public.contractor_service_schedules;
create policy "contractor_service_schedules admin all" on public.contractor_service_schedules
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "contractor_insurance_arrangement admin all" on public.contractor_insurance_arrangement;
create policy "contractor_insurance_arrangement admin all" on public.contractor_insurance_arrangement
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select table_name from information_schema.tables
where table_schema='public'
  and table_name in ('contractor_setup','contractor_service_schedules','contractor_insurance_arrangement')
order by table_name;   -- expect 3 rows

select tablename, count(*) as policies from pg_policies
where schemaname='public'
  and tablename in ('contractor_setup','contractor_service_schedules','contractor_insurance_arrangement')
group by tablename order by tablename;   -- expect 1 each

-- Insurance integrity objects.
select indexname from pg_indexes
where schemaname='public' and tablename='contractor_insurance_arrangement'
  and indexname in ('uq_cia_current_default','uq_cia_current_override')
order by indexname;   -- expect 2 rows

select conname from pg_constraint
where conname in ('cia_scope_schedule_ck','cia_schedule_same_contractor_fk','uq_css_id_contractor')
order by conname;   -- expect 3 rows

-- ── Rollback (commented — only if you need to reverse) ──────────────────────
-- Drop insurance first (its composite FK depends on the schedules unique key).
-- begin;
--   drop table if exists public.contractor_insurance_arrangement cascade;
--   drop table if exists public.contractor_service_schedules cascade;
--   drop table if exists public.contractor_setup cascade;
-- commit;
