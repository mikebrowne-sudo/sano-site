-- ════════════════════════════════════════════════════════════════════
--  Quote lifecycle, versioning, and archive — Phase 6
--
--  Adds linked-row versioning to quotes and soft-delete to invoices.
--  Reuses the existing audit_log + record_snapshots tables (introduced
--  in 2026-04-20-commercial-quote-foundation.sql).
--
--  Decisions baked in:
--    • v1 keeps the original quote_number; v2+ render with a "-vN"
--      suffix at display time (no DB-side number munging).
--    • Each version owns its own share_token (per-version sharing —
--      old links remain valid for what was actually sent).
--    • Per-version share_token already exists (every quote row has
--      its own); the version-clone action will generate a fresh one.
--    • parent_quote_id always points at the v1 root for v2+ rows
--      (single-chain, easy version listing). NULL for v1.
--    • is_latest_version is true on exactly one row per chain.
--      A new partial unique index enforces this invariant.
--
--  Forward-only, idempotent. No data migration needed — defaults make
--  every existing quote v1 / latest / active.
-- ════════════════════════════════════════════════════════════════════

-- ── 1. quotes — versioning columns ─────────────────────────────────
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS version_number     integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS parent_quote_id    uuid    NULL
    REFERENCES public.quotes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_latest_version  boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS version_note       text    NULL;

-- Active-and-latest is the default list-page predicate.
CREATE INDEX IF NOT EXISTS idx_quotes_latest_active
  ON public.quotes (created_at DESC)
  WHERE is_latest_version = true AND deleted_at IS NULL;

-- Cheap traversal of a version chain (root → children).
CREATE INDEX IF NOT EXISTS idx_quotes_parent
  ON public.quotes (parent_quote_id, version_number)
  WHERE parent_quote_id IS NOT NULL;

-- Invariant: at most one is_latest_version=true per chain.
-- For v1 (parent_quote_id IS NULL), the chain key is the row's own id;
-- for v2+, the chain key is parent_quote_id. Use COALESCE so the
-- partial unique index treats both consistently.
CREATE UNIQUE INDEX IF NOT EXISTS idx_quotes_one_latest_per_chain
  ON public.quotes ( COALESCE(parent_quote_id, id) )
  WHERE is_latest_version = true AND deleted_at IS NULL;

COMMENT ON COLUMN public.quotes.version_number    IS 'Phase 6: 1-based version within a chain. v1 is the root.';
COMMENT ON COLUMN public.quotes.parent_quote_id   IS 'Phase 6: points at the v1 root for v2+; NULL for v1.';
COMMENT ON COLUMN public.quotes.is_latest_version IS 'Phase 6: exactly one true per chain. Partial unique index enforces this.';
COMMENT ON COLUMN public.quotes.version_note      IS 'Phase 6: short human note on why this version was created.';

-- ── 2. invoices — soft-delete columns ──────────────────────────────
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS deleted_by uuid NULL
    REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_invoices_active
  ON public.invoices (created_at DESC) WHERE deleted_at IS NULL;

COMMENT ON COLUMN public.invoices.deleted_at IS 'Phase 6: soft-delete timestamp. NULL = active.';
COMMENT ON COLUMN public.invoices.deleted_by IS 'Phase 6: user who archived the invoice.';
