-- PR2c — non-taxable mileage reimbursement on pay run lines.
-- Run in the Supabase SQL editor. Safe + idempotent.
-- The reimbursement rides ALONGSIDE net pay; it is never part of gross / PAYE /
-- ACC / KiwiSaver (those come from calculatePayPreview, which only sees wages).

alter table public.pay_run_lines
  add column if not exists mileage_reimbursement numeric(10,2) not null default 0;
