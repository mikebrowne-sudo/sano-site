-- 2026-08-06 — Conservative backfill of email_business_name from company.
--
-- REVIEW-FIRST. Run PART 1 to populate proposals, then PART 2 to review them,
-- then hand-fix the handful of judgment cases (PART 3 examples). Only fills rows
-- where email_business_name is still null, so it's safe to re-run and never
-- clobbers a value you've already set by hand.
--
-- The cleanup mirrors src/lib/campaigns/email-business-name.ts (conservative):
--   1. drop a trailing bracketed note  "(Bayleys group)", "(AIS)"
--   2. drop a trailing legal suffix    Ltd / Limited / NZ Limited / Co / Inc / …
--   3. tidy whitespace + stray separators
-- It deliberately does NOT shorten real names (e.g. "Autex Industries" stays) —
-- those are judgment calls left for review.

-- ── PART 1 — populate proposals (only where not already set) ─────────────────
begin;

update public.sales_leads
set email_business_name =
  nullif(
    btrim(
      regexp_replace(
        -- 2. strip trailing legal suffix (after brackets removed)
        regexp_replace(
          -- 1. strip a trailing bracketed note
          regexp_replace(company, '\s*[\(\[][^)\]]*[\)\]]\s*$', '', 'g'),
          '[,]?\s+(NZ Limited|New Zealand Limited|Limited|Ltd\.?|Pty Ltd|LLC|Inc\.?|Incorporated|Co\.?|Company)\s*$',
          '', 'i'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  )
where email_business_name is null
  and company is not null;

commit;

-- ── PART 2 — REVIEW: eyeball the proposals before sending ────────────────────
-- Run this SELECT and scan the output. Anything where the proposed name still
-- looks wrong (research notes, contact names, all-caps, a name that should be
-- shortened) gets hand-fixed in PART 3.
--
-- select quality_rank as grade, company, email_business_name
-- from public.sales_leads
-- where company is not null
-- order by quality_rank, company;
--
-- Flag rows that likely still need a human eye:
-- select quality_rank as grade, company, email_business_name
-- from public.sales_leads
-- where company is not null
--   and (
--     email_business_name is null
--     or length(email_business_name) > 45
--     or email_business_name ~* '(CONFIRMED|VERIFY|Director|Manager|note|likely|—|–|\||<|>|=)'
--     or email_business_name = upper(email_business_name)
--   )
-- order by quality_rank, company;

-- ── PART 3 — hand-fix the judgment cases (examples) ──────────────────────────
-- These are the ones the conservative rule intentionally leaves alone. Adjust /
-- add to taste; match on company (or email for certainty).
--
-- update public.sales_leads set email_business_name = 'Autex'
--   where company = 'Autex Industries';
-- update public.sales_leads set email_business_name = 'Armstrong’s Newmarket'
--   where company = 'Armstrong''s Certified Used Newmarket';
