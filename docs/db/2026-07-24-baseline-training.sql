-- ============================================================================
-- BASELINE (Phase 0) — training_modules + worker_training_assignments
-- ============================================================================
-- These tables were created directly in Supabase before the docs/db migration
-- convention and had NO tracked migration. This file documents their EXACT
-- live schema (captured read-only from production 2026-07-24) so the repo
-- accurately represents the database before later phases layer changes on top.
--
-- It is idempotent and NON-DESTRUCTIVE: every statement is `if not exists`, so
-- running it against production is a no-op. It exists for (a) an accurate
-- tracked record and (b) reproducing the schema in a fresh environment.
-- Do NOT treat this as a change to apply — it changes nothing on prod.
--
-- Live data at capture: training_modules = 4 rows (all auto_assign);
-- worker_training_assignments = 0 rows.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- training_modules
-- ---------------------------------------------------------------------------
create table if not exists public.training_modules (
  id                        uuid primary key default gen_random_uuid(),
  title                     text not null,
  category                  text not null default 'other',
  description               text,
  content                   text,
  status                    text not null default 'active',
  requires_acknowledgement  boolean not null default false,
  requires_completion       boolean not null default true,
  sort_order                integer not null default 0,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  key                       text,
  version                   text default '1.0',
  applies_to                text default 'both',   -- 'contractor' | 'employee' | 'both' (no CHECK live)
  auto_assign               boolean default false,
  document_url              text,
  document_label            text
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'training_modules_category_check') then
    alter table public.training_modules add constraint training_modules_category_check
      check (category = any (array['onboarding','cleaning_training','health_and_safety','compliance','policy','other']));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'training_modules_status_check') then
    alter table public.training_modules add constraint training_modules_status_check
      check (status = any (array['active','inactive']));
  end if;
end $$;

create unique index if not exists training_modules_key_uidx on public.training_modules (key) where (key is not null);
create index if not exists idx_training_modules_status on public.training_modules (status);

alter table public.training_modules enable row level security;
-- NOTE (flagged Phase 0): the staff-write policy below is `USING(true)` for any
-- authenticated user, which admits contractor logins. Tightened to staff-only in
-- a later phase; reproduced here to reflect current reality.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='training_modules' and policyname='Anon can read active training_modules') then
    create policy "Anon can read active training_modules" on public.training_modules for select to anon using (status = 'active');
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='training_modules' and policyname='Staff full access to training_modules') then
    create policy "Staff full access to training_modules" on public.training_modules for all to authenticated using (true) with check (true);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- worker_training_assignments
-- ---------------------------------------------------------------------------
create table if not exists public.worker_training_assignments (
  id                    uuid primary key default gen_random_uuid(),
  contractor_id         uuid not null references public.contractors(id) on delete cascade,
  training_module_id    uuid not null references public.training_modules(id) on delete cascade,
  status                text not null default 'assigned',
  assigned_at           timestamptz not null default now(),
  due_date              date,
  completed_at          timestamptz,
  acknowledged_at       timestamptz,   -- one-shot today; no module_version snapshot (added in a later phase)
  notes                 text,
  last_reminder_sent_at timestamptz,
  unique (contractor_id, training_module_id)
);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'worker_training_assignments_status_check') then
    alter table public.worker_training_assignments add constraint worker_training_assignments_status_check
      check (status = any (array['assigned','in_progress','completed']));  -- 'overdue' is computed at read time, not stored
  end if;
end $$;

create index if not exists idx_wta_contractor on public.worker_training_assignments (contractor_id);
create index if not exists idx_wta_module on public.worker_training_assignments (training_module_id);
create index if not exists idx_wta_status on public.worker_training_assignments (status);

alter table public.worker_training_assignments enable row level security;
-- NOTE (flagged Phase 0): `USING(true)` for any authenticated user admits
-- contractor logins to read/write ALL assignments — this would let a contractor
-- self-complete an H&S module via the API. Replaced with contractor-owns-own-row
-- RLS in the H&S acknowledgement phase (Phase 5). Reproduced here as current reality.
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='worker_training_assignments' and policyname='Staff full access to worker_training_assignments') then
    create policy "Staff full access to worker_training_assignments" on public.worker_training_assignments for all to authenticated using (true) with check (true);
  end if;
end $$;
