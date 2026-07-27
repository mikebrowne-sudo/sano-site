# Spec — Recurring invoicing for commercial contracts

**Date:** 2026-07-07
**Driver:** Pukekohe Golf Club is a $2,740/month recurring commercial client, but every month's job + invoice is entered by hand. The system does recurring *jobs* but not recurring *invoices*.

## What exists
- `recurring_jobs` table with `monthly_value` (client price), `contract_term_months`, `renewal_status`, `quote_id`, `scope_snapshot`, `frequency`, `next_due_date`.
- `generateNextJob(recurringId)` creates the next job (manual buttons; no cron). It sets `contractor_price` but not a client price.
- `createInvoiceFromJob(jobId)` — the tested path that raises a client invoice from a job (INV-numbering, due date via `computeInvoiceDueDate`, service scope).
- Staff action-centre "Send draft invoices" to-do (just shipped) surfaces draft invoices to send.

## Refined requirements (Mike, 2026-07-07)
- **Automated on a monthly schedule** — the invoice is NOT tied to a job or to "mark complete". A recurring contract cleans e.g. 3×/week but bills **monthly** at `monthly_value`. So invoicing runs on its own monthly cadence, driven by a cron — no clicking.
- **Default draft**, but a **per-contract "auto-send" toggle** (checkbox + a short instruction) and, when on, an **auto-send day** so the invoice emails itself to the client on that day each month.

## Design
Invoicing cadence is separate from the cleaning schedule.

**Schema** — add to `recurring_jobs`:
- `invoice_auto_send boolean default false`
- `invoice_send_day int` (day of month, 1–28; the day the invoice is raised / auto-sent)
- `next_invoice_date date` (the next date to raise an invoice; seeded from start + send day)

**Generation** — `generateRecurringInvoice(recurringId)` (server + cron-callable):
1. Creates a **draft** invoice for `monthly_value`, linked to the client, with scope/description from `scope_snapshot`/`title`, INV-numbering + due date via the shared invoice helpers (mirrors `createInvoiceFromJob`, but sourced from the contract, not a single clean).
2. If `invoice_auto_send` is on → send it (reuse the existing invoice-send path); else leave it a draft → it shows in the action-centre "Send draft invoices" to-do.
3. Advance `next_invoice_date` one month.
4. Skip if `monthly_value` is null or an invoice for that contract+period already exists (idempotent).

**Automation** — a daily cron (`/api/cron/recurring-invoices`, CRON_SECRET-guarded, scheduled like the existing daily-notifications cron) calls a batch runner: for every active recurring contract with `monthly_value` and `next_invoice_date <= today`, run `generateRecurringInvoice`.

**UI** — recurring-job form: an "Auto-send this invoice to the client" checkbox with instruction text + a "Send on day [1–28] of each month" field. Recurring detail: shows next invoice date + a manual "Generate invoice now" button (for ad-hoc / testing).

## Pukekohe setup (after build)
Create their `recurring_jobs` row: monthly frequency, `monthly_value = 2740`, start date, assigned contractor + `contractor_price`, `service_category`. Then each month "Generate" produces the job + a $2,740 draft invoice.

## Verification
- Gauntlet at baseline. Extend `create-invoice-from-job` / recurring tests for the monthly_value path.
- Manual: set up a test recurring contract with monthly_value, generate, confirm a draft invoice for the right amount + client appears and lands in the to-do.

## Out of scope (v1)
- Auto-send invoices. Cron auto-generation (stays manual "Generate"). Proration / mid-month changes.
