import { resolveScheduleGate, resolveContractorTaxGate, type ScheduleForGate } from '@/lib/contractor-tax-gate'
import type { DeclarationRecord } from '@/lib/contractor-tax-declaration'

const TODAY = '2026-07-31'
const verified: DeclarationRecord = { id: 'd', status: 'verified', declarationType: 'contractor_chosen', withholdingRate: 0.20, expiryDate: null, effectiveDate: '2026-07-01' }
const verifiedExemption: DeclarationRecord = { id: 'e', status: 'verified', declarationType: 'exemption', withholdingRate: null, expiryDate: '2027-01-01', effectiveDate: '2026-01-01' }
const expiredExemption: DeclarationRecord = { id: 'x', status: 'verified', declarationType: 'exemption', withholdingRate: null, expiryDate: '2026-06-01', effectiveDate: '2026-01-01' }

const sched = (id: string, name: string, t: ScheduleForGate['taxTreatment']): ScheduleForGate => ({ id, name, taxTreatment: t })

describe('resolveScheduleGate', () => {
  it('schedular schedule WITHOUT a verified declaration is blocked', () => {
    expect(resolveScheduleGate(sched('a', 'Pukekohe', 'schedular_payment'), null, TODAY).ok).toBe(false)
    expect(resolveScheduleGate(sched('a', 'Pukekohe', 'schedular_payment'), { ...verified, status: 'submitted' }, TODAY).ok).toBe(false)
  })

  it('schedular schedule WITH a verified declaration is clear', () => {
    expect(resolveScheduleGate(sched('a', 'Pukekohe', 'schedular_payment'), verified, TODAY).ok).toBe(true)
  })

  it('ordinary trade creditor is NOT blocked by IR330C (no declaration needed)', () => {
    const r = resolveScheduleGate(sched('r', 'Residential', 'ordinary_trade_creditor'), null, TODAY)
    expect(r.ok).toBe(true)
    expect(r.reason).toMatch(/not subject to schedular withholding/)
  })

  it('exempt_certificate schedule needs a verified, current EXEMPTION', () => {
    expect(resolveScheduleGate(sched('e', 'X', 'exempt_certificate'), verifiedExemption, TODAY).ok).toBe(true)
    // a non-exemption verified declaration does not satisfy an exempt schedule
    expect(resolveScheduleGate(sched('e', 'X', 'exempt_certificate'), verified, TODAY).ok).toBe(false)
    // an expired exemption blocks
    expect(resolveScheduleGate(sched('e', 'X', 'exempt_certificate'), expiredExemption, TODAY).ok).toBe(false)
  })

  it('expired certificate blocks a schedular schedule too', () => {
    expect(resolveScheduleGate(sched('a', 'Pukekohe', 'schedular_payment'), expiredExemption, TODAY).ok).toBe(false)
  })

  it('unclassified / pending_review schedule is blocked', () => {
    expect(resolveScheduleGate(sched('p', 'New', 'pending_review'), verified, TODAY).ok).toBe(false)
    expect(resolveScheduleGate(sched('n', 'Unset', null), verified, TODAY).ok).toBe(false)
  })
})

describe('resolveContractorTaxGate — per-schedule, not universal (Myrtle case)', () => {
  it('one covered schedular schedule does NOT make the contractor clear while another is unresolved', () => {
    const schedules = [
      sched('puke', 'Pukekohe Golf Club commercial cleaning', 'schedular_payment'), // covered by verified IR330C
      sched('resi', 'Residential cleaning', 'pending_review'),                        // NOT yet classified
    ]
    const r = resolveContractorTaxGate(schedules, verified, TODAY)
    expect(r.allClear).toBe(false)
    expect(r.blocked.map((b) => b.scheduleId)).toEqual(['resi'])
    // the Pukekohe schedule itself is clear
    expect(r.schedules.find((s) => s.scheduleId === 'puke')?.ok).toBe(true)
  })

  it('commercial=schedular + residential=ordinary can both clear independently', () => {
    const schedules = [
      sched('puke', 'Pukekohe', 'schedular_payment'),
      sched('resi', 'Residential', 'ordinary_trade_creditor'),
    ]
    const r = resolveContractorTaxGate(schedules, verified, TODAY)
    expect(r.allClear).toBe(true)
  })

  it('all clear only when every schedule is ok', () => {
    expect(resolveContractorTaxGate([sched('a', 'A', 'ordinary_trade_creditor')], null, TODAY).allClear).toBe(true)
    expect(resolveContractorTaxGate([sched('a', 'A', 'schedular_payment')], null, TODAY).allClear).toBe(false)
  })
})
