import { createClient as createAuthedServerClient } from '@/lib/supabase-server'
import { createServerClient as createServiceRoleClient } from '@/lib/supabase'
import type {
  BuildProposalInput,
  ClientLike,
  ProposalRow,
  QuoteLike,
} from './mapProposalData'
import type { ProposalStatus } from './types'

export type ProposalSummary = {
  id: string
  status: ProposalStatus
  shareToken: string | null
}

// ── Column selections ────────────────────────────────────────

const PROPOSAL_COLUMNS = `
  id,
  quote_id,
  status,
  share_token,
  proposal_version,
  sent_at,
  viewed_at,
  accepted_at,
  accepted_by_name,
  payload,
  created_at,
  updated_at
`

// The mapper reads these exact fields. Keep in sync with QuoteLike.
const QUOTE_COLUMNS = `
  id,
  quote_number,
  frequency,
  service_address,
  scheduled_clean_date,
  date_issued,
  notes,
  generated_scope,
  base_price,
  calculated_price,
  override_price,
  is_price_overridden,
  client_id
`

// Keep in sync with ClientLike.
const CLIENT_COLUMNS = `
  name,
  company_name,
  service_address,
  phone,
  email
`

// ── Internal helpers ─────────────────────────────────────────

type SupabaseLike = ReturnType<typeof createAuthedServerClient>

async function hydrateQuoteAndClient(
  supabase: SupabaseLike,
  quoteId: string,
): Promise<{ quote: QuoteLike; client: ClientLike }> {
  const { data: quote } = await supabase
    .from('quotes')
    .select(QUOTE_COLUMNS)
    .eq('id', quoteId)
    .single<QuoteLike & { client_id: string | null }>()

  if (!quote) return { quote: null, client: null }

  let client: ClientLike = null
  if (quote.client_id) {
    const { data: clientRow } = await supabase
      .from('clients')
      .select(CLIENT_COLUMNS)
      .eq('id', quote.client_id)
      .single<ClientLike>()
    client = clientRow ?? null
  }

  // Strip client_id off the quote payload so it matches QuoteLike exactly.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { client_id, ...rest } = quote
  return { quote: rest as QuoteLike, client }
}

// ── Public API ───────────────────────────────────────────────

/**
 * Load a proposal by its UUID, plus the quote + client it references.
 * Used by the internal portal route. Respects the authenticated user's RLS.
 * Returns null if not found.
 */
export async function getProposalById(
  id: string,
): Promise<BuildProposalInput | null> {
  const supabase = createAuthedServerClient()

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('id', id)
    .single<ProposalRow>()

  if (error || !proposal) return null

  const { quote, client } = await hydrateQuoteAndClient(supabase, proposal.quote_id)
  return { proposal, quote, client }
}

/**
 * Load a proposal by its public share token, plus the quote + client.
 * Used by the public /share/proposal/[token] route. Runs with the
 * service-role key (server-only) so we can keep RLS strict on the
 * proposals/quotes/clients tables.
 * Returns null if not found.
 */
export async function getProposalByToken(
  token: string,
): Promise<BuildProposalInput | null> {
  if (!token) return null

  const supabase = createServiceRoleClient()

  const { data: proposal, error } = await supabase
    .from('proposals')
    .select(PROPOSAL_COLUMNS)
    .eq('share_token', token)
    .single<ProposalRow>()

  if (error || !proposal) return null

  const { quote, client } = await hydrateQuoteAndClient(
    supabase as unknown as SupabaseLike,
    proposal.quote_id,
  )
  return { proposal, quote, client }
}

/**
 * Record the first public view of a proposal.
 *
 * Rules:
 * - Only sets viewed_at when it is currently NULL (via conditional update).
 * - Only bumps status from 'sent' -> 'viewed'. Never downgrades or
 *   overwrites 'accepted' / 'draft'.
 * - Runs server-side only, using the service-role client.
 *
 * Safe to call on every share-route load — the conditional update means
 * subsequent calls are no-ops.
 */
export async function recordProposalViewed(
  proposalId: string,
): Promise<void> {
  const supabase = createServiceRoleClient()
  const now = new Date().toISOString()

  // Stamp viewed_at only when it's still null.
  await supabase
    .from('proposals')
    .update({ viewed_at: now, updated_at: now })
    .eq('id', proposalId)
    .is('viewed_at', null)

  // Transition status from sent -> viewed only. Leaves draft / accepted alone.
  await supabase
    .from('proposals')
    .update({ status: 'viewed', updated_at: now })
    .eq('id', proposalId)
    .eq('status', 'sent')
}

/**
 * Look up the proposal linked to a quote, if any.
 * Returns a lightweight summary (id + status + share token) — intended for the
 * quote detail page action bar, which only needs to decide Create vs View.
 *
 * Enforces the current "one proposal per quote" rule by selecting the most
 * recent row if multiple somehow exist.
 */
export async function getProposalByQuoteId(
  quoteId: string,
): Promise<ProposalSummary | null> {
  const supabase = createAuthedServerClient()

  const { data, error } = await supabase
    .from('proposals')
    .select('id, status, share_token')
    .eq('quote_id', quoteId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle<{ id: string; status: string; share_token: string | null }>()

  if (error || !data) return null

  const status: ProposalStatus =
    data.status === 'draft' ||
    data.status === 'sent' ||
    data.status === 'viewed' ||
    data.status === 'accepted'
      ? data.status
      : 'draft'

  return {
    id: data.id,
    status,
    shareToken: data.share_token,
  }
}
