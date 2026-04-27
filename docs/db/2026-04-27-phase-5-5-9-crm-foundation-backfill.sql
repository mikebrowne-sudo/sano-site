-- ════════════════════════════════════════════════════════════════════
--  Phase 5.5.9 — CRM data foundation (backfill).
--
--  Idempotent. Every write either INSERTs WHERE NOT EXISTS, or UPDATEs
--  only when the target column is NULL. No existing column is
--  overwritten. When a value is uncertain, the row is left NULL.
--
--  Uses `(array_agg(id ORDER BY created_at))[1]` instead of `min(id)`
--  because Postgres has no default `min(uuid)` aggregate.
--
--  Pairs with 2026-04-27-phase-5-5-9-crm-foundation-schema.sql.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. clients.accounts_email — pick the most-frequent non-null
--      accounts_email across the client's quotes + invoices. Skips
--      clients that already have one set, and clients with zero hits.
with seen as (
  select client_id, accounts_email, count(*) as freq, max(created_at) as last_seen
    from (
      select client_id, accounts_email, created_at from public.quotes
       where accounts_email is not null and accounts_email <> ''
      union all
      select client_id, accounts_email, created_at from public.invoices
       where accounts_email is not null and accounts_email <> ''
    ) t
   group by client_id, accounts_email
), ranked as (
  select client_id, accounts_email,
         row_number() over (partition by client_id order by freq desc, last_seen desc) as rn
    from seen
)
update public.clients c
   set accounts_email = r.accounts_email
  from ranked r
 where r.client_id = c.id
   and r.rn = 1
   and (c.accounts_email is null or c.accounts_email = '');

-- ── 2. Primary contact per client (one per client). Skips clients
--      that already have a primary contact.
insert into public.contacts (client_id, full_name, contact_type, email, phone)
select c.id, c.name, 'primary',
       nullif(c.email, ''), nullif(c.phone, '')
  from public.clients c
 where not exists (
   select 1 from public.contacts x
    where x.client_id = c.id and x.contact_type = 'primary'
 );

-- ── 3. Accounts contact per client (only when accounts_email is set
--      AND distinct from the primary contact's email AND no accounts
--      contact already exists). full_name comes from the most-recent
--      accounts_contact_name on a quote or invoice for that client;
--      falls back to the accounts_email itself.
with picked as (
  select client_id, accounts_email, accounts_contact_name, last_seen,
         row_number() over (partition by client_id order by last_seen desc) as rn
    from (
      select client_id, accounts_email, accounts_contact_name, created_at as last_seen
        from public.quotes
       where accounts_email is not null and accounts_email <> ''
      union all
      select client_id, accounts_email, accounts_contact_name, created_at as last_seen
        from public.invoices
       where accounts_email is not null and accounts_email <> ''
    ) t
)
insert into public.contacts (client_id, full_name, contact_type, email)
select c.id,
       coalesce(nullif(p.accounts_contact_name, ''), c.accounts_email),
       'accounts',
       c.accounts_email
  from public.clients c
  left join picked p on p.client_id = c.id and p.rn = 1
 where c.accounts_email is not null
   and c.accounts_email <> ''
   and (c.email is null or lower(c.accounts_email) <> lower(c.email))
   and not exists (
     select 1 from public.contacts x
      where x.client_id = c.id and x.contact_type = 'accounts'
   );

-- ── 4. Primary site per client. Address resolution order:
--        a) clients.service_address                    (live data)
--        b) most-common quotes.service_address         (history)
--        c) most-common jobs.address                   (history)
--      If none → no site created, fields stay NULL.
with addr_q as (
  select client_id, service_address as addr, count(*) as freq, max(created_at) as last_seen
    from public.quotes
   where service_address is not null and service_address <> ''
   group by client_id, service_address
), addr_j as (
  select client_id, address as addr, count(*) as freq, max(created_at) as last_seen
    from public.jobs
   where address is not null and address <> ''
   group by client_id, address
), unioned as (
  select client_id, addr, freq, last_seen, 1 as src_priority from addr_q
  union all
  select client_id, addr, freq, last_seen, 2 as src_priority from addr_j
), ranked as (
  select client_id, addr,
         row_number() over (
           partition by client_id
           order by src_priority asc, freq desc, last_seen desc
         ) as rn
    from unioned
), candidate as (
  select c.id as client_id,
         coalesce(nullif(c.service_address, ''), r.addr) as addr
    from public.clients c
    left join ranked r on r.client_id = c.id and r.rn = 1
)
insert into public.sites (client_id, address)
select cand.client_id, cand.addr
  from candidate cand
 where cand.addr is not null
   and not exists (
     select 1 from public.sites s where s.client_id = cand.client_id
   );

-- ── 5. sites.default_contact_id ← client's earliest primary contact.
with primaries as (
  select client_id, (array_agg(id order by created_at))[1] as contact_id
    from public.contacts where contact_type = 'primary'
   group by client_id
)
update public.sites s
   set default_contact_id = p.contact_id
  from primaries p
 where p.client_id = s.client_id
   and s.default_contact_id is null;

-- ── 6. quotes.contact_id + quotes.site_id (only when null).
with primaries as (
  select client_id, (array_agg(id order by created_at))[1] as contact_id
    from public.contacts where contact_type = 'primary'
   group by client_id
), psites as (
  select client_id, (array_agg(id order by created_at))[1] as site_id
    from public.sites
   group by client_id
)
update public.quotes q
   set contact_id = coalesce(q.contact_id, p.contact_id),
       site_id    = coalesce(q.site_id,    s.site_id)
  from primaries p
  left join psites s on s.client_id = p.client_id
 where p.client_id = q.client_id
   and (q.contact_id is null or q.site_id is null);

-- ── 7. jobs.contact_id, jobs.site_id, jobs.source (only when null).
with primaries as (
  select client_id, (array_agg(id order by created_at))[1] as contact_id
    from public.contacts where contact_type = 'primary'
   group by client_id
), psites as (
  select client_id, (array_agg(id order by created_at))[1] as site_id
    from public.sites
   group by client_id
)
update public.jobs j
   set contact_id = coalesce(j.contact_id, p.contact_id),
       site_id    = coalesce(j.site_id,    s.site_id),
       source     = coalesce(j.source,
                             case when j.recurring_job_id is not null then 'recurring'
                                  when j.quote_id         is not null then 'quote'
                                                                      else 'manual' end)
  from primaries p
  left join psites s on s.client_id = p.client_id
 where p.client_id = j.client_id
   and (j.contact_id is null or j.site_id is null or j.source is null);

-- ── 8. invoices.job_id ← unambiguous reverse jobs.invoice_id link.
--      Only fills when exactly one job points at the invoice.
with one_job as (
  select invoice_id, (array_agg(id order by created_at))[1] as job_id, count(*) as job_count
    from public.jobs
   where invoice_id is not null
   group by invoice_id
   having count(*) = 1
)
update public.invoices i
   set job_id = oj.job_id
  from one_job oj
 where oj.invoice_id = i.id
   and i.job_id is null;

-- ── 9. invoices.contact_id + invoices.source (only when null).
with primaries as (
  select client_id, (array_agg(id order by created_at))[1] as contact_id
    from public.contacts where contact_type = 'primary'
   group by client_id
)
update public.invoices i
   set contact_id = coalesce(i.contact_id, p.contact_id),
       source     = coalesce(i.source,
                             case when i.job_id is not null then 'job' else 'manual' end)
  from primaries p
 where p.client_id = i.client_id
   and (i.contact_id is null or i.source is null);

-- ── 10. clients.client_type best-effort default. Existing clients
--       become 'individual' unless they have a non-empty company_name,
--       in which case they become 'company'. Property managers stay
--       NULL until an admin sets them explicitly.
update public.clients
   set client_type = case
                       when company_name is not null and company_name <> '' then 'company'
                       else 'individual'
                     end
 where client_type is null;
