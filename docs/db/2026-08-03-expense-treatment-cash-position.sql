-- 2026-08-03 — Owner/equity split + reimbursement linkage + cash-position fix.
--
-- Purpose: make the accounting treatment distinguish the five cash types and
-- report the correct net-of-owner-funding cash position ($11,330.62).
--
--   1. Genuine owner capital introduced      → category 'owner_capital'
--   2. Reimbursement for a business expense   → category 'expense_reimbursement'
--      the company initially paid                (linked to that expense)
--   3. Director / shareholder loan            → category 'director_loan'
--   4. Trading income                         → invoices (unchanged)
--   5. Transfers to tax-holding cash          → cash movement (not an expense)
--
-- Previously all of 1–3 were collapsed into 'owner_equity', so owner funding
-- looked like $3,000 when only $1,000 is genuine. This migration:
--   (a) adds a nullable self-referencing link column on expenses, and
--   (b) recodes the three specific 2026 rows to the correct new categories and
--       links the $2,000 laptop reimbursement to the $2,698 laptop expense.
--
-- The category values are plain text (validated in app code), so no enum/DDL
-- change is needed for the new categories themselves — only the link column.
--
-- Additive + idempotent. Run in the Supabase SQL editor.

begin;

-- (a) Link a reimbursement to the expense it repays (self-reference).
alter table public.expenses
  add column if not exists related_expense_id uuid
    references public.expenses(id) on delete set null;

comment on column public.expenses.related_expense_id is
  'For a reimbursement (expense_reimbursement), the expense row it repays — so the transaction history explains why money was returned to the business.';

-- (b) Recode the three specific 2026 records.

-- The $1,000 on 2026-04-18 = the ONLY genuine owner capital introduced.
update public.expenses
set category = 'owner_capital',
    description = 'Owner capital introduced (genuine startup funding)'
where id = 'cec86005-e99c-4f75-a79b-b8f1187e208c'
  and amount = 1000 and expense_date = '2026-04-18';

-- The $2,698 laptop on 2026-06-08 = a capital asset (was miscoded 'cpax').
update public.expenses
set category = 'capital_expense'
where id = '0fbef65c-dd22-4751-bb94-692d86881e60'
  and amount = 2698 and expense_date = '2026-06-08';

-- The $2,000 on 2026-06-11 = a reimbursement to the business for part of the
-- laptop, NOT owner funding and NOT a loan. Recode + link to the laptop.
update public.expenses
set category = 'expense_reimbursement',
    description = 'Reimbursement to the business for part of the $2,698 laptop (8 Jun 2026)',
    related_expense_id = '0fbef65c-dd22-4751-bb94-692d86881e60'
where id = 'f9cf615f-83f9-4a05-a690-8839b66061fa'
  and amount = 2000 and expense_date = '2026-06-11';

commit;

-- After running, verify:
--   select category, description, related_expense_id from public.expenses
--   where id in (
--     'cec86005-e99c-4f75-a79b-b8f1187e208c',   -- $1000  -> owner_capital
--     '0fbef65c-dd22-4751-bb94-692d86881e60',   -- $2698  -> capital_expense
--     'f9cf615f-83f9-4a05-a690-8839b66061fa');  -- $2000  -> expense_reimbursement (linked)
