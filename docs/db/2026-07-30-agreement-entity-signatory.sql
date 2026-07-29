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
  add column if not exists authorised_signatory_capacity text,   -- e.g. Director, Trustee, Partner
  -- Authority-to-bind DECLARATION (entities only). The signatory actively
  -- confirms they are authorised to bind the entity. Snapshotted at sign +
  -- immutable. NOT a Sano-verified fact — see authority_verified_* below.
  add column if not exists authority_confirmed         boolean not null default false,
  add column if not exists authority_declaration_text  text,     -- exact wording shown
  add column if not exists authority_declaration_version text,   -- e.g. 'authority-to-bind-2026-v1'
  add column if not exists authority_confirmed_at       timestamptz,
  -- FUTURE staff-only authority verification (NOT set/used in PR 3; nullable so a
  -- later PR can record that Sano independently verified signing authority +
  -- attach supporting evidence). Declaring the columns now avoids a later
  -- migration; leaving them null keeps authority "declared, not verified".
  add column if not exists authority_verified_at        timestamptz,
  add column if not exists authority_verified_by        uuid references auth.users(id) on delete set null,
  add column if not exists authority_verification_ref   text;

comment on column public.employment_agreements.contractor_business_structure is
  'Contracting structure captured/confirmed at signing (sole_trader|company|partnership|trust|other). Drives which entity fields + the signatory block appear on the signed agreement.';
comment on column public.employment_agreements.authorised_signatory_name is
  'For an entity contractor (company/trust/partnership), the individual who signed on the entity''s behalf. Null for a sole trader (they sign personally).';
comment on column public.employment_agreements.authorised_signatory_capacity is
  'The signatory''s capacity/authority for an entity (e.g. Director, Trustee, Partner, duly authorised). Shown on the signed agreement.';
comment on column public.employment_agreements.authority_confirmed is
  'Entity signatory actively confirmed authority to bind the entity at signing (mandatory for company/partnership/trust; always false/irrelevant for a sole trader). Frozen at sign; never altered afterwards. A DECLARATION by the signatory — not independently verified by Sano (see authority_verified_at).';
comment on column public.employment_agreements.authority_verified_at is
  'Reserved for a FUTURE staff-only workflow that independently verifies signing authority. Null in PR 3 — authority is declared by the signatory, not verified by Sano. Do not present authority as verified while this is null.';

commit;

-- ── Read-only verification ──────────────────────────────────────────────────
select column_name from information_schema.columns
where table_schema='public' and table_name='employment_agreements'
  and column_name in ('contractor_business_structure','contractor_legal_name','contractor_nzbn',
    'contractor_company_number','contractor_registered_address','authorised_signatory_name','authorised_signatory_capacity',
    'authority_confirmed','authority_declaration_text','authority_declaration_version','authority_confirmed_at',
    'authority_verified_at','authority_verified_by','authority_verification_ref')
order by column_name;   -- expect 14 rows

-- ── Rollback (commented) ────────────────────────────────────────────────────
-- begin;
--   alter table public.employment_agreements
--     drop column if exists contractor_business_structure,
--     drop column if exists contractor_legal_name,
--     drop column if exists contractor_nzbn,
--     drop column if exists contractor_company_number,
--     drop column if exists contractor_registered_address,
--     drop column if exists authorised_signatory_name,
--     drop column if exists authorised_signatory_capacity,
--     drop column if exists authority_confirmed,
--     drop column if exists authority_declaration_text,
--     drop column if exists authority_declaration_version,
--     drop column if exists authority_confirmed_at,
--     drop column if exists authority_verified_at,
--     drop column if exists authority_verified_by,
--     drop column if exists authority_verification_ref;
-- commit;
