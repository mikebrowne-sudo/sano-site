// Pure Search Console analysis for the portal analytics page.
//
// Turns raw Search Console rows (two consecutive 28-day periods, fetched by
// src/lib/gsc.ts) into decision-ready lists: quick wins, high-impression
// opportunities, growing queries, landing-page and suburb-page performance,
// and a handful of deterministic recommended actions. No IO, no LLM — every
// output is a plain rule over the live numbers, so it's unit-testable and
// explainable.
//
// Position maths: Google's "average position" is impression-weighted and a
// LOWER number is better. Everywhere below, `positionGain = prev - current`,
// so a positive gain is an improvement.

import { SERVICE_AREAS, SUBURB_LANDING_SLUGS } from '@/lib/service-areas'
import { isInternalPath } from '@/lib/analytics-filters'

/* ── Types ──────────────────────────────────────────────────────────── */

export interface GscMetrics {
  clicks: number
  impressions: number
  ctr: number // 0..1
  position: number // impression-weighted average, lower = better
}
export interface GscRow extends GscMetrics {
  key: string // query text, or normalised page path
}
export interface GscQueryPageRow extends GscMetrics {
  query: string
  page: string // normalised path
}
export interface GscPeriod {
  startDate: string // yyyy-mm-dd
  endDate: string
}
export interface GscData {
  current: GscPeriod
  previous: GscPeriod
  totals: { current: GscMetrics; previous: GscMetrics }
  queries: { current: GscRow[]; previous: GscRow[] }
  pages: { current: GscRow[]; previous: GscRow[] }
  /** Query × page rows for the current period (used to pair queries with pages). */
  queryPages: GscQueryPageRow[]
}

export interface ComparedRow extends GscMetrics {
  key: string
  prev: GscMetrics | null
  impressionsDelta: number
  clicksDelta: number
  /** prev − current position (positive = improved); null when either side is too thin to trust. */
  positionGain: number | null
  /** Most-shown page for a query (queries only). */
  page?: string
  /** Most-shown query for a page (pages only). */
  topQuery?: string
}

/* ── Thresholds (kept deliberately simple; tune here) ───────────────── */

/** Minimum impressions on BOTH sides before a position change is shown. */
export const MIN_IMPRESSIONS_FOR_POSITION_CHANGE = 3
/** Below this many prior impressions a % change is noise — show the absolute change instead. */
export const MIN_IMPRESSIONS_FOR_PERCENT = 10

export const QUICK_WIN = { minPosition: 4, maxPosition: 15, minImpressions: 5, maxCtr: 0.1 } as const
/** Rough CTR a top-3 result earns; used only to rank quick wins by "clicks left on the table". */
export const TARGET_CTR = 0.1
export const HIGH_IMPRESSION = { minPosition: 15, minImpressions: 20 } as const
export const GROWTH = { minImpressionsDelta: 10, minGrowthRatio: 1.5, minClicksDelta: 2, minPositionGain: 3, minImpressionsForPosition: 10 } as const

/* ── Periods ────────────────────────────────────────────────────────── */

const DAY = 86_400_000
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/**
 * Latest 28 days (ending 3 days ago — Search Console lags ~2–3 days) and the
 * 28 days immediately before it. UTC date maths throughout.
 */
export function gscPeriods(now: Date = new Date()): { current: GscPeriod; previous: GscPeriod } {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const curEnd = today - 3 * DAY
  const curStart = curEnd - 27 * DAY
  const prevEnd = curStart - DAY
  const prevStart = prevEnd - 27 * DAY
  return {
    current: { startDate: iso(curStart), endDate: iso(curEnd) },
    previous: { startDate: iso(prevStart), endDate: iso(prevEnd) },
  }
}

/** Search Console page URL → site path ("https://sano.nz/service-area/epsom/" → "/service-area/epsom"). */
export function normalisePagePath(url: string): string {
  let path = url
  try {
    path = new URL(url).pathname
  } catch {
    // already a path
  }
  path = path.split('#')[0].split('?')[0] || '/'
  if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1)
  return path
}

/* ── Comparison helpers ─────────────────────────────────────────────── */

/** True when the previous period has any data at all (i.e. comparisons are meaningful). */
export function hasHistory(data: Pick<GscData, 'totals'>): boolean {
  return data.totals.previous.impressions > 0
}

export function positionGain(cur: GscMetrics | null | undefined, prev: GscMetrics | null | undefined): number | null {
  if (!cur || !prev) return null
  if (cur.impressions < MIN_IMPRESSIONS_FOR_POSITION_CHANGE || prev.impressions < MIN_IMPRESSIONS_FOR_POSITION_CHANGE) return null
  return Number((prev.position - cur.position).toFixed(1))
}

export type CountChange =
  | { kind: 'no-history' } // the whole property has no prior-period data
  | { kind: 'new' } // nothing last period, something now
  | { kind: 'none' } // nothing either period
  | { kind: 'abs'; value: number } // prior base too small for a meaningful %
  | { kind: 'pct'; value: number } // fraction, e.g. 0.23 = +23%

export function countChange(cur: number, prev: number | null | undefined, history: boolean): CountChange {
  if (!history) return { kind: 'no-history' }
  const p = prev ?? 0
  if (p === 0) return cur > 0 ? { kind: 'new' } : { kind: 'none' }
  if (p < MIN_IMPRESSIONS_FOR_PERCENT) return { kind: 'abs', value: cur - p }
  return { kind: 'pct', value: (cur - p) / p }
}

export function compareRows(current: GscRow[], previous: GscRow[]): ComparedRow[] {
  const prevMap = new Map(previous.map((r) => [r.key, r]))
  return current.map((r) => {
    const prev = prevMap.get(r.key) ?? null
    return {
      ...r,
      prev,
      impressionsDelta: r.impressions - (prev?.impressions ?? 0),
      clicksDelta: r.clicks - (prev?.clicks ?? 0),
      positionGain: positionGain(r, prev),
    }
  })
}

/** For each query, the page Google showed most; for each page, its biggest query. */
export function pairQueriesAndPages(rows: GscQueryPageRow[]): { pageForQuery: Map<string, string>; queryForPage: Map<string, string> } {
  const bestPage = new Map<string, GscQueryPageRow>()
  const bestQuery = new Map<string, GscQueryPageRow>()
  for (const r of rows) {
    const p = bestPage.get(r.query)
    if (!p || r.impressions > p.impressions || (r.impressions === p.impressions && r.clicks > p.clicks)) bestPage.set(r.query, r)
    const q = bestQuery.get(r.page)
    if (!q || r.impressions > q.impressions || (r.impressions === q.impressions && r.clicks > q.clicks)) bestQuery.set(r.page, r)
  }
  return {
    pageForQuery: new Map(Array.from(bestPage, ([k, v]) => [k, v.page])),
    queryForPage: new Map(Array.from(bestQuery, ([k, v]) => [k, v.query])),
  }
}

/* ── Query classification ───────────────────────────────────────────── */

export type QueryCategory = 'branded' | 'commercial' | 'residential' | 'end-of-tenancy' | 'local'
export type QueryFilterKey = 'all' | QueryCategory | 'non-branded'

export const QUERY_FILTERS: { key: QueryFilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'commercial', label: 'Commercial' },
  { key: 'residential', label: 'Residential' },
  { key: 'end-of-tenancy', label: 'End of tenancy' },
  { key: 'local', label: 'Suburb / local' },
  { key: 'branded', label: 'Branded' },
  { key: 'non-branded', label: 'Non-branded' },
]

export function parseQueryFilter(v: string | string[] | undefined): QueryFilterKey {
  const s = Array.isArray(v) ? v[0] : v
  return QUERY_FILTERS.some((f) => f.key === s) ? (s as QueryFilterKey) : 'all'
}

const BRANDED = /\bsano\b|sano\.?nz/
const COMMERCIAL = /\b(commercial|office|offices|workplace|business|corporate|retail|warehouse|janitorial|industrial|medical|clinic|school|childcare|daycare|gym|body corporate|strata|shop|restaurant|cafe)\b/
const END_OF_TENANCY = /\b(end of (tenancy|lease|let|rental)|move[- ]?out|moving out|bond clean(ing)?|vacate|vacating|exit clean(ing)?|tenancy clean(ing)?)\b/
const RESIDENTIAL = /\b(house|houses|home|homes|residential|domestic|regular|weekly|fortnightly|deep clean(ing)?|spring clean(ing)?|maid|maids|housekeep\w*|apartment|airbnb)\b/
const LOCAL_EXTRAS = ['auckland', 'near me', 'cbd', 'north shore', 'east auckland', 'west auckland', 'south auckland', 'central auckland']

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const LOCAL = new RegExp(
  `\\b(${Array.from(new Set([...SERVICE_AREAS.map((a) => a.suburb.toLowerCase()), ...LOCAL_EXTRAS]))
    .sort((a, b) => b.length - a.length)
    .map(escapeRe)
    .join('|')})\\b`,
)

const normaliseQuery = (q: string) => q.toLowerCase().replace(/\bmt\.?(?=\s)/g, 'mount').replace(/\s+/g, ' ').trim()

export function classifyQuery(query: string): QueryCategory[] {
  const q = normaliseQuery(query)
  const cats: QueryCategory[] = []
  if (BRANDED.test(q)) cats.push('branded')
  if (COMMERCIAL.test(q)) cats.push('commercial')
  const eot = END_OF_TENANCY.test(q)
  if (eot) cats.push('end-of-tenancy')
  // End of tenancy is a residential service, so it counts as residential too.
  if (eot || RESIDENTIAL.test(q)) cats.push('residential')
  if (LOCAL.test(q)) cats.push('local')
  return cats
}

export function matchesQueryFilter(query: string, filter: QueryFilterKey, search?: string): boolean {
  if (search && !query.toLowerCase().includes(search.toLowerCase().trim())) return false
  if (filter === 'all') return true
  const cats = classifyQuery(query)
  if (filter === 'non-branded') return !cats.includes('branded')
  return cats.includes(filter)
}

/* ── Opportunity lists ──────────────────────────────────────────────── */

/** Positions ~4–15 with real impressions and low/moderate CTR, ranked by clicks left on the table. */
export function findQuickWins(rows: ComparedRow[], limit = 10): ComparedRow[] {
  return rows
    .filter((r) =>
      r.position >= QUICK_WIN.minPosition &&
      r.position <= QUICK_WIN.maxPosition &&
      r.impressions >= QUICK_WIN.minImpressions &&
      r.ctr < QUICK_WIN.maxCtr,
    )
    .sort((a, b) => quickWinScore(b) - quickWinScore(a) || a.position - b.position)
    .slice(0, limit)
}
export function quickWinScore(r: GscMetrics): number {
  return r.impressions * Math.max(TARGET_CTR - r.ctr, 0)
}

/**
 * Google already shows Sano for these a lot, but deep in the results.
 * Score = impressions × share not clicked × a gentle position discount
 * (position 20 counts fully; 40 counts half) so achievable gaps rank first.
 */
export function findHighImpressionOpportunities(rows: ComparedRow[], limit = 10): ComparedRow[] {
  return rows
    .filter((r) => r.position > HIGH_IMPRESSION.minPosition && r.impressions >= HIGH_IMPRESSION.minImpressions)
    .sort((a, b) => highImpressionScore(b) - highImpressionScore(a))
    .slice(0, limit)
}
export function highImpressionScore(r: GscMetrics): number {
  return r.impressions * (1 - r.ctr) * Math.min(1, 20 / Math.max(r.position, 1))
}

/** Latest 28 days vs previous 28: meaningful gains only (no 0 → 1 impression noise). */
export function findGrowingQueries(rows: ComparedRow[], history: boolean, limit = 10): ComparedRow[] {
  if (!history) return []
  return rows
    .filter((r) => {
      const prevImpr = r.prev?.impressions ?? 0
      const impressionsUp = r.impressionsDelta >= GROWTH.minImpressionsDelta && r.impressions >= prevImpr * GROWTH.minGrowthRatio
      const clicksUp = r.clicksDelta >= GROWTH.minClicksDelta
      const positionUp = (r.positionGain ?? 0) >= GROWTH.minPositionGain && r.impressions >= GROWTH.minImpressionsForPosition
      return impressionsUp || clicksUp || positionUp
    })
    .sort((a, b) => growthScore(b) - growthScore(a))
    .slice(0, limit)
}
export function growthScore(r: ComparedRow): number {
  return r.impressionsDelta + 5 * r.clicksDelta + 2 * Math.max(r.positionGain ?? 0, 0)
}

/* ── Landing pages ──────────────────────────────────────────────────── */

export type PageTag = 'strong' | 'gaining' | 'low-ctr' | 'quick-win'

export function pageTags(r: ComparedRow, history: boolean): PageTag[] {
  const tags: PageTag[] = []
  if (r.position <= 3 && r.clicks >= 1 && r.impressions >= 10) tags.push('strong')
  const prevImpr = r.prev?.impressions ?? 0
  if (history && r.impressionsDelta >= 10 && (prevImpr === 0 || r.impressions >= prevImpr * 1.3)) tags.push('gaining')
  if (r.impressions >= 30 && r.ctr < 0.02) tags.push('low-ctr')
  if (r.position >= QUICK_WIN.minPosition && r.position <= QUICK_WIN.maxPosition && r.impressions >= QUICK_WIN.minImpressions) tags.push('quick-win')
  return tags
}

/* ── Suburb pages ───────────────────────────────────────────────────── */

export interface SuburbRow {
  slug: string
  suburb: string
  path: string
  current: GscMetrics | null
  previous: GscMetrics | null
  positionGain: number | null
  topQuery?: string
}

const titleCase = (slug: string) => slug.split('-').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

/** Every built suburb landing page, including ones Google hasn't shown yet. Sorted by impressions. */
export function buildSuburbRows(pagesCurrent: GscRow[], pagesPrevious: GscRow[], queryForPage: Map<string, string>): SuburbRow[] {
  const cur = new Map(pagesCurrent.map((r) => [r.key, r]))
  const prev = new Map(pagesPrevious.map((r) => [r.key, r]))
  const names = new Map(SERVICE_AREAS.map((a) => [a.slug, a.suburb]))
  return Array.from(SUBURB_LANDING_SLUGS)
    .map((slug) => {
      const path = `/service-area/${slug}`
      const c = cur.get(path) ?? null
      const p = prev.get(path) ?? null
      return {
        slug,
        suburb: names.get(slug) ?? titleCase(slug),
        path,
        current: c,
        previous: p,
        positionGain: positionGain(c, p),
        topQuery: queryForPage.get(path),
      }
    })
    .sort((a, b) => (b.current?.impressions ?? 0) - (a.current?.impressions ?? 0) || a.suburb.localeCompare(b.suburb))
}

/* ── Totals comparison ──────────────────────────────────────────────── */

export interface TotalsComparison {
  history: boolean
  clicks: CountChange
  impressions: CountChange
  /** Percentage-point change in CTR (e.g. 0.4 = +0.4pp); null without history. */
  ctrPp: number | null
  /** prev − current average position (positive = improved); null without history. */
  positionGain: number | null
}

export function compareTotals(cur: GscMetrics, prev: GscMetrics): TotalsComparison {
  const history = prev.impressions > 0
  return {
    history,
    clicks: countChange(cur.clicks, prev.clicks, history),
    impressions: countChange(cur.impressions, prev.impressions, history),
    ctrPp: history ? Number(((cur.ctr - prev.ctr) * 100).toFixed(1)) : null,
    positionGain: history && cur.impressions > 0 ? Number((prev.position - cur.position).toFixed(1)) : null,
  }
}

/* ── Recommended actions (deterministic) ────────────────────────────── */

export interface Recommendation {
  kind: 'high-impression' | 'quick-win' | 'protect' | 'growing' | 'suburb-coverage'
  text: string
}

const pct = (v: number) => `${(v * 100).toFixed(1)}%`
const pos = (v: number) => v.toFixed(1)

/**
 * 3–5 data-driven actions. Priority: biggest high-impression gap, best quick
 * win, a ranking to protect, a growing query, suburb-page coverage — then
 * extra quick wins / high-impression gaps to fill. Branded searches are
 * excluded (brand ranking is a different job from SEO content work).
 */
export function buildRecommendations(input: {
  queries: ComparedRow[]
  history: boolean
  suburbs: SuburbRow[]
  max?: number
}): Recommendation[] {
  const max = input.max ?? 5
  const nonBranded = input.queries.filter((q) => !classifyQuery(q.key).includes('branded'))
  const used = new Set<string>()
  const out: Recommendation[] = []
  const take = (r: ComparedRow | undefined, make: (r: ComparedRow) => Recommendation) => {
    if (!r || used.has(r.key) || out.length >= max) return
    used.add(r.key)
    out.push(make(r))
  }
  const where = (r: ComparedRow) => (r.page ? r.page : 'the page Google is showing')

  const high = findHighImpressionOpportunities(nonBranded)
  const quick = findQuickWins(nonBranded)
  const protect = nonBranded
    .filter((r) => r.position <= 3 && r.impressions >= 10)
    .sort((a, b) => b.impressions - a.impressions)
  const growing = findGrowingQueries(nonBranded, input.history)

  const highRec = (r: ComparedRow): Recommendation => ({
    kind: 'high-impression',
    text: `“${r.key}” has ${r.impressions} impressions at position ${pos(r.position)}. ${r.page ? `Google mostly shows ${r.page} — consider strengthening that page for this search.` : 'Consider improving the most relevant page for this search.'}`,
  })
  const quickRec = (r: ComparedRow): Recommendation => ({
    kind: 'quick-win',
    text: `“${r.key}” is averaging position ${pos(r.position)} from ${r.impressions} impressions. ${r.page ?? 'Its ranking page'} may be a quick-win optimisation opportunity.`,
  })

  take(high[0], highRec)
  take(quick[0], quickRec)
  take(protect[0], (r) => ({
    kind: 'protect',
    text: `“${r.key}” is averaging position ${pos(r.position)}. Protect this ranking and monitor CTR (currently ${pct(r.ctr)}).`,
  }))
  take(growing.find((r) => !used.has(r.key)), (r) => ({
    kind: 'growing',
    text: `“${r.key}” is gaining visibility — impressions ${r.prev?.impressions ?? 0} → ${r.impressions}${r.positionGain && r.positionGain > 0 ? `, position improved ${pos(r.positionGain)}` : ''}. Keep building ${where(r)}.`,
  }))

  const unseen = input.suburbs.filter((s) => !s.current || s.current.impressions === 0)
  if (out.length < max && input.suburbs.length > 0 && unseen.length >= Math.max(3, Math.ceil(input.suburbs.length * 0.2))) {
    out.push({
      kind: 'suburb-coverage',
      text: `${unseen.length} of ${input.suburbs.length} suburb pages had no Google impressions in the last 28 days. Check they’re indexed and linked before building more suburb pages.`,
    })
  }

  for (const r of quick.slice(1)) take(r, quickRec)
  for (const r of high.slice(1)) take(r, highRec)
  return out
}

/* ── One-call analysis for the page ─────────────────────────────────── */

export interface SeoAnalysis {
  history: boolean
  totals: TotalsComparison
  queries: ComparedRow[]
  pages: ComparedRow[]
  suburbs: SuburbRow[]
  recommendations: Recommendation[]
}

export function analyseGsc(data: GscData): SeoAnalysis {
  const history = hasHistory(data)
  const { pageForQuery, queryForPage } = pairQueriesAndPages(data.queryPages)
  const queries = compareRows(data.queries.current, data.queries.previous)
    .map((r) => ({ ...r, page: pageForQuery.get(r.key) }))
    .sort((a, b) => b.impressions - a.impressions)
  const pages = compareRows(
    data.pages.current.filter((r) => !isInternalPath(r.key)),
    data.pages.previous,
  )
    .map((r) => ({ ...r, topQuery: queryForPage.get(r.key) }))
    .sort((a, b) => b.impressions - a.impressions)
  const suburbs = buildSuburbRows(data.pages.current, data.pages.previous, queryForPage)
  return {
    history,
    totals: compareTotals(data.totals.current, data.totals.previous),
    queries,
    pages,
    suburbs,
    recommendations: buildRecommendations({ queries, history, suburbs }),
  }
}
