/**
 * Competitive margin tier + true margin over real contractor cost.
 *
 * The sell price is built from `labour_cost_basis` — a LOADED rate covering
 * on-costs, supervision, equipment and overhead. That is correct for pricing,
 * but it hides the actual floor: what is left after paying the person doing
 * the work. On a lean tender that gap decides whether the job is survivable,
 * so the engine reports it rather than leaving it to a calculator.
 */

import {
  computeCommercialPreview,
  isMarginTier,
  MARGIN_TIERS,
  type CommercialPreviewScopeRow,
} from '@/lib/commercialQuote'

/** One scope row worth a known number of minutes per week. */
function scope(minutesPerWeek: number): CommercialPreviewScopeRow[] {
  return [{
    included: true,
    frequency: 'weekly',
    quantity_value: 1,
    unit_minutes: minutesPerWeek,
    production_rate: null,
    input_mode: 'time_based',
  } as CommercialPreviewScopeRow]
}

function details(over: Record<string, unknown> = {}) {
  return {
    sector_category: 'office',      // multiplier 1.00 keeps the arithmetic legible
    traffic_level: null,
    selected_margin_tier: 'standard',
    labour_cost_basis: 50,
    service_days: ['mon', 'tue', 'wed', 'thu'],
    ...over,
  } as Parameters<typeof computeCommercialPreview>[0]
}

describe('competitive margin tier', () => {
  it('is a valid tier', () => {
    expect(isMarginTier('competitive')).toBe(true)
  })

  it('sits below win_the_work', () => {
    expect(MARGIN_TIERS.competitive.default).toBeLessThan(MARGIN_TIERS.win_the_work.default)
    expect(MARGIN_TIERS.competitive.max).toBeLessThanOrEqual(MARGIN_TIERS.win_the_work.min)
  })

  it('produces a lower sell price than win_the_work for the same work', () => {
    const competitive = computeCommercialPreview(
      details({ selected_margin_tier: 'competitive' }), scope(600))
    const win = computeCommercialPreview(
      details({ selected_margin_tier: 'win_the_work' }), scope(600))
    expect(competitive.estimated_weekly_sell_price).toBeLessThan(win.estimated_weekly_sell_price)
  })
})

describe('true margin over contractor cost', () => {
  it('is null when no contractor rate is supplied', () => {
    // A guessed floor is worse than no floor.
    const p = computeCommercialPreview(details(), scope(600))
    expect(p.true_margin_pct).toBeNull()
    expect(p.true_weekly_margin).toBeNull()
    expect(p.contractor_weekly_cost).toBeNull()
  })

  it('computes margin against the real contractor rate, not the labour basis', () => {
    // 600 min/wk = 10 h. Basis $50 -> cost $500. Standard 25% -> sell 500/0.75.
    const p = computeCommercialPreview(
      details({ contractor_hourly_cost: 28 }), scope(600))

    expect(p.estimated_weekly_hours).toBeCloseTo(10, 5)
    expect(p.contractor_weekly_cost).toBeCloseTo(280, 5)      // 10 h x $28
    expect(p.estimated_weekly_sell_price).toBeCloseTo(666.67, 1)
    expect(p.true_weekly_margin).toBeCloseTo(386.67, 1)       // sell - contractor
    expect(p.true_margin_pct).toBeCloseTo(0.58, 2)
  })

  it('warns when the true margin is thin', () => {
    // Contractor at $45 against a $50 basis leaves very little.
    const p = computeCommercialPreview(
      details({ selected_margin_tier: 'competitive', contractor_hourly_cost: 45 }),
      scope(600))
    expect(p.true_margin_pct).toBeLessThan(0.30)
    expect(p.warnings.join(' ')).toMatch(/left after contractor cost/i)
  })

  it('warns unmistakably when the price is below contractor cost', () => {
    const p = computeCommercialPreview(
      details({ selected_margin_tier: 'competitive', labour_cost_basis: 30, contractor_hourly_cost: 45 }),
      scope(600))
    expect(p.true_weekly_margin!).toBeLessThan(0)
    expect(p.warnings.join(' ')).toMatch(/cannot be delivered profitably/i)
  })

  it('does not warn when the margin is healthy', () => {
    const p = computeCommercialPreview(
      details({ contractor_hourly_cost: 28 }), scope(600))
    expect(p.warnings.join(' ')).not.toMatch(/contractor cost/i)
  })

  it('ignores a zero or negative contractor rate', () => {
    const p = computeCommercialPreview(
      details({ contractor_hourly_cost: 0 }), scope(600))
    expect(p.true_margin_pct).toBeNull()
  })
})
