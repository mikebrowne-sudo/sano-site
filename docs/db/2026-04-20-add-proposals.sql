-- Commercial proposals table
-- Links a proposal to an existing quote and tracks its lifecycle:
-- draft -> sent -> viewed -> accepted.
--
-- Reads from the public /share/proposal/[token] route are performed
-- server-side using the SUPABASE_SERVICE_ROLE_KEY (see src/lib/supabase.ts),
-- so RLS stays strict ("authenticated users full access" only) and we do
-- NOT add an anon SELECT policy. This is tighter than the current quote
-- share pattern and is safe because no browser code ever queries this
-- table directly.
--
-- Run via Supabase Studio -> SQL Editor. Idempotent (IF NOT EXISTS).

-- ── proposals table ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.proposals (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id             uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  status               text NOT NULL DEFAULT 'draft'
                         CHECK (status IN ('draft','sent','viewed','accepted')),
  share_token          text UNIQUE DEFAULT gen_random_uuid()::text,
  proposal_version     integer NOT NULL DEFAULT 1,

  -- Lifecycle timestamps
  sent_at              timestamptz NULL,
  viewed_at            timestamptz NULL,
  accepted_at          timestamptz NULL,
  accepted_by_name     text NULL,

  -- Optional send-time snapshot. When the proposal is sent we can freeze the
  -- ProposalViewModel (or a subset of it) here so the client always sees the
  -- version that was sent, even if the underlying quote/pricing changes. The
  -- mapper prefers payload values over live quote values when payload is set.
  payload              jsonb NULL,

  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
-- Lookup by quote (portal detail pages, one-to-many quote -> proposals)
CREATE INDEX IF NOT EXISTS idx_proposals_quote_id
  ON public.proposals (quote_id);

-- Lookup by share token (public /share/proposal/[token] route)
-- UNIQUE on the column already creates an index, but we add this NOTNULL
-- partial index to keep the public lookup fast and to document intent.
CREATE INDEX IF NOT EXISTS idx_proposals_share_token
  ON public.proposals (share_token)
  WHERE share_token IS NOT NULL;

-- Status filtering for portal list views
CREATE INDEX IF NOT EXISTS idx_proposals_status
  ON public.proposals (status);

-- ── RLS ───────────────────────────────────────────────────────
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated users full access"
  ON public.proposals;

CREATE POLICY "authenticated users full access"
  ON public.proposals
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- No anon policy on purpose: the public share route uses the service role
-- client on the server. If we later want anon-keyed public reads, add a
-- narrow "anon SELECT where share_token IS NOT NULL" policy here.
