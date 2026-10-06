import {
  analyseGsc, buildRecommendations, buildSuburbRows, classifyQuery, compareRows, compareTotals, countChange,
  findGrowingQueries, findHighImpressionOpportunities, findQuickWins, gscPeriods, matchesQueryFilter,
  normalisePagePath, pageTags, parseQueryFilter, positionGain,
  type GscData, type GscRow,
} from '@/lib/seo-insights'
import { isAutomatedBrowser, isInternalPath } from '@/lib/analytics-filters'
import { SUBURB_LANDING_SLUGS } from '@/lib/service-areas'

const row = (key: string, impressions: number, clicks: number, position: number): GscRow => ({
  key, impressions, clicks, position, ctr: impressions ? clicks / impressions : 0,
})

// The 28-day examples from the brief.
const CURRENT: GscRow[] = [
  row('sano cleaning', 10, 5, 11.0),
  row('sano', 222, 4, 2.3),
  row('commercial cleaning south auckland', 1, 0, 66.0),
  row('commercial cleaning blockhouse bay', 6, 0, 24.0),
  row('commercial cleaning bucklands beach', 13, 0, 2.3),
  row('commercial cleaning cbd', 194, 0, 31.1),
  row('commercial cleaning eden terrace', 9, 0, 2.0),
  row('commercial cleaning farm cove', 1, 0, 8.0),
  row('end of let cleaning onehunga', 8, 0, 11.1),
  row('end of tenancy cleaning ellerslie', 6, 0, 8.3),
]

describe('gscPeriods', () => {
  it('returns two back-to-back 28-day windows ending 3 days ago', () => {
    const { current, previous } = gscPeriods(new Date('2026-10-06T10:00:00Z'))
    expect(current).toEqual({ startDate: '2026-09-06', endDate: '2026-10-03' })
    expect(previous).toEqual({ startDate: '2026-08-09', endDate: '2026-09-05' })
  })
})

describe('normalisePagePath', () => {
  it('strips origin, trailing slash and query', () => {
    expect(normalisePagePath('https://sano.nz/service-area/epsom/')).toBe('/service-area/epsom')
    expect(normalisePagePath('https://www.sano.nz/?utm=x')).toBe('/')
    expect(normalisePagePath('/services/end-of-tenancy')).toBe('/services/end-of-tenancy')
  })
})

describe('classifyQuery / filters', () => {
  it('tags the brief examples sensibly', () => {
    expect(classifyQuery('sano cleaning')).toEqual(['branded'])
    expect(classifyQuery('commercial cleaning cbd')).toEqual(['commercial', 'local'])
    expect(classifyQuery('end of let cleaning onehunga')).toEqual(['end-of-tenancy', 'residential', 'local'])
    expect(classifyQuery('move out cleaning')).toContain('end-of-tenancy')
    expect(classifyQuery('office cleaners near me')).toEqual(['commercial', 'local'])
    expect(classifyQuery('house cleaning mt eden')).toEqual(['residential', 'local'])
  })
  it('does not treat substrings as brand or suburb hits', () => {
    expect(classifyQuery('sanofi office')).not.toContain('branded')
    expect(classifyQuery('house cleaning')).not.toContain('local')
  })
  it('filters by category, non-branded and free text', () => {
    expect(matchesQueryFilter('sano', 'non-branded')).toBe(false)
    expect(matchesQueryFilter('commercial cleaning cbd', 'non-branded')).toBe(true)
    expect(matchesQueryFilter('commercial cleaning cbd', 'commercial', 'cbd')).toBe(true)
    expect(matchesQueryFilter('commercial cleaning cbd', 'commercial', 'ponsonby')).toBe(false)
    expect(matchesQueryFilter('anything', 'all')).toBe(true)
  })
  it('parses unknown filter values as all', () => {
    expect(parseQueryFilter('commercial')).toBe('commercial')
    expect(parseQueryFilter('nonsense')).toBe('all')
    expect(parseQueryFilter(undefined)).toBe('all')
  })
})

describe('change maths', () => {
  it('treats a lower position as an improvement', () => {
    expect(positionGain(row('a', 20, 1, 8.2), row('a', 20, 0, 10.3))).toBe(2.1)
    expect(positionGain(row('a', 20, 1, 12), row('a', 20, 0, 10))).toBe(-2)
  })
  it('refuses position change on thin data', () => {
    expect(positionGain(row('a', 2, 0, 5), row('a', 20, 0, 10))).toBeNull()
    expect(positionGain(row('a', 20, 0, 5), null)).toBeNull()
  })
  it('avoids misleading percentages', () => {
    expect(countChange(5, 0, false)).toEqual({ kind: 'no-history' })
    expect(countChange(5, 0, true)).toEqual({ kind: 'new' })
    expect(countChange(0, 0, true)).toEqual({ kind: 'none' })
    expect(countChange(6, 1, true)).toEqual({ kind: 'abs', value: 5 })
    expect(countChange(16, 13, true)).toEqual({ kind: 'pct', value: 3 / 13 })
  })
  it('compares totals with pp CTR and correct position direction', () => {
    const t = compareTotals(
      { clicks: 16, impressions: 618, ctr: 0.026, position: 14.2 },
      { clicks: 13, impressions: 438, ctr: 0.022, position: 16.3 },
    )
    expect(t.history).toBe(true)
    expect(t.clicks).toEqual({ kind: 'pct', value: 3 / 13 })
    expect(t.ctrPp).toBe(0.4)
    expect(t.positionGain).toBe(2.1)
    expect(compareTotals({ clicks: 1, impressions: 5, ctr: 0.2, position: 9 }, { clicks: 0, impressions: 0, ctr: 0, position: 0 }).positionGain).toBeNull()
  })
})

describe('opportunity lists', () => {
  const rows = compareRows(CURRENT, [])

  it('quick wins: position 4–15, real impressions, low CTR', () => {
    const keys = findQuickWins(rows).map((r) => r.key)
    expect(keys).toEqual(['end of let cleaning onehunga', 'end of tenancy cleaning ellerslie'])
    // sano cleaning is position 11 but already has 50% CTR; farm cove has 1 impression.
    expect(keys).not.toContain('sano cleaning')
    expect(keys).not.toContain('commercial cleaning farm cove')
  })

  it('high-impression: deep position with lots of impressions', () => {
    const keys = findHighImpressionOpportunities(rows).map((r) => r.key)
    expect(keys).toEqual(['commercial cleaning cbd'])
  })

  it('growing: needs history and ignores tiny movements', () => {
    const prev = [row('commercial cleaning cbd', 120, 0, 38), row('sano', 221, 4, 2.3), row('end of let cleaning onehunga', 1, 0, 30)]
    const compared = compareRows(CURRENT, prev)
    expect(findGrowingQueries(compared, false)).toEqual([])
    const keys = findGrowingQueries(compared, true).map((r) => r.key)
    expect(keys[0]).toBe('commercial cleaning cbd') // +74 impressions, +6.9 positions
    expect(keys).not.toContain('sano') // +1 impression is noise
    expect(keys).not.toContain('commercial cleaning farm cove') // 0 → 1
  })
})

describe('page tags', () => {
  it('flags strong, gaining, low-CTR and quick-win pages', () => {
    const [strong] = compareRows([row('/a', 40, 6, 2.1)], [row('/a', 38, 5, 2.4)])
    expect(pageTags(strong, true)).toEqual(['strong'])
    const [gaining] = compareRows([row('/b', 60, 0, 9)], [row('/b', 20, 0, 12)])
    expect(pageTags(gaining, true)).toEqual(['gaining', 'low-ctr', 'quick-win'])
    expect(pageTags(gaining, false)).not.toContain('gaining')
  })
})

describe('suburb rows', () => {
  it('lists every built suburb page, including ones with no impressions', () => {
    const rows = buildSuburbRows([row('/service-area/ellerslie', 6, 0, 8.3)], [], new Map([['/service-area/ellerslie', 'end of tenancy cleaning ellerslie']]))
    expect(rows).toHaveLength(SUBURB_LANDING_SLUGS.size)
    expect(rows[0]).toMatchObject({ suburb: 'Ellerslie', path: '/service-area/ellerslie', topQuery: 'end of tenancy cleaning ellerslie' })
    expect(rows[1].current).toBeNull()
  })
})

describe('recommendations', () => {
  it('produces 3–5 deterministic, non-branded actions from the brief data', () => {
    const queries = compareRows(CURRENT, []).map((r) => (r.key === 'commercial cleaning cbd' ? { ...r, page: '/service-area/auckland-cbd' } : r))
    const suburbs = buildSuburbRows([], [], new Map())
    const recs = buildRecommendations({ queries, history: false, suburbs })
    expect(recs.length).toBeGreaterThanOrEqual(3)
    expect(recs.length).toBeLessThanOrEqual(5)
    expect(recs[0].text).toBe('“commercial cleaning cbd” has 194 impressions at position 31.1. Google mostly shows /service-area/auckland-cbd — consider strengthening that page for this search.')
    expect(recs[1].text).toContain('“end of let cleaning onehunga” is averaging position 11.1')
    expect(recs.find((r) => r.kind === 'protect')?.text).toBe('“commercial cleaning bucklands beach” is averaging position 2.3. Protect this ranking and monitor CTR (currently 0.0%).')
    expect(recs.find((r) => r.kind === 'suburb-coverage')).toBeTruthy()
    expect(recs.some((r) => /“sano/.test(r.text))).toBe(false)
  })
})

describe('analyseGsc', () => {
  it('excludes internal pages and pairs queries with pages', () => {
    const data: GscData = {
      current: { startDate: '2026-09-06', endDate: '2026-10-03' },
      previous: { startDate: '2026-08-09', endDate: '2026-09-05' },
      totals: { current: { clicks: 9, impressions: 470, ctr: 0.02, position: 14 }, previous: { clicks: 0, impressions: 0, ctr: 0, position: 0 } },
      queries: { current: CURRENT, previous: [] },
      pages: { current: [row('/', 300, 9, 3), row('/share/quote/abc', 2, 0, 5)], previous: [] },
      queryPages: [
        { query: 'commercial cleaning cbd', page: '/service-area/auckland-cbd', clicks: 0, impressions: 150, ctr: 0, position: 30 },
        { query: 'commercial cleaning cbd', page: '/services/commercial-cleaning', clicks: 0, impressions: 44, ctr: 0, position: 35 },
      ],
    }
    const a = analyseGsc(data)
    expect(a.history).toBe(false)
    expect(a.pages.map((p) => p.key)).toEqual(['/'])
    expect(a.queries.find((q) => q.key === 'commercial cleaning cbd')?.page).toBe('/service-area/auckland-cbd')
  })
})

describe('analytics-filters', () => {
  it('identifies internal application paths only', () => {
    for (const p of ['/share/invoice/x', '/share/quote/y', '/portal', '/portal/quotes', '/contractor-setup/t', '/remittance-batch/1', '/email-signature-mammoth', '/proposals/1/print', '/api/x', '/client/dashboard']) {
      expect(isInternalPath(p)).toBe(true)
    }
    for (const p of ['/', '/services/commercial-cleaning', '/service-area/epsom', '/contact', '/blog/x', '/clients-we-serve']) {
      expect(isInternalPath(p)).toBe(false)
    }
  })
  it('detects automation-driven browsers without flagging real phones', () => {
    expect(isAutomatedBrowser({ webdriver: true, userAgent: 'Mozilla/5.0' })).toBe(true)
    expect(isAutomatedBrowser({ userAgent: 'Mozilla/5.0 (X11; Linux x86_64) HeadlessChrome/120.0' })).toBe(true)
    expect(isAutomatedBrowser({ webdriver: false, userAgent: 'Mozilla/5.0 (Linux; Android 12; CUBOT P40) Chrome/120' })).toBe(false)
    expect(isAutomatedBrowser(undefined)).toBe(false)
  })
})
