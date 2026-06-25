import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { Users, TrendingUp, FileText, MapPin, Phone, Mail, Target, Globe } from 'lucide-react'
import { getGa4Stats, isGa4Configured, type Ga4Stats, type NameValue, type TrendPoint } from '@/lib/ga4'
import clsx from 'clsx'

// Auth is per-request (cookies) so the page is dynamic; the GA4 fetch itself
// is cached for an hour so we render fast and stay well within API quota.
export const dynamic = 'force-dynamic'

const getCachedStats = unstable_cache(getGa4Stats, ['ga4-stats-v1'], { revalidate: 3600 })

function n(v: number) {
  return new Intl.NumberFormat('en-NZ').format(v)
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

  if (error || !stats) {
    return (
      <Shell>
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
          <p className="font-semibold mb-1">Couldn’t load analytics.</p>
          <p>{error ?? 'No data returned.'}</p>
          <p className="mt-2 text-amber-700">Check that the service account has Viewer access to the GA4 property and that <code>GA4_PROPERTY_ID</code> is the numeric id.</p>
        </div>
      </Shell>
    )
  }

  return (
    <Shell>
      {/* Visitors */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={Users} label="Visitors today" value={n(stats.visitorsToday)} accent />
        <Stat icon={Users} label="Visitors · last 7 days" value={n(stats.visitors7d)} />
        <Stat icon={Users} label="Visitors · last 30 days" value={n(stats.visitors30d)} />
      </div>

      {/* 30-day trend */}
      <Section title="Visitors — last 30 days" icon={TrendingUp}>
        <Trend points={stats.trend30d} />
      </Section>

      {/* Conversions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Stat icon={Target} label="Quote / contact leads" value={n(stats.leads)} sub="generate_lead · 30 days" accent />
        <Stat icon={Phone} label="Phone clicks" value={n(stats.phoneClicks)} sub="30 days" />
        <Stat icon={Mail} label="Email clicks" value={n(stats.emailClicks)} sub="30 days" />
      </div>

      {/* Sources + landing pages */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title="Top traffic sources" icon={Globe}><BarList rows={stats.topSources} /></Section>
        <Section title="Top landing pages" icon={FileText}><BarList rows={stats.topLandingPages} /></Section>
      </div>

      <Section title="Top suburb pages" icon={MapPin}>
        <BarList rows={stats.topSuburbPages} empty="No suburb-page visits yet." />
      </Section>

      <p className="text-xs text-sage-400">
        Source: Google Analytics 4, fetched server-side and cached for about an hour. Sources, pages, leads and clicks
        cover the last 30 days. Figures build up from when tracking went live, so they’ll look sparse at first.
      </p>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl tracking-tight font-bold text-sage-800">Website analytics</h1>
        <p className="text-sm text-sage-500 mt-1">sano.nz traffic from Google Analytics — no Google login needed.</p>
      </div>
      {children}
    </div>
  )
}

function SetupState() {
  return (
    <div className="rounded-xl border border-sage-100 bg-sage-50 p-6 text-sm text-sage-700">
      <p className="font-semibold text-sage-800 mb-2">Analytics isn’t connected yet.</p>
      <p className="mb-3">Add these two server-side environment variables in Netlify (Site configuration → Environment variables), then redeploy:</p>
      <ul className="space-y-1 mb-3">
        <li className="flex items-center gap-2"><code className="bg-white border border-sage-200 rounded px-1.5 py-0.5">GA4_PROPERTY_ID</code> — the numeric GA4 property id</li>
        <li className="flex items-center gap-2"><code className="bg-white border border-sage-200 rounded px-1.5 py-0.5">GA4_SA_KEY_BASE64</code> — the base64-encoded service-account JSON key</li>
      </ul>
      <p className="text-sage-500">Full step-by-step setup is in the pull request that added this page.</p>
    </div>
  )
}

function Stat({ icon: Icon, label, value, sub, accent }: { icon: React.ElementType; label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={clsx('rounded-xl border p-5', accent ? 'bg-sage-50 border-sage-100' : 'bg-white border-gray-100 shadow-sm')}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={16} className="text-sage-500" />
        <span className="text-sm font-medium text-sage-600">{label}</span>
      </div>
      <p className="text-2xl font-bold text-sage-800 tabular-nums">{value}</p>
      {sub && <p className="text-xs text-sage-400 mt-0.5">{sub}</p>}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      <h2 className="flex items-center gap-2 text-lg font-semibold text-sage-800 mb-4"><Icon size={18} className="text-sage-400" />{title}</h2>
      {children}
    </div>
  )
}

function BarList({ rows, empty }: { rows: NameValue[]; empty?: string }) {
  if (!rows.length) return <p className="text-sm text-sage-400">{empty ?? 'No data yet.'}</p>
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 text-sm">
          <span className="w-1/2 min-w-0 truncate text-sage-700" title={r.label}>{r.label}</span>
          <div className="flex-1 h-2 bg-sage-50 rounded-full overflow-hidden">
            <div className="h-full bg-sage-300 rounded-full" style={{ width: `${Math.max(4, Math.round((r.value / max) * 100))}%` }} />
          </div>
          <span className="w-10 text-right font-medium text-sage-700 tabular-nums">{n(r.value)}</span>
        </div>
      ))}
    </div>
  )
}

function Trend({ points }: { points: TrendPoint[] }) {
  if (!points.length) return <p className="text-sm text-sage-400">No data yet.</p>
  const max = Math.max(...points.map((p) => p.value), 1)
  const total = points.reduce((s, p) => s + p.value, 0)
  const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short' })
  return (
    <div>
      <div className="flex items-end gap-[3px] h-24">
        {points.map((p) => (
          <div
            key={p.date}
            className="flex-1 bg-sage-200 hover:bg-sage-400 rounded-t transition-colors"
            style={{ height: `${Math.max(3, Math.round((p.value / max) * 100))}%` }}
            title={`${fmtDay(p.date)}: ${n(p.value)}`}
          />
        ))}
      </div>
      <div className="flex justify-between text-xs text-sage-400 mt-2">
        <span>{fmtDay(points[0].date)}</span>
        <span>{n(total)} visitors over {points.length} days</span>
        <span>{fmtDay(points[points.length - 1].date)}</span>
      </div>
    </div>
  )
}
