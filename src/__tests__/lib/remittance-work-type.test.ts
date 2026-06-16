import { conciseWorkType } from '@/lib/remittance-work-type'

describe('conciseWorkType', () => {
  it('sentence-cases the quote clean type', () => {
    expect(conciseWorkType({ type_of_clean: 'End of Tenancy Clean' })).toBe('End of tenancy clean')
    expect(conciseWorkType({ type_of_clean: 'Deep Clean' })).toBe('Deep clean')
    expect(conciseWorkType({ type_of_clean: 'Move In / Move Out Clean' })).toBe('Move in / move out clean')
  })

  it('falls back to service_type when type_of_clean is missing', () => {
    expect(conciseWorkType({ type_of_clean: null, service_type: 'Carpet Clean' })).toBe('Carpet clean')
  })

  it('returns null when no work type is available (so the note stays blank)', () => {
    expect(conciseWorkType({})).toBeNull()
    expect(conciseWorkType({ type_of_clean: '', service_type: '   ' })).toBeNull()
    expect(conciseWorkType({ type_of_clean: null, service_type: null })).toBeNull()
  })

  it('never returns a long job description verbatim — it only ever reflects the short type fields', () => {
    // (type_of_clean holds a short label by construction; this guards the
    // contract that we pass type fields, not the scope/description.)
    const out = conciseWorkType({ type_of_clean: 'Turnover Clean' })
    expect(out).toBe('Turnover clean')
    expect(out!.length).toBeLessThan(40)
  })
})
