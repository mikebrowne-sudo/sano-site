import { SERVICES, getServiceBySlug, getRelatedServices } from '@/lib/services'

describe('SERVICES data', () => {
  it('contains exactly 7 services', () => {
    expect(SERVICES).toHaveLength(7)
  })

  it('every service has a unique slug', () => {
    const slugs = SERVICES.map((s) => s.slug)
    const unique = new Set(slugs)
    expect(unique.size).toBe(7)
  })

  it('every service has all required fields', () => {
    for (const service of SERVICES) {
      expect(service.slug).toBeTruthy()
      expect(service.name).toBeTruthy()
      expect(service.shortDescription).toBeTruthy()
      expect(service.heroImage).toMatch(/^https:\/\/images\.unsplash\.com/)
      expect(service.includes.length).toBeGreaterThanOrEqual(6)
      expect(service.fromPrice).toBeGreaterThan(0)
      expect(service.metaDescription.length).toBeLessThanOrEqual(160)
      expect(service.relatedSlugs).toHaveLength(3)
    }
  })

  it('relatedSlugs reference valid slugs', () => {
    const allSlugs = new Set(SERVICES.map((s) => s.slug))
    for (const service of SERVICES) {
      for (const related of service.relatedSlugs) {
        expect(allSlugs.has(related)).toBe(true)
      }
    }
  })
})

describe('getServiceBySlug', () => {
  it('returns the correct service', () => {
    const service = getServiceBySlug('deep-cleaning')
    expect(service?.name).toBe('Deep Cleaning')
  })

  it('returns undefined for unknown slug', () => {
    expect(getServiceBySlug('unknown')).toBeUndefined()
  })
})

describe('getRelatedServices', () => {
  it('returns services for valid slugs', () => {
    const related = getRelatedServices(['deep-cleaning', 'window-cleaning'])
    expect(related).toHaveLength(2)
    expect(related[0].slug).toBe('deep-cleaning')
  })

  it('filters out invalid slugs', () => {
    const related = getRelatedServices(['deep-cleaning', 'not-a-service'])
    expect(related).toHaveLength(1)
  })
})
