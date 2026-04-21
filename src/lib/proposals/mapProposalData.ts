import type {
  ProposalContent,
  ProposalPricing,
  ProposalStatus,
  ProposalViewModel,
  ScopeGroup,
  ServiceLevel,
} from './types'
import {
  proposalAcceptanceBlurb,
  proposalExcludedItems,
  proposalHowWeWork,
  proposalIncludedItems,
  proposalIntroduction,
  proposalPaymentTerms,
  proposalServiceOptions,
  proposalTermsOverview,
} from './content'

// ── Raw DB row shapes ────────────────────────────────────────
// These are intentionally loose. The commercial pricing tool is still being
// finalised, so any quote/calculation field below can be null or missing and
// the mapper must still return a valid ProposalViewModel.

export type ProposalRow = {
  id: string
  quote_id: string
  status: string
  share_token: string | null
  proposal_version: number
  sent_at: string | null
  viewed_at: string | null
  accepted_at: string | null
  accepted_by_name: string | null
  payload: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export type QuoteLike = {
  id: string
  quote_number: string | null
  frequency: string | null
  service_address: string | null
  scheduled_clean_date: string | null
  date_issued: string | null
  notes: string | null
  generated_scope: string | null
  base_price: number | null
  calculated_price: number | null
  override_price: number | null
  is_price_overridden: boolean | null
} | null

export type ClientLike = {
  name: string | null
  company_name: string | null
  service_address: string | null
  phone: string | null
  email: string | null
} | null

export type BuildProposalInput = {
  proposal: ProposalRow
  quote: QuoteLike
  client: ClientLike
}

// ── Helpers ──────────────────────────────────────────────────

function isValidStatus(value: string): value is ProposalStatus {
  return value === 'draft' || value === 'sent' || value === 'viewed' || value === 'accepted'
}

function isValidServiceLevel(value: unknown): value is ServiceLevel {
  return value === 'essential' || value === 'standard' || value === 'premium'
}

function toIsoDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  // Accept both full ISO timestamps and plain date strings.
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

// Split a quote.generated_scope string into rough scope groups.
// generated_scope today is a free-form description; the pricing tool will
// eventually provide structured groups. Until then, treat the first paragraph
// as one catch-all group so the UI has something meaningful to render.
function scopeGroupsFromQuote(quote: QuoteLike): ScopeGroup[] {
  if (!quote?.generated_scope) return []
  const lines = quote.generated_scope
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  // Bullet-y lines ("- thing") become items; the first non-bullet line becomes title.
  const bulletItems = lines
    .filter((l) => /^[-*•]\s+/.test(l))
    .map((l) => l.replace(/^[-*•]\s+/, '').trim())

  if (bulletItems.length > 0) {
    return [{ title: 'Scope of service', items: bulletItems }]
  }

  // Fallback: each non-empty line becomes a bullet.
  return [{ title: 'Scope of service', items: lines }]
}

// Pick the most reliable monthly charge available. Order of preference:
//   1. Explicit override price on the quote (someone intentionally set it)
//   2. Calculated price from the pricing engine
//   3. Base price on the quote
// All three may be null while the pricing tool is in flight.
function monthlyChargeFromQuote(quote: QuoteLike): number | null {
  if (!quote) return null
  if (quote.is_price_overridden && quote.override_price != null) {
    return Number(quote.override_price)
  }
  if (quote.calculated_price != null) return Number(quote.calculated_price)
  if (quote.base_price != null) return Number(quote.base_price)
  return null
}

// The commercial pricing tool isn't finalised, so tier pricing isn't wired.
// We return nulls on all three tiers; the UI renders "—" gracefully.
// (No `quote` parameter — kept signature minimal until tier pricing lands.)
function tierPricingFromQuote(): Pick<ProposalPricing, 'essential' | 'standard' | 'premium'> {
  return { essential: null, standard: null, premium: null }
}

// ── Main mapper ──────────────────────────────────────────────

/**
 * buildProposalViewModel
 *
 * The single place that transforms persisted proposal + quote + client data
 * into the ProposalViewModel consumed by the UI. When the proposal has a
 * snapshot `payload`, values in the payload win over live quote/client data
 * so the client always sees the version that was sent.
 *
 * Design notes:
 * - Every field is nullable-safe. The commercial pricing tool is still being
 *   built; missing fields should render as "—" rather than throw.
 * - To wire live pricing later, update ONLY this file. The UI components
 *   should not need to change.
 */
export function buildProposalViewModel(input: BuildProposalInput): ProposalViewModel {
  const { proposal, quote, client } = input
  const payload = (proposal.payload ?? {}) as Partial<ProposalViewModel>

  // Status — fall back to draft if the DB somehow has an unexpected value.
  const status: ProposalStatus = isValidStatus(proposal.status) ? proposal.status : 'draft'

  // Client block — prefer payload snapshot, else live client record.
  const companyName =
    payload.client?.companyName ??
    client?.company_name ??
    client?.name ??
    'Client'
  const contactName = payload.client?.contactName ?? client?.name ?? null
  const siteName = payload.client?.siteName ?? null
  const siteAddress =
    payload.client?.siteAddress ??
    quote?.service_address ??
    client?.service_address ??
    ''

  // Proposal metadata — use payload first, then infer from the quote.
  const proposalDate =
    payload.proposalMeta?.proposalDate ??
    toIsoDate(quote?.date_issued) ??
    toIsoDate(proposal.created_at) ??
    toIsoDate(new Date().toISOString()) ??
    ''
  const startDate =
    payload.proposalMeta?.startDate ??
    toIsoDate(quote?.scheduled_clean_date)
  const termLabel = payload.proposalMeta?.termLabel ?? null
  const frequencyLabel =
    payload.proposalMeta?.frequencyLabel ??
    (quote?.frequency ?? null)
  const selectedServiceLevelRaw = payload.proposalMeta?.selectedServiceLevel
  const selectedServiceLevel = isValidServiceLevel(selectedServiceLevelRaw)
    ? selectedServiceLevelRaw
    : null

  // Pricing — tier prices aren't wired yet; monthlyCharge comes from the quote.
  const pricing: ProposalPricing = {
    ...tierPricingFromQuote(),
    ...(payload.pricing ?? {}),
    recommendedOption:
      isValidServiceLevel(payload.pricing?.recommendedOption)
        ? (payload.pricing!.recommendedOption as ServiceLevel)
        : null,
    monthlyCharge:
      payload.pricing?.monthlyCharge ??
      monthlyChargeFromQuote(quote),
    currency: 'NZD',
  }

  // Content — default to the reusable library; payload overrides individual
  // fields if present. This means a proposal can ship with fully-default
  // content today, and later we can snapshot-override any section.
  const content: ProposalContent = {
    introduction: payload.content?.introduction ?? proposalIntroduction,
    howWeWork: payload.content?.howWeWork ?? proposalHowWeWork,
    scopeGroups:
      payload.content?.scopeGroups ??
      scopeGroupsFromQuote(quote),
    serviceOptions: payload.content?.serviceOptions ?? proposalServiceOptions,
    includedItems: payload.content?.includedItems ?? proposalIncludedItems,
    excludedItems: payload.content?.excludedItems ?? proposalExcludedItems,
    paymentTerms: payload.content?.paymentTerms ?? proposalPaymentTerms,
    termsOverview: payload.content?.termsOverview ?? proposalTermsOverview,
    acceptanceBlurb: payload.content?.acceptanceBlurb ?? proposalAcceptanceBlurb,
  }

  // Internal notes — only payload or live quote, never exposed on public share.
  const internal = {
    notes: payload.internal?.notes ?? quote?.notes ?? null,
    exclusions: payload.internal?.exclusions ?? [],
    assumptions: payload.internal?.assumptions ?? [],
  }

  return {
    id: proposal.id,
    quoteId: proposal.quote_id,
    status,
    shareToken: proposal.share_token,
    client: { companyName, contactName, siteName, siteAddress },
    proposalMeta: {
      proposalDate,
      startDate,
      termLabel,
      frequencyLabel,
      selectedServiceLevel,
    },
    pricing,
    content,
    internal,
  }
}
