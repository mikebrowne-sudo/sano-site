-- ════════════════════════════════════════════════════════════════════
--  Commercial tender fields — Phase 5A
--
--  Additive only. Extends commercial_quote_details with the fields
--  needed for real-world invoicing, contract clarity, proposal
--  generation, and the operational quote → job → invoice flow.
--
--  Five logical groups:
--    1. Contact structure   (5 cols, all nullable text)
--    2. PO / reference      (1 nullable text + 1 boolean DEFAULT false)
--    3. Contract terms      (1 enum text + 1 nullable int + 1 nullable date)
--    4. Service level       (1 enum text)
--    5. Site constraints    (3 booleans DEFAULT false + 1 nullable text)
--
--  Safe + idempotent: every statement uses IF NOT EXISTS / DO blocks
--  so the migration can be re-run on the same DB without effect.
--  Existing quotes continue to load — every new column is nullable
--  (or boolean DEFAULT false) so old rows pass through cleanly.
--
--  No drops, no renames, no constraint changes on existing columns,
--  no impact on the pricing engine or proposal payload.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. Contact structure ────────────────────────────────────────────
ALTER TABLE public.commercial_quote_details
  ADD COLUMN IF NOT EXISTS contact_name           text,
  ADD COLUMN IF NOT EXISTS contact_email          text,
  ADD COLUMN IF NOT EXISTS contact_phone          text,
  ADD COLUMN IF NOT EXISTS accounts_email         text,
  ADD COLUMN IF NOT EXISTS accounts_contact_name  text;

-- ── 2. Purchase order / client reference ───────────────────────────
ALTER TABLE public.commercial_quote_details
  ADD COLUMN IF NOT EXISTS client_reference  text,
  ADD COLUMN IF NOT EXISTS requires_po       boolean NOT NULL DEFAULT false;

-- ── 3. Contract terms ──────────────────────────────────────────────
ALTER TABLE public.commercial_quote_details
  ADD COLUMN IF NOT EXISTS contract_term      text,
  ADD COLUMN IF NOT EXISTS notice_period_days integer,
  ADD COLUMN IF NOT EXISTS service_start_date date;

DO $$ BEGIN
  ALTER TABLE public.commercial_quote_details
    ADD CONSTRAINT commercial_quote_details_contract_term_check
    CHECK (contract_term IS NULL OR contract_term IN ('3_months','6_months','12_months','open'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 4. Service level (cleaning standard) ───────────────────────────
ALTER TABLE public.commercial_quote_details
  ADD COLUMN IF NOT EXISTS cleaning_standard text;

DO $$ BEGIN
  ALTER TABLE public.commercial_quote_details
    ADD CONSTRAINT commercial_quote_details_cleaning_standard_check
    CHECK (cleaning_standard IS NULL OR cleaning_standard IN ('maintenance','high_presentation','premium'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 5. Site constraint flags ───────────────────────────────────────
ALTER TABLE public.commercial_quote_details
  ADD COLUMN IF NOT EXISTS security_sensitive     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS induction_required     boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restricted_areas       boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restricted_areas_notes text;

-- ── Column comments (safe to re-run) ───────────────────────────────
COMMENT ON COLUMN public.commercial_quote_details.contact_name           IS 'Phase 5A: primary site contact name (quote-level override; does not replace clients.name).';
COMMENT ON COLUMN public.commercial_quote_details.contact_email          IS 'Phase 5A: primary site contact email.';
COMMENT ON COLUMN public.commercial_quote_details.contact_phone          IS 'Phase 5A: primary site contact phone.';
COMMENT ON COLUMN public.commercial_quote_details.accounts_email         IS 'Phase 5A: accounts/finance email for invoicing.';
COMMENT ON COLUMN public.commercial_quote_details.accounts_contact_name  IS 'Phase 5A: accounts/finance contact name.';
COMMENT ON COLUMN public.commercial_quote_details.client_reference       IS 'Phase 5A: client reference / PO number printed on invoices.';
COMMENT ON COLUMN public.commercial_quote_details.requires_po            IS 'Phase 5A: client requires a PO number before invoicing.';
COMMENT ON COLUMN public.commercial_quote_details.contract_term          IS 'Phase 5A: 3_months / 6_months / 12_months / open.';
COMMENT ON COLUMN public.commercial_quote_details.notice_period_days     IS 'Phase 5A: number of days notice required to terminate.';
COMMENT ON COLUMN public.commercial_quote_details.service_start_date     IS 'Phase 5A: agreed start date for the service.';
COMMENT ON COLUMN public.commercial_quote_details.cleaning_standard      IS 'Phase 5A: maintenance / high_presentation / premium.';
COMMENT ON COLUMN public.commercial_quote_details.security_sensitive     IS 'Phase 5A: site has security-sensitive areas (rotated keys, sign-in protocol).';
COMMENT ON COLUMN public.commercial_quote_details.induction_required     IS 'Phase 5A: staff need formal site induction before first visit.';
COMMENT ON COLUMN public.commercial_quote_details.restricted_areas       IS 'Phase 5A: site has restricted / off-limits areas not part of the cleaning scope.';
COMMENT ON COLUMN public.commercial_quote_details.restricted_areas_notes IS 'Phase 5A: free-text notes describing restricted areas (only meaningful when restricted_areas = true).';
