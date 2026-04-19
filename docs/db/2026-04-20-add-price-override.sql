-- Manual price override fields
-- Adds 7 columns each to quotes and invoices.
-- Invoices receive the values as an audit snapshot during convertToInvoice.
-- Run via Supabase dashboard SQL editor.

-- NOTE: IF NOT EXISTS means this script reports success even if columns
-- already exist (e.g. from a previous partial run). Before running,
-- confirm that quotes and invoices do NOT already have these columns in
-- the Supabase table editor. If they do, DROP the columns first.

-- ── quotes table ─────────────────────────────────────────────
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS is_price_overridden     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_price          decimal(10,2),
  ADD COLUMN IF NOT EXISTS override_reason         text,
  ADD COLUMN IF NOT EXISTS override_confirmed      boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_confirmed_by   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_confirmed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS calculated_price        decimal(10,2);

-- ── invoices table ──────────────────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS is_price_overridden     boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_price          decimal(10,2),
  ADD COLUMN IF NOT EXISTS override_reason         text,
  ADD COLUMN IF NOT EXISTS override_confirmed      boolean      NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS override_confirmed_by   uuid         REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS override_confirmed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS calculated_price        decimal(10,2);

-- Index for queries that filter overridden rows for audit reporting.
CREATE INDEX IF NOT EXISTS idx_quotes_is_price_overridden
  ON public.quotes (is_price_overridden) WHERE is_price_overridden;

CREATE INDEX IF NOT EXISTS idx_invoices_is_price_overridden
  ON public.invoices (is_price_overridden) WHERE is_price_overridden;
