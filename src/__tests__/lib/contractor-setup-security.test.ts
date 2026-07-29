// Security invariants for the public /contractor-setup/[token] route.
// These lock the guarantees the security review requires so a later change
// can't silently regress them.

import { TOKEN_OPEN_STATUSES, CONTRACTOR_SAFE_SCHEDULE_FIELDS, type ContractorSafeSchedule } from '@/lib/contractor-setup-data'
import { CONTRACTOR_PROPOSABLE_FIELDS } from '@/lib/contractor-setup-allowlist'

describe('token status gate', () => {
  it('refuses closed / revoked / completed setups', () => {
    for (const closed of ['signed', 'active', 'expired', 'superseded', '', 'revoked', 'unknown']) {
      expect(TOKEN_OPEN_STATUSES.has(closed)).toBe(false)
    }
  })
  it('permits only in-progress statuses', () => {
    for (const open of ['draft', 'ready_to_send', 'awaiting_contractor', 'contractor_submitted', 'sano_review_required', 'changes_requested', 'ready_to_sign']) {
      expect(TOKEN_OPEN_STATUSES.has(open)).toBe(true)
    }
  })
})

describe('contractor-safe schedule shape', () => {
  const INTERNAL_FIELDS = [
    'costCentre', 'paymentReference', 'createdBy', 'approvedBy', 'insuranceOverrideRef',
    'effectiveFrom', 'supersededAt', 'supersededBy', 'createdAt', 'scheduleRef',
    'customerClientId', 'siteId', 'linkedQuoteId', 'linkedRecurringJobId', 'status',
  ]

  it('exposes no Sano-internal schedule field', () => {
    for (const f of INTERNAL_FIELDS) {
      expect((CONTRACTOR_SAFE_SCHEDULE_FIELDS as readonly string[]).includes(f)).toBe(false)
    }
  })

  it('exposes only the whitelisted commercial-review fields', () => {
    // A ContractorSafeSchedule literal has exactly these keys — a compile-time
    // + runtime check that the shape hasn't grown.
    const sample: ContractorSafeSchedule = {
      id: 'x', name: 'n', serviceType: null, serviceAddress: null, classification: null,
      frequency: null, term: null, paymentMethod: null, paymentBasis: null, rateBasis: null, agreedAmount: null,
    }
    expect(Object.keys(sample).sort()).toEqual([...CONTRACTOR_SAFE_SCHEDULE_FIELDS].sort())
  })
})

describe('contractor cannot alter Sano commercial terms', () => {
  // Binds to the ACTUAL allowlist the token action + staff accept both use.
  const allow = CONTRACTOR_PROPOSABLE_FIELDS as readonly string[]
  const FORBIDDEN = [
    'agreed_amount', 'payment_basis', 'rate_basis', 'payment_method',
    'customer_client_id', 'site_id', 'cost_centre', 'payment_reference',
    'gst_registered', 'gst_number', 'wht_rate', 'tax_treatment', 'hourly_rate', 'status',
  ]
  it('the allowlist contains no rate / customer / commercial / tax field', () => {
    for (const f of FORBIDDEN) expect(allow.includes(f)).toBe(false)
  })
  it('the allowlist is limited to identity / structure / bank-name fields', () => {
    expect(allow).toEqual([
      'full_name', 'preferred_name', 'phone', 'address',
      'business_structure', 'legal_name', 'nzbn', 'company_number', 'bank_account_name',
    ])
  })
})
