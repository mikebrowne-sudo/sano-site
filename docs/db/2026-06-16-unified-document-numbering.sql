-- Unified QUO / JOB / INV numbering (Option A — inherit down the chain).
--
-- Goal: a quote that becomes a job and then an invoice shares ONE trailing
-- number: QUO-0200 -> JOB-0200 -> INV-0200. Standalone jobs and custom
-- invoices draw the next free number from a single shared pool, so every
-- number across the three tables stays globally unique.
--
-- All logic lives in the existing BEFORE-INSERT triggers, keyed off the
-- link columns already on the rows (jobs.quote_id, invoices.job_id /
-- invoices.quote_id). No application code changes are required, and it
-- applies to every creation path automatically.
--
-- Scope: NEW documents only. Existing quotes/jobs/invoices keep their
-- current (mismatched) numbers — issued invoices are never renumbered.
--
-- Idempotent: safe to run more than once (the shared pool never rewinds).

begin;

-- 1) Shared document-number pool.
create sequence if not exists public.document_number_seq;

-- Seed it above every existing number so new numbers can't collide with
-- history. Starts the unified scheme cleanly at 0200 (current max is
-- QUO-0110). Includes the pool's own current value so a re-run never
-- rewinds past numbers already issued.
select setval('public.document_number_seq', greatest(
  (select last_value from public.quote_number_seq),
  (select last_value from public.job_number_seq),
  (select last_value from public.invoice_number_seq),
  (select last_value from public.document_number_seq),
  199
), true);

-- 2) Quotes start a chain — always a fresh shared number.
create or replace function public.generate_quote_number()
returns trigger language plpgsql as $$
begin
  if new.quote_number is null or new.quote_number = '' then
    new.quote_number := 'QUO-' || lpad(nextval('public.document_number_seq')::text, 4, '0');
  end if;
  return new;
end;
$$;

-- 3) Jobs inherit their quote's number (prefix -> JOB); manual jobs draw
--    a fresh shared number. Falls back to a fresh number if the inherited
--    one is already taken (e.g. a 2nd job off the same quote).
create or replace function public.generate_job_number()
returns trigger language plpgsql as $$
declare v_src text; v_num text;
begin
  if new.job_number is not null and new.job_number <> '' then
    return new; -- an explicitly supplied number always wins
  end if;
  if new.quote_id is not null then
    select quote_number into v_src from public.quotes where id = new.quote_id;
  end if;
  if v_src is not null and v_src ~ '[0-9]' then
    v_num := 'JOB-' || lpad((regexp_replace(v_src, '\D', '', 'g'))::int::text, 4, '0');
    if exists (select 1 from public.jobs where job_number = v_num) then
      v_num := null; -- collision -> fall through to a fresh number
    end if;
  end if;
  if v_num is null then
    v_num := 'JOB-' || lpad(nextval('public.document_number_seq')::text, 4, '0');
  end if;
  new.job_number := v_num;
  return new;
end;
$$;

-- 4) Invoices inherit their job's number, else their quote's number
--    (prefix -> INV); custom/standalone invoices draw a fresh shared
--    number. Same collision fallback.
create or replace function public.generate_invoice_number()
returns trigger language plpgsql as $$
declare v_src text; v_num text;
begin
  if new.invoice_number is not null and new.invoice_number <> '' then
    return new; -- explicit / custom number wins
  end if;
  if new.job_id is not null then
    select job_number into v_src from public.jobs where id = new.job_id;
  end if;
  if v_src is null and new.quote_id is not null then
    select quote_number into v_src from public.quotes where id = new.quote_id;
  end if;
  if v_src is not null and v_src ~ '[0-9]' then
    v_num := 'INV-' || lpad((regexp_replace(v_src, '\D', '', 'g'))::int::text, 4, '0');
    if exists (select 1 from public.invoices where invoice_number = v_num) then
      v_num := null;
    end if;
  end if;
  if v_num is null then
    v_num := 'INV-' || lpad(nextval('public.document_number_seq')::text, 4, '0');
  end if;
  new.invoice_number := v_num;
  return new;
end;
$$;

commit;

-- ── Verify (after applying) ──────────────────────────────────────────
-- Next unified number will be (last_value + 1):
--   select last_value from public.document_number_seq;   -- expect 199 → next 0200
-- Then in the UI: create a quote, convert it to a job, then to an invoice
-- — all three should read the same trailing number.
