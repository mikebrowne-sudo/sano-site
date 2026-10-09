-- Overdue-invoice reminders: one row per reminder email sent from the invoice
-- page. Drives the reminder history, the stage (1 friendly / 2 second /
-- 3 final) and the "Reminder due" hints. Run BEFORE merging the PR.

create table if not exists public.invoice_reminders (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  uuid not null references public.invoices(id) on delete cascade,
  stage       smallint not null check (stage between 1 and 3),
  sent_at     timestamptz not null default now(),
  sent_by     uuid,
  to_email    text not null,
  cc_emails   text[],
  amount_due  numeric(10,2) not null,
  subject     text
);

create index if not exists invoice_reminders_invoice_idx on public.invoice_reminders (invoice_id, sent_at);

alter table public.invoice_reminders enable row level security;

drop policy if exists invoice_reminders_admin_all on public.invoice_reminders;
create policy invoice_reminders_admin_all on public.invoice_reminders
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists invoice_reminders_finance_read on public.invoice_reminders;
create policy invoice_reminders_finance_read on public.invoice_reminders
  for select to authenticated using (public.is_finance());

-- verify: expect 1 row, rls = true
select relname, relrowsecurity as rls from pg_class where relname = 'invoice_reminders';
