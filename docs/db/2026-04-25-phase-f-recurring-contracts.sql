-- ════════════════════════════════════════════════════════════════════
--  Phase F — recurring contracts + renewal reminders.
--
--  Builds on the existing `recurring_jobs` table (manual job
--  generator from earlier phases). Phase F adds the contract layer
--  needed for commercial agreements: source quote linkage, scope
--  snapshot, contract term + notice period, renewal status, and a
--  reminders sub-table.
--
--  Naming note: the table stays as `recurring_jobs` for backward
--  compat — the existing list/detail/edit pages, server actions,
--  and CreateRecurringButton on the job page all reference it. Each
--  Phase F column is nullable so legacy rows continue to load and
--  edit cleanly.
--
--  Idempotent: every column / table uses IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════

-- ── recurring_jobs additions ────────────────────────────────────

alter table public.recurring_jobs
  add column if not exists quote_id uuid
    references public.quotes(id) on delete set null;

alter table public.recurring_jobs
  add column if not exists service_category text;

alter table public.recurring_jobs
  add column if not exists scope_snapshot jsonb;

alter table public.recurring_jobs
  add column if not exists service_days text;       -- e.g. "Tue, Thu, Sat"
alter table public.recurring_jobs
  add column if not exists service_window text;     -- e.g. "1600-2200"

alter table public.recurring_jobs
  add column if not exists contract_term_months integer;
alter table public.recurring_jobs
  add column if not exists notice_period_days integer;

alter table public.recurring_jobs
  add column if not exists monthly_value numeric;

alter table public.recurring_jobs
  add column if not exists renewal_status text default 'not_started';
alter table public.recurring_jobs
  add column if not exists renewal_notes text;

alter table public.recurring_jobs
  add column if not exists created_by uuid
    references auth.users(id) on delete set null;

alter table public.recurring_jobs
  add column if not exists updated_at timestamptz default now();

-- Loose CHECK on renewal_status. Wrapped in DO so re-runs are safe.
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'recurring_jobs'
      and constraint_name = 'recurring_jobs_renewal_status_check'
  ) then
    alter table public.recurring_jobs
      add constraint recurring_jobs_renewal_status_check
      check (renewal_status in (
        'not_started',
        'review_due',
        'renewal_sent',
        'renewed',
        'ending'
      ));
  end if;
end $$;

comment on column public.recurring_jobs.scope_snapshot is
  'Phase F: point-in-time copy of the source quote''s scope at contract creation. Append-only — future quote edits do not alter the contract.';
comment on column public.recurring_jobs.contract_term_months is
  'Length of the contract term in months. Used with start_date to derive end_date.';
comment on column public.recurring_jobs.notice_period_days is
  'Notice period in days. Renewal reminders fire ahead of end_date.';
comment on column public.recurring_jobs.monthly_value is
  'Operator-set monthly value of the contract (NZD). Used for reporting + renewal context.';
comment on column public.recurring_jobs.renewal_status is
  'not_started, review_due, renewal_sent, renewed, ending.';

-- Index supports the contract-end / renewal-reminder dashboards.
create index if not exists recurring_jobs_end_date_idx
  on public.recurring_jobs (end_date)
  where end_date is not null;

-- ── recurring_contract_reminders ────────────────────────────────

create table if not exists public.recurring_contract_reminders (
  id                    uuid         primary key default gen_random_uuid(),
  recurring_job_id      uuid         not null
                                     references public.recurring_jobs(id)
                                     on delete cascade,
  reminder_type         text         not null,
  due_date              date         not null,
  status                text         not null default 'pending',
  completed_at          timestamptz,
  completed_by          uuid         references auth.users(id) on delete set null,
  created_at            timestamptz  not null default now()
);

do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'recurring_contract_reminders'
      and constraint_name = 'recurring_contract_reminders_type_check'
  ) then
    alter table public.recurring_contract_reminders
      add constraint recurring_contract_reminders_type_check
      check (reminder_type in ('six_weeks', 'four_weeks', 'two_weeks'));
  end if;
  if not exists (
    select 1 from information_schema.table_constraints
    where table_schema = 'public'
      and table_name   = 'recurring_contract_reminders'
      and constraint_name = 'recurring_contract_reminders_status_check'
  ) then
    alter table public.recurring_contract_reminders
      add constraint recurring_contract_reminders_status_check
      check (status in ('pending', 'completed', 'dismissed'));
  end if;
end $$;

comment on table public.recurring_contract_reminders is
  'Phase F: in-portal reminders for contract renewal touchpoints. 6 / 4 / 2 weeks before end_date. Email automation deferred.';

create index if not exists recurring_contract_reminders_recurring_job_id_idx
  on public.recurring_contract_reminders (recurring_job_id);
create index if not exists recurring_contract_reminders_pending_due_idx
  on public.recurring_contract_reminders (due_date)
  where status = 'pending';

-- RLS — staff read; admin write. Mirrors job_settings / pay_run_items.
alter table public.recurring_contract_reminders enable row level security;

drop policy if exists "recurring_contract_reminders staff read"
  on public.recurring_contract_reminders;
create policy "recurring_contract_reminders staff read"
  on public.recurring_contract_reminders
  for select to authenticated
  using (not public.is_contractor());

drop policy if exists "recurring_contract_reminders admin write"
  on public.recurring_contract_reminders;
create policy "recurring_contract_reminders admin write"
  on public.recurring_contract_reminders
  for all to authenticated
  using      ((select auth.jwt() ->> 'email') = 'michael@sano.nz')
  with check ((select auth.jwt() ->> 'email') = 'michael@sano.nz');
