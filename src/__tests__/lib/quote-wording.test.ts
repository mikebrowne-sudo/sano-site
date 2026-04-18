import { generateQuoteScope } from '@/lib/quote-wording'

describe('generateQuoteScope', () => {
  it('residential standard clean with bedrooms + addons', () => {
    const out = generateQuoteScope({
      service_category: 'residential',
      service_type_code: 'standard_clean',
      bedrooms: 3,
      bathrooms: 2,
      frequency: 'weekly',
      areas_included: ['kitchen', 'bathrooms', 'bedrooms', 'living'],
      condition_tags: ['well_maintained', 'high_use_areas'],
      addons_wording: ['oven_clean', 'interior_window'],
    })
    expect(out).toMatchInlineSnapshot(`
"Standard clean for a 3 bedroom, 2 bathroom residential property.

Our standard clean follows the Sano 100-Point Cleaning Standard, designed to deliver a consistent and repeatable result across every property we service. This includes general surface cleaning, vacuuming, mopping, and overall presentation across all selected areas.

Cleaning is scheduled on a weekly basis to maintain ongoing presentation standards.

The clean will cover all main areas of the property including kitchen, bathrooms, bedrooms, and living spaces, along with any additional selected areas.

The property is well maintained and will require a standard level of cleaning.

Additional attention will be given to high-use areas such as kitchen and bathrooms.

Additional services included as part of this quote are oven clean and interior window cleaning.

While we aim to achieve a high standard throughout, some permanent wear, staining, or damage may not be fully removable.

All work is carried out by trained staff following the Sano 100-Point Cleaning Standard, ensuring a consistent and reliable result across every property we service."
`)
  })

  it('commercial maintenance with x_per_week frequency and build-up condition', () => {
    const out = generateQuoteScope({
      service_category: 'commercial',
      service_type_code: 'maintenance',
      site_type: 'an office site',
      frequency: 'x_per_week',
      x_per_week: 3,
      condition_tags: ['commercial_regular_use', 'commercial_build_up'],
      addons_wording: ['oven_clean', 'fridge_clean', 'carpet_cleaning'],
    })
    expect(out).toMatchInlineSnapshot(`
"Commercial cleaning service for an office site, covering all agreed areas.

Our commercial cleaning service follows a structured cleaning system to ensure a consistent and repeatable standard across every visit. The focus is on maintaining cleanliness, hygiene, and overall presentation across all agreed areas.

Cleaning is carried out on a 3 times per week schedule, aligned with site requirements.

Cleaning will be carried out across all agreed areas of the site, including workspaces, common areas, amenities, and entry points.

The site experiences regular use, and cleaning will focus on maintaining presentation in high-traffic areas.

Some areas require additional attention due to build-up, which will be addressed as part of the service.

Additional services included as part of this quote:
- oven clean
- fridge clean
- carpet cleaning

Cleaning will be carried out in line with the agreed scope and frequency to maintain presentation standards across the site.

Cleaning is carried out by trained staff following a structured system to ensure consistency across every visit. We focus on reliability, presentation, and maintaining agreed service standards over time."
`)
  })

  it('PM end of tenancy uses the specialised expectation override', () => {
    const out = generateQuoteScope({
      service_category: 'property_management',
      service_type_code: 'end_of_tenancy',
      bedrooms: 2,
      bathrooms: 1,
      condition_tags: ['vacant_property'],
    })
    expect(out).toContain('bond return where there are factors outside of cleaning')
    expect(out).toContain('End of tenancy clean for a 2 bedroom, 1 bathroom residential property, prepared for inspection and handover.')
  })

  it('returns empty string when category or service type missing', () => {
    expect(generateQuoteScope({ service_category: 'residential' })).toBe('')
    expect(generateQuoteScope({ service_type_code: 'standard_clean' })).toBe('')
    expect(generateQuoteScope({})).toBe('')
  })

  it('airbnb turnover omits bedrooms from summary (short-stay wording)', () => {
    const out = generateQuoteScope({
      service_category: 'airbnb',
      service_type_code: 'turnover',
      bedrooms: 2,
      bathrooms: 1,
    })
    expect(out.split('\n\n')[0]).toBe('Turnover clean for a short-stay property, prepared for incoming guests.')
  })
})
