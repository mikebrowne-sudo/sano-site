import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { Users, TrendingUp, FileText, MapPin, Phone, Mail, Target, Globe, Smartphone, UserPlus, Search, MousePointerClick } from 'lucide-react'
import { getGa4Stats, isGa4Configured, type Ga4Stats, type NameValue } from '@/lib/ga4'
import { getGscStats, isGscConfigured, type GscStats } from '@/lib/gsc'
import { TrendChart } from './_components/TrendChart'
import clsx from 'clsx'

// Auth is per-request (cookies) so the page is dynamic; the GA4 fetch itself
// is cached for an hour so we render fast and stay well within API quota.
export const dynamic = 'force-dynamic'

const getCachedStats = unstable_cache(getGa4Stats, ['ga4-stats-v1'], { revalidate: 3600 })
const getCachedGsc = unstable_cache(getGscStats, ['gsc-stats-v1'], { revalidate: 3600 })

function n(v: number) {
  return new Intl.NumberFormat('en-NZ').format(v)
}

// Friendlier display for the noisier GA dimension values, without losing meaning.
function prettyLabel(raw: string): string {
  const v = (raw || '').trim()
  if (!v || v === '(not set)') return 'Unattributed'
  if (v === '(direct) / (none)') return 'Direct'
  if (v === '/') return 'Home page'
  return v
}

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  if (!isGa4Configured()) return <Shell><SetupState /></Shell>

  let stats: Ga4Stats | null = null
  let error: string | null = null
  try {
    stats = await getCachedStats()
  } catch (e) {
    error = e instanceof Error ? e.message : 'Could not load analytics.'
  }

  if (error || !stats) return <Shell><ErrorCard message={error ?? 'No data returned.'} /></Shell>

  // Search Console is an optional add-on section; its failure must not break
  // the GA4 dashboard.
  let gsc: GscStats | null = null
  if (isGscConfigured()) {
    try { gsc = await getCachedGsc() } catch { gsc = null }
  }

  return (
    <Shell>
      {/* Visitor KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={Users} label="Visitors today" value={stats.visitorsToday} />
        <Kpi icon={Users} label="Visitors" value={stats.visitors7d} note="Last 7 days" />
        <Kpi icon={Users} label="Visitors" value={stats.visitors30d} note="Last 30 days" />
      </section>

      {/* 30-day trend */}
      <Card>
        <CardHead icon={TrendingUp} title="Visitor trend" note="Last 30 days" />
        <TrendChart points={stats.trend30d} />
      </Card>

      {/* Engagement / conversions */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={Target} label="Quote & contact leads" value={stats.leads} note="Last 30 days" tone="accent" />
        <Kpi icon={Phone} label="Phone clicks" value={stats.phoneClicks} note="Last 30 days" />
        <Kpi icon={Mail} label="Email clicks" value={stats.emailClicks} note="Last 30 days" />
      </section>

      {/* Breakdowns */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListCard icon={Globe} title="Top traffic sources" rows={stats.topSources} />
        <ListCard icon={FileText} title="Top landing pages" rows={stats.topLandingPages} mono />
      </section>
      <ListCard icon={MapPin} title="Top suburb pages" rows={stats.topSuburbPages} mono empty="No suburb-page visits yet." />

      {/* Audience */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListCard icon={Smartphone} title="Devices" rows={stats.deviceSplit} />
        <ListCard icon={UserPlus} title="New vs returning" rows={stats.newVsReturning} />
      </section>
      <ListCard icon={MapPin} title="Top locations" rows={stats.topLocations} empty="No location data yet." />

      {/* Google Search (Search Console) */}
      {isGscConfigured() && gsc ? (
        <Card>
          <CardHead icon={Search} title="Google Search" note="Last 28 days" />
          <div className="grid grid-cols-3 gap-4 mb-5">
            <MiniStat icon={MousePointerClick} label="Clicks" value={n(gsc.totalClicks)} />
            <MiniStat icon={Search} label="Impressions" value={n(gsc.totalImpressions)} />
            <MiniStat icon={TrendingUp} label="Avg position" value={gsc.avgPosition ? gsc.avgPosition.toFixed(1) : '—'} />
          </div>
          {gsc.topQueries.length === 0 ? (
            <p className="text-sm text-sage-400">No search queries yet — Google needs a little more time to report them.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-sage-400 border-b border-sage-100">
                    <th className="py-2 font-medium">Search term</th>
                    <th className="py-2 font-medium text-right">Impressions</th>
                    <th className="py-2 font-medium text-right">Clicks</th>
                    <th className="py-2 font-medium text-right">Avg pos</th>
                  </tr>
                </thead>
                <tbody>
                  {gsc.topQueries.map((q) => (
                    <tr key={q.query} className="border-b border-sage-50 last:border-0">
                      <td className="py-2 text-sage-700 pr-3">{q.query}</td>
                      <td className="py-2 text-right tabular-nums text-sage-600">{n(q.impressions)}</td>
                      <td className="py-2 text-right tabular-nums font-medium text-sage-800">{n(q.clicks)}</td>
                      <td className="py-2 text-right tabular-nums text-sage-600">{q.position.toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className="text-[11px] text-sage-400 mt-3">The actual searches people typed to find sano.nz. Low average position = appearing further down the results — good terms to target.</p>
        </Card>
      ) : (
        <Card className="bg-sage-50/60 border-sage-100">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-sage-200 text-sage-500 shrink-0"><Search size={18} /></span>
            <div className="text-sm">
              <p className="font-semibold text-sage-800 mb-1">See the search terms people find you with</p>
              <p className="text-sage-500">Connect Google Search Console to show your top search queries + average position here. It reuses the analytics service account — add it as a user in Search Console, enable the Search Console API, and set <span className="font-mono text-xs">GSC_SITE_URL</span> in Netlify.</p>
            </div>
          </div>
        </Card>
      )}

      <p className="text-xs text-sage-400 pt-1">
        Visitors, leads and clicks for the last 30 days unless noted. Updated about hourly. Figures build up over time, so
        recent numbers may look low to begin with.
      </p>
    </Shell>
  )
}

/* ── Layout ─────────────────────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl tracking-tight font-bold text-sage-800">Website analytics</h1>
        <p className="text-sm text-sage-500 mt-1">Track website visitors, leads and engagement.</p>
      </header>
      {children}
    </div>
  )
}

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={clsx('rounded-2xl border border-sage-100 bg-white shadow-[0_1px_3px_rgba(52,76,61,0.05)] p-5', className)}>{children}</div>
}

function CardHead({ icon: Icon, title, note }: { icon: React.ElementType; title: string; note?: string }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-sage-800">
        <Icon size={16} className="text-sage-400" />{title}
      </h2>
      {note && <span className="text-xs font-medium text-sage-400">{note}</span>}
    </div>
  )
}

/* ── KPI card ───────────────────────────────────────────────────── */

function Kpi({ icon: Icon, label, value, note, tone }: { icon: React.ElementType; label: string; value: number; note?: string; tone?: 'accent' }) {
  return (
    <div className={clsx(
      'rounded-2xl border p-5 transition-shadow hover:shadow-[0_4px_16px_rgba(52,76,61,0.08)]',
      tone === 'accent' ? 'border-sage-200 bg-sage-50/60' : 'border-sage-100 bg-white shadow-[0_1px_3px_rgba(52,76,61,0.05)]',
    )}>
      <div className="flex items-center justify-between mb-3">
        <span className={clsx('inline-flex items-center justify-center w-9 h-9 rounded-xl', tone === 'accent' ? 'bg-sage-500/15 text-sage-700' : 'bg-sage-50 text-sage-500')}>
          <Icon size={18} />
        </span>
        {note && <span className="text-[11px] font-medium uppercase tracking-wide text-sage-400">{note}</span>}
      </div>
      <p className="text-3xl font-bold text-sage-900 tabular-nums leading-none">{n(value)}</p>
      <p className="text-sm text-sage-500 mt-2">{label}</p>
    </div>
  )
}

function MiniStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-sage-100 bg-white p-3">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-sage-400 mb-1">
        <Icon size={13} /> {label}
      </div>
      <p className="text-xl font-bold text-sage-900 tabular-nums">{value}</p>
    </div>
  )
}

/* ── Top lists ──────────────────────────────────────────────────── */

function ListCard({ icon: Icon, title, rows, mono, empty }: { icon: React.ElementType; title: string; rows: NameValue[]; mono?: boolean; empty?: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <Card>
      <CardHead icon={Icon} title={title} />
      {rows.length === 0 ? (
        <p className="text-sm text-sage-400 py-2">{empty ?? 'No data yet.'}</p>
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const label = prettyLabel(r.label)
            const unattributed = label === 'Unattributed'
            return (
              <li key={r.label}>
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className={clsx('min-w-0 truncate text-sm', unattributed ? 'italic text-sage-400' : mono ? 'text-sage-700 font-mono text-[13px]' : 'text-sage-700')} title={label}>
                    {label}
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-sage-800 tabular-nums">{n(r.value)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-sage-50 overflow-hidden">
                  <div className="h-full rounded-full bg-sage-300" style={{ width: `${Math.max(3, Math.round((r.value / max) * 100))}%` }} />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

/* ── Setup / error states ───────────────────────────────────────── */

function SetupState() {
  return (
    <Card className="bg-sage-50/60 border-sage-100">
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-sage-200 text-sage-500 shrink-0">
          <TrendingUp size={18} />
        </span>
        <div className="text-sm text-sage-700">
          <p className="font-semibold text-sage-800 mb-1">Analytics isn’t connected yet.</p>
          <p className="text-sage-500">
            Once tracking is connected, this page will show website visitors, leads and engagement. Setup details are in the
            project notes.
          </p>
        </div>
      </div>
    </Card>
  )
}

function ErrorCard({ message }: { message: string }) {
  return (
    <Card className="border-amber-100 bg-amber-50/70">
      <p className="font-semibold text-amber-800 mb-2">Couldn’t load analytics right now.</p>
      <p className="font-mono text-xs bg-white/70 border border-amber-100 rounded-lg px-3 py-2 break-words text-amber-800">{message}</p>
      <p className="mt-3 text-sm text-amber-700">
        This is usually a temporary data or connection issue — try again shortly. If it persists, the message above will help
        us pin it down.
      </p>
    </Card>
  )
}
