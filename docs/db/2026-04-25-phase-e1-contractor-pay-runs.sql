-- ════════════════════════════════════════════════════════════════════
--  Phase E.1 — contractor pay run lifecycle.
--
--  Phase E added job_workers pay snapshot + pay_run_items table +
--  pay_runs.kind. Phase E.1 wires the lifecycle:
--
--    create (draft) → approve → mark paid
--
--  Adds approval + payment timestamps to pay_runs so the lifecycle
--  is fully audit-able. Each new column is nullable so the existing
--  employee pay run rows (status 'draft' / 'completed') continue to
--  load cleanly.
--
--  Notes:
--   • The existing employee path uses status values 'draft' /
--     'completed' (set by `completePayRun` in
--     src/app/portal/payroll/_actions.ts). The contractor path uses
--     'draft' → 'approved' → 'paid'. We do NOT add a CHECK
--     constraint on status here — adding one would require
--     coordinating with the employee path's writes. The contractor
--     code paths only ever set the documented values.
--   • If you later add a CHECK, the union should include:
--     ('draft', 'approved', 'completed', 'paid', 'cancelled')
--
--  Idempotent: every column / index uses IF NOT EXISTS.
-- ════════════════════════════════════════════════════════════════════

alter table public.pay_runs
  add column if not exists approved_at timestamptz;

alter table public.pay_runs
  add column if not exists approved_by uuid
    references auth.users(id) on delete set null;

alter table public.pay_runs
  add column if not exists paid_at timestamptz;

alter table public.pay_runs
  add column if not exists paid_by uuid
    references auth.users(id) on delete set null;

comment on column public.pay_runs.approved_at is
  'Timestamp when the pay run was approved. Set by approveContractorPayRun (Phase E.1) for kind=contractor runs.';
comment on column public.pay_runs.approved_by is
  'auth.users id of the staff/admin who approved the pay run.';
comment on column public.pay_runs.paid_at is
  'Timestamp when the pay run was marked paid (funds disbursed).';
comment on column public.pay_runs.paid_by is
  'auth.users id of the staff/admin who marked the pay run as paid.';

-- Index for the contractor pay run list (ordered by status + recency).
create index if not exists pay_runs_kind_status_idx
  on public.pay_runs (kind, status);
