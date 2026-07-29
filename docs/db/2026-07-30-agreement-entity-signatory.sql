-- 2026-07-30 — Structure-aware contractor agreement: entity details + signatory (PR 3).
--
-- Captures the contracting ENTITY details and the AUTHORISED SIGNATORY on the
-- contractor agreement itself, so the signed agreement + PDF show who is
-- contracting (sole trader / company / partnership / trust) and — for an entity —
-- who signed on its behalf and in what capacity. These are snapshotted onto the
-- agreement at signing (like the schedule snapshot) so the signed record is
-- stable even if the contractor master record changes later.
--
-- PR 3 scope: structure-aware FIELDS + authorised signatory + full entity details
-- in the signed PDF. NO clause-wording changes (legal wording stays with the
-- lawyer). NO withholding / IRD / tax math. Nothing sent to any contractor.
-- Additive + idempotent. Mike-run.

-- ── Read-only preflight (expect the columns absent) ─────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name in ('contractor_business_structure','authorised_signatory_name');

begin;

alter table public.employment_agreements
  add column if not exists contractor_business_structure text,   -- sole_trader|company|partnership|trust|other
  add column if not exists contractor_legal_name        text,    -- entity legal name (company/trust/partnership)
  add column if not exists contractor_nzbn              text,
  add column if not exists contractor_company_number    text,
  add column if not exists contractor_registered_address text,
  add column if not exists authorised_signatory_name    text,    -- who signed for an entity
  add column if not exists authorised_signatory_capacity text;   -- e.g. Director, Trustee, Partner

comment on column public.employment_agreements.contractor_business_structure is
  'Contracting structure captured/confirmed at signing (sole_trader|company|partnership|trust|other). Drives which entity fields + the signatory block appear on the signed agreement.';
comment on column public.employment_agreements.authorised_signatory_name is
  'For an entity contractor (company/trust/partnership), the individual who signed on the entity''s behalf. Null for a sole trader (they sign personally).';
comment on column public.employment_agreements.authorised_signatory_capacity is
  'The signatory''s capacity/authority for an entity (e.g. Director, Trustee, Partner, duly authorised). Shown on the signed agreement.';

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name in ('contractor_business_structure','contractor_legal_name','contractor_nzbn',
    'contractor_company_number','contractor_registered_address','authorised_signatory_name','authorised_signatory_capacity')
order by column_name;   -- expect 7 rows

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   alter table public.employment_agreements
--     drop column if exists contractor_business_structure,
--     drop column if exists contractor_legal_name,
--     drop column if exists contractor_nzbn,
--     drop column if exists contractor_company_number,
--     drop column if exists contractor_registered_address,
--     drop column if exists authorised_signatory_name,
--     drop column if exists authorised_signatory_capacity;
-- commit;
