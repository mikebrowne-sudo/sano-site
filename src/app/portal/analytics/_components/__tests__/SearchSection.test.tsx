import { render, screen } from '@testing-library/react'
import { SearchSection } from '../SearchSection'
import { analyseGsc, type GscData, type GscRow } from '@/lib/seo-insights'

const row = (key: string, impressions: number, clicks: number, position: number): GscRow => ({
  key, impressions, clicks, position, ctr: impressions ? clicks / impressions : 0,
})

const base: GscData = {
  current: { startDate: '2026-09-06', endDate: '2026-10-03' },
  previous: { startDate: '2026-08-09', endDate: '2026-09-05' },
  totals: {
    current: { clicks: 16, impressions: 618, ctr: 16 / 618, position: 14.2 },
    previous: { clicks: 13, impressions: 438, ctr: 13 / 438, position: 16.3 },
  },
  queries: {
    current: [row('commercial cleaning cbd', 194, 0, 31.1), row('end of tenancy cleaning ellerslie', 6, 0, 8.3), row('sano', 222, 4, 2.3)],
    previous: [row('commercial cleaning cbd', 120, 0, 38)],
  },
  pages: {
    current: [row('/service-area/ellerslie', 6, 0, 8.3), row('/', 300, 9, 3)],
    previous: [row('/', 250, 7, 4)],
  },
  queryPages: [{ query: 'commercial cleaning cbd', page: '/service-area/auckland-cbd', clicks: 0, impressions: 194, ctr: 0, position: 31.1 }],
}

describe('SearchSection', () => {
  it('renders KPI comparisons, actions and opportunity tables', () => {
    render(<SearchSection data={base} analysis={analyseGsc(base)} filter="all" search="" />)
    expect(screen.getByText('+23%')).toBeInTheDocument() // clicks 13 → 16
    expect(screen.getByText('Improved 2.1 positions')).toBeInTheDocument()
    expect(screen.getByText('What to work on next')).toBeInTheDocument()
    expect(screen.getAllByText('commercial cleaning cbd').length).toBeGreaterThan(0)
    expect(screen.getByText('Suburb page performance')).toBeInTheDocument()
  })

  it('says "Not enough history yet" instead of inventing percentages', () => {
    const noHistory = { ...base, totals: { ...base.totals, previous: { clicks: 0, impressions: 0, ctr: 0, position: 0 } } }
    render(<SearchSection data={noHistory} analysis={analyseGsc(noHistory)} filter="all" search="" />)
    expect(screen.getAllByText('Not enough history yet').length).toBeGreaterThan(0)
    expect(screen.queryByText('+23%')).not.toBeInTheDocument()
  })

  it('applies the branded filter to the query lists', () => {
    render(<SearchSection data={base} analysis={analyseGsc(base)} filter="branded" search="" />)
    expect(screen.getByText('1 of 3 search terms match.', { exact: false })).toBeInTheDocument()
  })
})
