-- 2026-06-30 — Fix quote versioning unique constraint.
--
-- "Save changes" on a sent/viewed quote creates a NEW draft VERSION that
-- shares the same quote_number with an incremented version_number (see
-- src/app/portal/quotes/_actions-versioning.ts — quote_number is deliberately
-- copied to the new row). But the quotes table had a plain
--   UNIQUE (quote_number)
-- constraint, so the second version collided:
--   "duplicate key value violates unique constraint quotes_quote_number_key".
-- As a result no quote could ever get a v2.
--
-- Fix: make uniqueness composite on (quote_number, version_number) so versions
-- of the same quote can coexist, while still preventing a duplicate of the same
-- version. New quotes keep getting fresh numbers from the app-side generator.
--
-- Additive + idempotent. Run in the Supabase SQL Editor before deploying.

begin;

alter table public.quotes drop constraint if exists quotes_quote_number_key;

create unique index if not exists quotes_quote_number_version_key
  on public.quotes (quote_number, version_number);

commit;
