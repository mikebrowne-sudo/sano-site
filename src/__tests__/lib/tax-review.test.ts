import {
  deriveInitialTaxReview,
  ir330cLikelyRequired,
  taxReviewCompletesChecklist,
  taxReviewStatusLabel,
  TAX_REVIEW_STATUSES,
} from '@/lib/tax-review'
import { agreementDocTypesForStructure, AGREEMENT_DOC_TYPE_VALUES } from '@/lib/agreement-documents'
import { uploadedItemKeysForDocTypes } from '@/lib/onboarding-checklist'
import { WORKFORCE_SETTINGS_DEFAULTS } from '@/lib/workforce-settings'

const STRUCTURES = ['sole_trader', 'company', 'partnership', 'trust', 'other']

describe('tax-review — initial state for all five structures', () => {
  it('always starts as review_required (never a final determination)', () => {
    for (const s of STRUCTURES) {
      expect(deriveInitialTaxReview(s).status).toBe('review_required')
    }
    expect(deriveInitialTaxReview(null).status).toBe('review_required')
  })

  it('flags IR330C as expected only for individuals (sole trader / other)', () => {
    expect(deriveInitialTaxReview('sole_trader').ir330cRequested).toBe(true)
    expect(deriveInitialTaxReview('other').ir330cRequested).toBe(true)
    expect(deriveInitialTaxReview('company').ir330cRequested).toBe(false)
    expect(deriveInitialTaxReview('partnership').ir330cRequested).toBe(false)
    expect(deriveInitialTaxReview('trust').ir330cRequested).toBe(false)
    expect(ir330cLikelyRequired('sole_trader')).toBe(true)
    expect(ir330cLikelyRequired('company')).toBe(false)
  })
})

describe('tax-review — conditional IR330C document slot', () => {
  it('offers the IR330C upload only to individuals', () => {
    const types = (s: string) => agreementDocTypesForStructure(s).map((d) => d.value)
    expect(types('sole_trader')).toContain('ir330c')
    expect(types('other')).toContain('ir330c')
    expect(types('company')).not.toContain('ir330c')
    expect(types('partnership')).not.toContain('ir330c')
    expect(types('trust')).not.toContain('ir330c')
  })

  it('accepts ir330c as a valid upload type', () => {
    expect(AGREEMENT_DOC_TYPE_VALUES).toContain('ir330c')
  })
})

describe('tax-review — tax_review is staff-only', () => {
  it('uploading an IR330C completes NO checklist item', () => {
    expect(uploadedItemKeysForDocTypes(['ir330c'])).toEqual([])
  })

  it('selecting a structure does not complete tax_review (initial status is not a done state)', () => {
    expect(taxReviewCompletesChecklist(deriveInitialTaxReview('sole_trader').status)).toBe(false)
  })

  it('only an explicit staff Confirmed / Not required decision completes tax_review', () => {
    expect(taxReviewCompletesChecklist('confirmed')).toBe(true)
    expect(taxReviewCompletesChecklist('not_required')).toBe(true)
    for (const s of ['review_required', 'awaiting_contractor', 'awaiting_ir330c', 'ready_for_review', 'exception']) {
      expect(taxReviewCompletesChecklist(s)).toBe(false)
    }
  })

  it('tax_review now gates activation (Phase 6); legacy actives are protected by grandfathering instead', () => {
    expect(WORKFORCE_SETTINGS_DEFAULTS.contractor_required_items).toContain('tax_review')
  })
})

describe('tax-review — staff-facing labels (never raw enum values)', () => {
  it('maps every status to a label', () => {
    expect(taxReviewStatusLabel('review_required')).toBe('Review required')
    expect(taxReviewStatusLabel('awaiting_ir330c')).toBe('Awaiting IR330C')
    expect(taxReviewStatusLabel('confirmed')).toBe('Confirmed')
    expect(taxReviewStatusLabel('not_required')).toBe('Not required')
    expect(taxReviewStatusLabel('exception')).toBe('Exception')
    expect(TAX_REVIEW_STATUSES).toHaveLength(7)
  })

  it('falls back to a safe label for unknown/missing values', () => {
    expect(taxReviewStatusLabel(null)).toBe('Review required')
    expect(taxReviewStatusLabel('weird_value')).toBe('Review required')
  })
})
