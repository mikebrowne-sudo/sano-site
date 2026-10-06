// Server-only Google Search Console (Search Analytics) access for the portal.
//
// Reuses the GA4 service-account key (GA4_SA_KEY_BASE64) for auth — the same
// service account just needs to be added as a user on the Search Console
// property, and the Search Console API enabled in the Cloud project. Plus:
//   GSC_SITE_URL — the property, e.g. 'sc-domain:sano.nz' (domain property)
//                  or 'https://sano.nz/' (URL-prefix property).
//
// Node-only (imports google-auth-library); never bundled to the client. Callers
// should cache (the page wraps this in unstable_cache, 1-hour revalidate).

import { JWT } from 'google-auth-library'

// Two consecutive 28-day periods are fetched live (Search Console keeps ~16
// months), so period comparisons need no database storage. All analysis is
// in src/lib/seo-insights.ts (pure, unit-tested).

import {
  gscPeriods, normalisePagePath,
  type GscData, type GscMetrics, type GscPeriod, type GscRow, type GscQueryPageRow,
} from '@/lib/seo-insights'

export function isGscConfigured(): boolean {
  return !!(process.env.GA4_SA_KEY_BASE64 && process.env.GSC_SITE_URL)
}

interface ApiRow { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number }
interface ApiResp { rows?: ApiRow[] }

async function runQuery(token: string, site: string, body: Record<string, unknown>): Promise<ApiResp> {
  const res = await fetch(
    `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`,
    { method: 'POST', headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' }, body: JSON.stringify(body) },
  )
  if (!res.ok) {
    const detail = (await res.text()).slice(0, 300)
    throw new Error(`Search Console API ${res.status}: ${detail}`)
  }
  return res.json() as Promise<ApiResp>
}

const metrics = (r: ApiRow | undefined): GscMetrics => ({
  clicks: Math.round(r?.clicks ?? 0),
  impressions: Math.round(r?.impressions ?? 0),
  ctr: r?.ctr ?? 0,
  position: r?.position ?? 0,
})

export async function getGscData(): Promise<GscData> {
  const json = JSON.parse(Buffer.from(process.env.GA4_SA_KEY_BASE64 as string, 'base64').toString('utf8'))
  const auth = new JWT({
    email: json.client_email,
    key: json.private_key,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  })
  const { token } = await auth.getAccessToken()
  if (!token) throw new Error('Could not obtain a Search Console access token.')

  const site = process.env.GSC_SITE_URL as string
  const { current, previous } = gscPeriods()

  const totalsFor = async (p: GscPeriod): Promise<GscMetrics> => metrics((await runQuery(token, site, { ...p })).rows?.[0])

  const rowsBy = async (p: GscPeriod, dimension: 'query' | 'page'): Promise<GscRow[]> => {
    const res = await runQuery(token, site, { ...p, dimensions: [dimension], rowLimit: 1000 })
    const byKey = new Map<string, GscRow>()
    for (const r of res.rows ?? []) {
      const raw = r.keys?.[0] ?? ''
      const key = dimension === 'page' ? normalisePagePath(raw) : raw
      // Two URLs can normalise to one path (trailing slash, www) — merge them,
      // impression-weighting the position.
      const m = metrics(r)
      const e = byKey.get(key)
      if (!e) { byKey.set(key, { key, ...m }); continue }
      const impressions = e.impressions + m.impressions
      const clicks = e.clicks + m.clicks
      byKey.set(key, {
        key,
        clicks,
        impressions,
        ctr: impressions ? clicks / impressions : 0,
        position: impressions ? (e.position * e.impressions + m.position * m.impressions) / impressions : 0,
      })
    }
    return Array.from(byKey.values())
  }

  const queryPagesFor = async (p: GscPeriod): Promise<GscQueryPageRow[]> => {
    const res = await runQuery(token, site, { ...p, dimensions: ['query', 'page'], rowLimit: 5000 })
    return (res.rows ?? []).map((r) => ({
      query: r.keys?.[0] ?? '',
      page: normalisePagePath(r.keys?.[1] ?? ''),
      ...metrics(r),
    }))
  }

  const [totCur, totPrev, qCur, qPrev, pCur, pPrev, queryPages] = await Promise.all([
    totalsFor(current),
    totalsFor(previous),
    rowsBy(current, 'query'),
    rowsBy(previous, 'query'),
    rowsBy(current, 'page'),
    rowsBy(previous, 'page'),
    queryPagesFor(current),
  ])

  return {
    current,
    previous,
    totals: { current: totCur, previous: totPrev },
    queries: { current: qCur, previous: qPrev },
    pages: { current: pCur, previous: pPrev },
    queryPages,
  }
}
