-- Structured branch accounts: add clients.branch_name.
--
-- For property-management / real-estate accounts we want the parent
-- brand and the branch kept separately:
--   company_name = parent brand   (e.g. "Barfoot & Thompson")
--   branch_name  = branch         (e.g. "Greenlane")          <- NEW
--   name         = display name   (e.g. "Barfoot & Thompson - Greenlane")
--   contacts     = real people (property managers / agents) under the account
--
-- Additive + nullable. No backfill — existing records are tidied
-- per-record by Carol via the structured "Tidy account name" action
-- (company_name and branch_name keep their legacy meaning until then;
-- branch_name being set is the signal that company_name now means the
-- parent brand). Idempotent, safe to re-run.

alter table public.clients
  add column if not exists branch_name text;
