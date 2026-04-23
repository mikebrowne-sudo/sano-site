-- ════════════════════════════════════════════════════════════════════
--  Universal billing / contact / reference fields — Phase 5D
--
--  Promotes the seven Phase 5A tender fields from
--  commercial_quote_details to quotes, so they apply to ALL quote
--  categories (residential / property_management / airbnb /
--  commercial). Also adds the same seven columns to invoices so
--  the conversion flow can snapshot them onto the invoice.
--
--  Strategy:
--    1. Add columns to quotes (nullable / boolean default false).
--    2. Add columns to invoices (same shape).
--    3. Backfill quotes.{field} from commercial_quote_details.{field}
--       for any commercial quote that already has values stored —
--       no data loss for existing commercial quotes.
--    4. The legacy commercial_quote_details columns STAY in place.
--       This migration does not drop them. They become a read-only
--       fallback for any historical row whose `quotes` columns
--       happen to be null. Future cleanup phase can drop them.
--
--  Safe + idempotent. No destructive changes.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. quotes — add seven universal columns ────────────────────────
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS contact_name           text,
  ADD COLUMN IF NOT EXISTS contact_email          text,
  ADD COLUMN IF NOT EXISTS contact_phone          text,
  ADD COLUMN IF NOT EXISTS accounts_email         text,
  ADD COLUMN IF NOT EXISTS accounts_contact_name  text,
  ADD COLUMN IF NOT EXISTS client_reference       text,
  ADD COLUMN IF NOT EXISTS requires_po            boolean NOT NULL DEFAULT false;

-- ── 2. invoices — same seven columns for snapshot at conversion ────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS contact_name           text,
  ADD COLUMN IF NOT EXISTS contact_email          text,
  ADD COLUMN IF NOT EXISTS contact_phone          text,
  ADD COLUMN IF NOT EXISTS accounts_email         text,
  ADD COLUMN IF NOT EXISTS accounts_contact_name  text,
  ADD COLUMN IF NOT EXISTS client_reference       text,
  ADD COLUMN IF NOT EXISTS requires_po            boolean NOT NULL DEFAULT false;

-- ── 3. Backfill quotes from commercial_quote_details ───────────────
-- For each commercial quote that already has values on the legacy
-- columns, copy them up to the universal columns on the quote.
-- Idempotent — re-running is a no-op (COALESCE keeps existing
-- non-null values intact, never overwrites with stale data).
UPDATE public.quotes q
   SET contact_name          = COALESCE(q.contact_name,          cqd.contact_name),
       contact_email         = COALESCE(q.contact_email,         cqd.contact_email),
       contact_phone         = COALESCE(q.contact_phone,         cqd.contact_phone),
       accounts_email        = COALESCE(q.accounts_email,        cqd.accounts_email),
       accounts_contact_name = COALESCE(q.accounts_contact_name, cqd.accounts_contact_name),
       client_reference      = COALESCE(q.client_reference,      cqd.client_reference),
       requires_po           = q.requires_po OR COALESCE(cqd.requires_po, false)
  FROM public.commercial_quote_details cqd
 WHERE cqd.quote_id = q.id;

-- ── 4. Column comments ─────────────────────────────────────────────
COMMENT ON COLUMN public.quotes.contact_name           IS 'Phase 5D: primary site contact name (quote-level override; does not replace clients.name).';
COMMENT ON COLUMN public.quotes.contact_email          IS 'Phase 5D: primary site contact email.';
COMMENT ON COLUMN public.quotes.contact_phone          IS 'Phase 5D: primary site contact phone.';
COMMENT ON COLUMN public.quotes.accounts_email         IS 'Phase 5D: accounts/finance email — invoices route here when set.';
COMMENT ON COLUMN public.quotes.accounts_contact_name  IS 'Phase 5D: accounts/finance contact name.';
COMMENT ON COLUMN public.quotes.client_reference       IS 'Phase 5D: client reference / PO number printed on invoices.';
COMMENT ON COLUMN public.quotes.requires_po            IS 'Phase 5D: client requires a PO number before invoicing.';

COMMENT ON COLUMN public.invoices.contact_name           IS 'Phase 5D: snapshot of quote contact_name at conversion time.';
COMMENT ON COLUMN public.invoices.contact_email          IS 'Phase 5D: snapshot of quote contact_email at conversion time.';
COMMENT ON COLUMN public.invoices.contact_phone          IS 'Phase 5D: snapshot of quote contact_phone at conversion time.';
COMMENT ON COLUMN public.invoices.accounts_email         IS 'Phase 5D: snapshot of quote accounts_email — invoice email logic prefers this when set.';
COMMENT ON COLUMN public.invoices.accounts_contact_name  IS 'Phase 5D: snapshot of quote accounts_contact_name at conversion time.';
COMMENT ON COLUMN public.invoices.client_reference       IS 'Phase 5D: snapshot of quote client_reference / PO number at conversion time.';
COMMENT ON COLUMN public.invoices.requires_po            IS 'Phase 5D: snapshot of quote requires_po flag at conversion time.';
