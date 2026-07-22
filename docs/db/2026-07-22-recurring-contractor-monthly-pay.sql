-- 2026-07-22 — Fixed monthly contractor pay on recurring contracts. Applied via MCP.
--
-- A recurring commercial contract can now carry a fixed monthly contractor payable
-- (e.g. Pukekohe Golf Club → Myrtle $1500/month) alongside the customer invoice.
-- The recurring-invoice generator creates ONE approved fixed_contract contractor
-- payable per month from this value (idempotent per contractor + contract title +
-- period), which lands ready to pay in the "Pay contractors" list.

alter table public.recurring_jobs
  add column if not exists contractor_monthly_pay numeric(12,2);
