// Google Search (Search Console) section — built to answer "what should we
// work on next for organic search?". All numbers/rules come from
// src/lib/seo-insights.ts; this file is presentation only.

import Link from 'next/link'
import clsx from 'clsx'
import { Search, MousePointerClick, TrendingUp, Percent, Lightbulb, Zap, Eye, Rocket, ListFilter, FileText, MapPin } from 'lucide-react'
import {
  QUERY_FILTERS, classifyQuery, countChange, findGrowingQueries, findHighImpressionOpportunities, findQuickWins,
  matchesQueryFilter, pageTags,
  type ComparedRow, type GscData, type PageTag, type QueryCategory, type QueryFilterKey, type SeoAnalysis,
} from '@/lib/seo-insights'
import {
  Card, CardHead, Change, Chip, DataTable, MiniStat, PathText, countChangeView, fmtRange, n, pct, pos, positionChangeView,
  type Column,
} from './ui'

const CATEGORY_LABEL: Record<QueryCategory, string> = {
  branded: 'Branded',
  commercial: 'Commercial',
  residential: 'Residential',
  'end-of-tenancy': 'End of tenancy',
  local: 'Local',
}
const PAGE_TAG: Record<PageTag, { label: string; tone: 'emerald' | 'amber' | 'sage' }> = {
  strong: { label: 'Strong', tone: 'emerald' },
  gaining: { label: 'Gaining', tone: 'emerald' },
  'low-ctr': { label: 'Low CTR', tone: 'amber' },
  'quick-win': { label: 'Quick win', tone: 'sage' },
}

export function SearchSection({ data, analysis, filter, search }: { data: GscData; analysis: SeoAnalysis; filter: QueryFilterKey; search: string }) {
  const { totals, history } = analysis
  const cur = data.totals.current
  const period = fmtRange(data.current.startDate, data.current.endDate)
  const prevPeriod = fmtRange(data.previous.startDate, data.previous.endDate)

  const filtered = analysis.queries.filter((q) => matchesQueryFilter(q.key, filter, search))
  const quickWins = findQuickWins(filtered)
  const highImpression = findHighImpressionOpportunities(filtered)
  const growing = findGrowingQueries(filtered, history)
  const filterActive = filter !== 'all' || !!search
  const filterNote = filterActive ? 'No matching search terms for this filter.' : undefined

  return (
    <>
      {/* KPIs: current 28 days vs previous 28 */}
      <Card>
        <CardHead
          icon={Search}
          title="Google Search"
          note={period}
          sub={history ? `Last 28 days compared with the previous 28 (${prevPeriod}).` : 'Last 28 days. Not enough history yet for comparisons.'}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MiniStat icon={MousePointerClick} label="Clicks" value={n(cur.clicks)} change={countChangeView(totals.clicks)} />
          <MiniStat icon={Eye} label="Impressions" value={n(cur.impressions)} change={countChangeView(totals.impressions)} />
          <MiniStat
            icon={TrendingUp}
            label="Avg position"
            value={pos(cur.position)}
            change={history ? positionChangeView(totals.positionGain, true) : countChangeView({ kind: 'no-history' })}
          />
          <MiniStat
            icon={Percent}
            label="CTR"
            value={pct(cur.ctr)}
            change={totals.ctrPp === null
              ? countChangeView({ kind: 'no-history' })
              : totals.ctrPp === 0
                ? { text: 'No change', tone: 'flat' }
                : { text: `${totals.ctrPp > 0 ? '+' : '−'}${Math.abs(totals.ctrPp).toFixed(1)} pp`, tone: totals.ctrPp > 0 ? 'up' : 'down' }}
          />
        </div>
      </Card>

      {/* Recommended actions */}
      <Card className="border-sage-200 bg-sage-50/50">
        <CardHead icon={Lightbulb} title="What to work on next" sub="Generated from the Search Console numbers below using fixed rules (branded searches excluded)." />
        {analysis.recommendations.length === 0 ? (
          <p className="text-sm text-sage-500">No clear opportunities yet — Google needs more impressions to work with.</p>
        ) : (
          <ol className="space-y-2.5">
            {analysis.recommendations.map((r, i) => (
              <li key={i} className="flex gap-3 text-sm text-sage-800">
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white border border-sage-200 text-xs font-semibold text-sage-600 shrink-0">{i + 1}</span>
                <span className="pt-0.5">{r.text}</span>
              </li>
            ))}
          </ol>
        )}
      </Card>

      {/* Query filter */}
      <Card id="queries" className="py-4">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-sage-400 mb-2.5">
          <ListFilter size={13} /> Filter search terms
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          {QUERY_FILTERS.map((f) => {
            const params = new URLSearchParams()
            if (f.key !== 'all') params.set('cat', f.key)
            if (search) params.set('q', search)
            const qs = params.toString()
            return (
              <Link
                key={f.key}
                href={`/portal/analytics${qs ? `?${qs}` : ''}#queries`}
                scroll={false}
                className={clsx(
                  'rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                  filter === f.key ? 'border-sage-600 bg-sage-600 text-white' : 'border-sage-200 bg-white text-sage-600 hover:border-sage-400',
                )}
              >
                {f.label}
              </Link>
            )
          })}
        </div>
        <form method="get" action="/portal/analytics#queries" className="flex gap-2">
          {filter !== 'all' && <input type="hidden" name="cat" value={filter} />}
          <input
            type="search"
            name="q"
            defaultValue={search}
            placeholder="Search terms containing…"
            className="min-w-0 flex-1 rounded-xl border border-sage-200 bg-white px-3 py-2 text-sm text-sage-800 placeholder:text-sage-300 focus:border-sage-400 focus:outline-none"
          />
          <button type="submit" className="rounded-xl bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700">Search</button>
        </form>
        <p className="text-xs text-sage-500 mt-2.5">
          {filterActive ? `${n(filtered.length)} of ${n(analysis.queries.length)} search terms match.` : `${n(analysis.queries.length)} search terms.`}
          {' '}Applies to quick wins, high-impression opportunities, growing queries and all search terms.
        </p>
      </Card>

      {/* Quick wins */}
      <Card>
        <CardHead icon={Zap} title="Quick wins" sub="Position 4–15 with real impressions and low CTR — a small ranking lift could add clicks. Ranked by clicks left on the table." />
        <DataTable
          empty={filterNote ?? 'No quick-win searches right now.'}
          columns={[{ label: 'Search term' }, { label: 'Impr', align: 'right' }, { label: 'Clicks', align: 'right' }, { label: 'CTR', align: 'right', wide: true }, { label: 'Avg pos', align: 'right' }, { label: 'Pos change', align: 'right', wide: true }, { label: 'Landing page', wide: true }]}
          rows={quickWins.map((q) => [
            <QueryCell key="q" row={q} />,
            n(q.impressions), n(q.clicks), pct(q.ctr), pos(q.position),
            <Change key="c" view={positionChangeView(q.positionGain)} />,
            <PathText key="p" path={q.page} />,
          ])}
        />
      </Card>

      {/* High-impression opportunities */}
      <Card>
        <CardHead icon={Eye} title="High-impression opportunities" sub="Google already shows Sano for these often, but beyond position 15. Ranked by impressions, CTR and how far there is to climb." />
        <DataTable
          empty={filterNote ?? 'No high-impression gaps right now.'}
          columns={[{ label: 'Search term' }, { label: 'Impr', align: 'right' }, { label: 'Clicks', align: 'right' }, { label: 'CTR', align: 'right', wide: true }, { label: 'Avg pos', align: 'right' }, { label: 'Pos change', align: 'right', wide: true }, { label: 'Landing page', wide: true }]}
          rows={highImpression.map((q) => [
            <QueryCell key="q" row={q} />,
            n(q.impressions), n(q.clicks), pct(q.ctr), pos(q.position),
            <Change key="c" view={positionChangeView(q.positionGain)} />,
            <PathText key="p" path={q.page} />,
          ])}
        />
      </Card>

      {/* Growing queries */}
      <Card>
        <CardHead icon={Rocket} title="Growing queries" note="vs previous 28 days" sub="Meaningful gains in impressions, clicks or position. Tiny movements are ignored." />
        {!history ? (
          <p className="text-sm text-sage-400 py-2">Not enough history yet — this fills in once Search Console has a full previous 28-day period.</p>
        ) : (
          <DataTable
            empty={filterNote ?? 'No meaningful growth this period.'}
            columns={[{ label: 'Search term' }, { label: 'Impressions', align: 'right' }, { label: 'Clicks', align: 'right' }, { label: 'Avg pos', align: 'right' }, { label: 'Pos change', align: 'right' }, { label: 'Landing page', wide: true }]}
            rows={growing.map((q) => [
              <QueryCell key="q" row={q} />,
              <span key="i">{n(q.prev?.impressions ?? 0)} → <strong className="text-sage-800">{n(q.impressions)}</strong></span>,
              <span key="c">{n(q.prev?.clicks ?? 0)} → <strong className="text-sage-800">{n(q.clicks)}</strong></span>,
              pos(q.position),
              <Change key="g" view={positionChangeView(q.positionGain)} />,
              <PathText key="p" path={q.page} />,
            ])}
          />
        )}
      </Card>

      {/* All search terms */}
      <Card>
        <CardHead icon={Search} title="All search terms" note={filtered.length > 25 ? `Top 25 of ${n(filtered.length)}` : undefined} sub="Sorted by impressions. Google hides very rare searches, so these won't sum to the totals above." />
        <DataTable
          empty={filterNote ?? 'No search terms yet — Google needs a little more time to report them.'}
          columns={[{ label: 'Search term' }, { label: 'Impr', align: 'right' }, { label: 'Clicks', align: 'right' }, { label: 'CTR', align: 'right', wide: true }, { label: 'Avg pos', align: 'right' }, { label: 'Impr change', align: 'right', wide: true }, { label: 'Pos change', align: 'right', wide: true }]}
          rows={filtered.slice(0, 25).map((q) => [
            <QueryCell key="q" row={q} withCategories />,
            n(q.impressions), n(q.clicks), pct(q.ctr), pos(q.position),
            <Change key="i" view={countChangeView(countChange(q.impressions, q.prev?.impressions, history))} />,
            <Change key="g" view={positionChangeView(q.positionGain)} />,
          ])}
        />
      </Card>

      {/* Landing pages */}
      <LandingPagesCard analysis={analysis} />

      {/* Suburb pages */}
      <SuburbCard analysis={analysis} />
    </>
  )
}

function QueryCell({ row, withCategories }: { row: ComparedRow; withCategories?: boolean }) {
  const cats = withCategories ? classifyQuery(row.key) : []
  return (
    <div className="min-w-[10rem]">
      <span className="text-sage-800">{row.key}</span>
      {cats.length > 0 && (
        <span className="flex flex-wrap gap-1 mt-1">
          {cats.map((c) => <Chip key={c} tone="muted">{CATEGORY_LABEL[c]}</Chip>)}
        </span>
      )}
    </div>
  )
}

function LandingPagesCard({ analysis }: { analysis: SeoAnalysis }) {
  const { pages, history } = analysis
  const columns: Column[] = [
    { label: 'Landing page' }, { label: 'Clicks', align: 'right' }, { label: 'Impr', align: 'right' }, { label: 'CTR', align: 'right', wide: true },
    { label: 'Avg pos', align: 'right' }, { label: 'Impr change', align: 'right', wide: true }, { label: 'Pos change', align: 'right', wide: true },
  ]
  return (
    <Card>
      <CardHead icon={FileText} title="Search performance by landing page" note={pages.length > 25 ? `Top 25 of ${n(pages.length)}` : undefined} sub="Strong = top 3 with clicks · Gaining = impressions up · Low CTR = seen often, rarely clicked · Quick win = position 4–15." />
      <DataTable
        empty="No landing-page data yet."
        columns={columns}
        rows={pages.slice(0, 25).map((p) => {
          const tags = pageTags(p, history)
          return [
            <div key="p" className="min-w-[12rem]">
              <PathText path={p.key} />
              {(tags.length > 0 || p.topQuery) && (
                <span className="flex flex-wrap items-center gap-1 mt-1">
                  {tags.map((t) => <Chip key={t} tone={PAGE_TAG[t].tone}>{PAGE_TAG[t].label}</Chip>)}
                  {p.topQuery && <span className="text-[11px] text-sage-400">top search: {p.topQuery}</span>}
                </span>
              )}
            </div>,
            n(p.clicks), n(p.impressions), pct(p.ctr), pos(p.position),
            <Change key="i" view={countChangeView(countChange(p.impressions, p.prev?.impressions, history))} />,
            <Change key="g" view={positionChangeView(p.positionGain)} />,
          ]
        })}
      />
    </Card>
  )
}

function SuburbCard({ analysis }: { analysis: SeoAnalysis }) {
  const { suburbs, history } = analysis
  const seen = suburbs.filter((s) => s.current && s.current.impressions > 0)
  const unseen = suburbs.filter((s) => !s.current || s.current.impressions === 0)
  const totalImpr = seen.reduce((sum, s) => sum + (s.current?.impressions ?? 0), 0)
  const totalClicks = seen.reduce((sum, s) => sum + (s.current?.clicks ?? 0), 0)
  const prevImpr = suburbs.reduce((sum, s) => sum + (s.previous?.impressions ?? 0), 0)
  const totalChange = countChangeView(countChange(totalImpr, prevImpr, history))

  // Per-row: a suburb page with no prior-period impressions has no baseline yet.
  const imprChange = (cur: number, prev: number | undefined) =>
    !history || !prev ? { text: 'Not enough history yet', tone: 'flat' as const } : countChangeView(countChange(cur, prev, history))

  return (
    <Card>
      <CardHead icon={MapPin} title="Suburb page performance" note={`${n(suburbs.length)} pages`} sub="Every /service-area/ landing page, so the rollout can be judged before building more." />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-sm">
        <SummaryStat label="Showing in Google" value={`${n(seen.length)} of ${n(suburbs.length)}`} />
        <SummaryStat label="Impressions" value={n(totalImpr)} extra={<Change view={totalChange} className="text-xs font-medium" />} />
        <SummaryStat label="Clicks" value={n(totalClicks)} />
        <SummaryStat label="No impressions yet" value={n(unseen.length)} />
      </div>
      <DataTable
        empty="None of the suburb pages have Google impressions yet."
        columns={[
          { label: 'Suburb' }, { label: 'Impr', align: 'right' }, { label: 'Clicks', align: 'right' }, { label: 'CTR', align: 'right', wide: true },
          { label: 'Avg pos', align: 'right' }, { label: 'Pos change', align: 'right', wide: true }, { label: 'Impr change', align: 'right', wide: true },
        ]}
        rows={seen.map((s) => {
          const c = s.current!
          return [
            <div key="s" className="min-w-[10rem]">
              <span className="font-medium text-sage-800">{s.suburb}</span>
              <span className="block"><PathText path={s.path} /></span>
              {s.topQuery && <span className="block text-[11px] text-sage-400 mt-0.5">top search: {s.topQuery}</span>}
            </div>,
            n(c.impressions), n(c.clicks), pct(c.ctr), pos(c.position),
            <Change key="g" view={positionChangeView(s.positionGain)} />,
            <Change key="i" view={imprChange(c.impressions, s.previous?.impressions)} />,
          ]
        })}
      />
      {unseen.length > 0 && (
        <details className="mt-4 rounded-xl border border-sage-100 bg-sage-50/50 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-sage-700">
            {n(unseen.length)} suburb page{unseen.length === 1 ? '' : 's'} with no Google impressions in the last 28 days
          </summary>
          <p className="mt-2 text-sm text-sage-600 leading-relaxed">
            {unseen.map((s) => s.suburb).join(', ')}
          </p>
          <p className="mt-2 text-xs text-sage-500">If these stay at zero, check they’re indexed in Search Console (URL inspection) and linked from the service-area hub before adding more suburb pages.</p>
        </details>
      )}
    </Card>
  )
}

function SummaryStat({ label, value, extra }: { label: string; value: string; extra?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-sage-100 p-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-sage-400">{label}</p>
      <p className="text-lg font-bold text-sage-900 tabular-nums">{value}</p>
      {extra}
    </div>
  )
}
