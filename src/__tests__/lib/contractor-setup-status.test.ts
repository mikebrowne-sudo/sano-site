import {
  computeReadiness, canTransitionTo, isSectionSettled, sectionState,
  type SectionStatusMap,
} from '@/lib/contractor-setup-status'

const allVerified: SectionStatusMap = {
  identity: 'verified', structure: 'verified', gst: 'verified', tax_declaration: 'verified',
  banking: 'verified', insurance: 'verified', service_schedules: 'verified', agreement_acceptance: 'verified',
}

describe('isSectionSettled', () => {
  it('only verified / not_applicable count as settled', () => {
    expect(isSectionSettled('verified')).toBe(true)
    expect(isSectionSettled('not_applicable')).toBe(true)
    expect(isSectionSettled('confirmed_by_sano')).toBe(false)
    expect(isSectionSettled('blocked_pending_workflow')).toBe(false)
    expect(isSectionSettled('awaiting_contractor')).toBe(false)
  })
})

describe('computeReadiness', () => {
  it('a schedular contractor is NEVER payment-ready while tax is blocked (the required behaviour)', () => {
    const map: SectionStatusMap = {
      identity: 'verified', structure: 'verified', service_schedules: 'verified',
      banking: 'verified', insurance: 'not_applicable',
      gst: 'not_applicable', tax_declaration: 'blocked_pending_workflow', agreement_acceptance: 'verified',
    }
    const r = computeReadiness(map, { schedular: true })
    expect(r.paymentReady).toBe(false)
    expect(r.blockers.some((b) => b.section === 'tax_declaration')).toBe(true)
    expect(r.blockers.find((b) => b.section === 'tax_declaration')?.reason).toMatch(/Payment blocked: valid contractor tax declaration/)
  })

  it('identity + structure + schedules accepted alone does NOT make payment-ready', () => {
    const map: SectionStatusMap = {
      identity: 'verified', structure: 'verified', service_schedules: 'verified',
    }
    expect(computeReadiness(map, { schedular: true }).paymentReady).toBe(false)
    expect(computeReadiness(map, { schedular: false }).paymentReady).toBe(false)
  })

  it('a non-schedular contractor can be payment-ready without a tax declaration', () => {
    const map: SectionStatusMap = {
      identity: 'verified', structure: 'verified', service_schedules: 'verified',
      banking: 'verified', insurance: 'not_applicable', gst: 'not_applicable',
      tax_declaration: 'not_applicable', agreement_acceptance: 'verified',
    }
    expect(computeReadiness(map, { schedular: false }).paymentReady).toBe(true)
  })

  it('fully verified schedular contractor is payment-ready (proves the gate opens once tax verified)', () => {
    expect(computeReadiness(allVerified, { schedular: true }).paymentReady).toBe(true)
  })
})

describe('canTransitionTo', () => {
  it('blocks ready_to_sign until identity + structure + schedules confirmed', () => {
    const partial: SectionStatusMap = { identity: 'verified', structure: 'awaiting_contractor' }
    expect(canTransitionTo('ready_to_sign', partial, { schedular: true }).ok).toBe(false)
  })

  it('allows ready_to_sign with core sections confirmed even if tax not verified (sign while collecting tax)', () => {
    const map: SectionStatusMap = {
      identity: 'confirmed_by_sano', structure: 'confirmed_by_sano', service_schedules: 'confirmed_by_sano',
      tax_declaration: 'blocked_pending_workflow',
    }
    expect(canTransitionTo('ready_to_sign', map, { schedular: true }).ok).toBe(true)
  })

  it('blocks active for a schedular contractor whose tax is not verified', () => {
    const map: SectionStatusMap = {
      identity: 'verified', structure: 'verified', service_schedules: 'verified',
      banking: 'verified', insurance: 'not_applicable', gst: 'not_applicable',
      tax_declaration: 'blocked_pending_workflow', agreement_acceptance: 'verified',
    }
    expect(canTransitionTo('active', map, { schedular: true }).ok).toBe(false)
  })

  it('allows active once every section is verified', () => {
    expect(canTransitionTo('active', allVerified, { schedular: true }).ok).toBe(true)
  })
})

describe('sectionState default', () => {
  it('defaults missing sections to not_requested', () => {
    expect(sectionState({}, 'gst')).toBe('not_requested')
  })
})
