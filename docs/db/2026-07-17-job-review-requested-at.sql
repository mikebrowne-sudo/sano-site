-- Reviews workflow — record every review request per customer, so we don't
-- double-ask (12-month window) and can show history. Additive + idempotent.
-- Mike-run.

create table if not exists public.review_requests (
  id         uuid primary key default gen_random_uuid(),
  client_id  uuid references public.clients(id) on delete cascade,
  job_id     uuid references public.jobs(id)    on delete set null,
  channel    text,        -- 'sms' | 'email' | 'sms+email'
  variant    text,        -- 'recent' | 'previous'
  message    text,
  sent_by    uuid references auth.users(id) on delete set null,
  sent_at    timestamptz not null default now()
);

create index if not exists review_requests_client_idx
  on public.review_requests(client_id, sent_at desc);

alter table public.review_requests enable row level security;

drop policy if exists review_requests_staff_all on public.review_requests;
create policy review_requests_staff_all on public.review_requests
  for all
  to authenticated
  using (not public.is_contractor())
  with check (not public.is_contractor());
