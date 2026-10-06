import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'
import { unstable_cache } from 'next/cache'
import { Users, TrendingUp, FileText, MapPin, Phone, Mail, Target, Globe, Smartphone, UserPlus, Search, Filter } from 'lucide-react'
import { getGa4Stats, isGa4Configured, type Ga4Stats } from '@/lib/ga4'
import { getGscData, isGscConfigured } from '@/lib/gsc'
import { analyseGsc, parseQueryFilter, type GscData } from '@/lib/seo-insights'
import { TrendChart } from './_components/TrendChart'
import { SearchSection } from './_components/SearchSection'
import { Card, CardHead, Kpi, ListCard, SectionHeading, n } from './_components/ui'

// Auth is per-request (cookies) so the page is dynamic; the GA4 / Search
// Console fetches are cached for an hour so we render fast and stay well
// within API quota. Query filters (?cat=, ?q=) are applied at render time
// over the cached data, so filtering costs no API calls.
export const dynamic = 'force-dynamic'

const getCachedStats = unstable_cache(getGa4Stats, ['ga4-stats-v2'], { revalidate: 3600 })
const getCachedGsc = unstable_cache(getGscData, ['gsc-data-v2'], { revalidate: 3600 })

export default async function AnalyticsPage({ searchParams }: { searchParams: { cat?: string | string[]; q?: string | string[] } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const filter = parseQueryFilter(searchParams?.cat)
  const rawSearch = Array.isArray(searchParams?.q) ? searchParams.q[0] : searchParams?.q
  const search = (rawSearch ?? '').trim().slice(0, 100)

  // Each source loads independently — one failing must not hide the other.
  const [ga, gsc] = await Promise.all([
    isGa4Configured()
      ? getCachedStats().then((stats) => ({ stats, error: null as string | null })).catch((e: unknown) => ({ stats: null, error: e instanceof Error ? e.message : 'Could not load analytics.' }))
      : Promise.resolve(null),
    isGscConfigured()
      ? getCachedGsc().then((data) => ({ data, error: null as string | null })).catch((e: unknown) => ({ data: null as GscData | null, error: e instanceof Error ? e.message : 'Could not load Search Console.' }))
      : Promise.resolve(null),
  ])

  return (
    <Shell>
      {/* ── Google Search ── */}
      <SectionHeading title="Organic search" sub="What Google is already showing Sano for, and where a little work could add traffic." />
      {!gsc ? (
        <GscSetupCard />
      ) : gsc.error || !gsc.data ? (
        <ErrorCard what="Search Console" message={gsc.error ?? 'No data returned.'} />
      ) : (
        <SearchSection data={gsc.data} analysis={analyseGsc(gsc.data)} filter={filter} search={search} />
      )}

      {/* ── Website traffic (GA4) ── */}
      <SectionHeading title="Website traffic" sub="Genuine public-website visits — internal pages and likely automated traffic are filtered out." />
      {!ga ? (
        <SetupState />
      ) : ga.error || !ga.stats ? (
        <ErrorCard what="website analytics" message={ga.error ?? 'No data returned.'} />
      ) : (
        <TrafficSection stats={ga.stats} />
      )}

      <p className="text-xs text-sage-400 pt-1">
        Website figures cover the last 30 days and Google Search the last 28 days (Search Console runs ~3 days behind), unless
        noted. Updated about hourly.
      </p>
    </Shell>
  )
}

function TrafficSection({ stats }: { stats: Ga4Stats }) {
  const filteredTotal = stats.filtered.internalSessions + stats.filtered.automatedSessions
  return (
    <>
      {/* Visitor KPIs */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Kpi icon={Users} label="Visitors today" value={stats.visitorsToday} />
        <Kpi icon={Users} label="Visitors" value={stats.visitors7d} note="Last 7 days" />
        <Kpi icon={Users} label="Visitors" value={stats.visitors30d} note="Last 30 days" />
      </section>

      {filteredTotal > 0 && (
        <p className="flex items-start gap-2 text-xs text-sage-500 -mt-1">
          <Filter size={13} className="mt-0.5 shrink-0 text-sage-400" />
          <span>
            Filtered traffic: {n(filteredTotal)} visit{filteredTotal === 1 ? '' : 's'} in the last 30 days
            ({n(stats.filtered.internalSessions)} on internal pages like quote/invoice share links, {n(stats.filtered.automatedSessions)} likely
            automated from overseas data centres). Raw data is kept in Google Analytics.
          </span>
        </p>
      )}

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
    </>
  )
}

/* ── Layout ─────────────────────────────────────────────────────── */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-5xl space-y-5">
      <header>
        <h1 className="text-2xl md:text-3xl tracking-tight font-bold text-sage-800">Website analytics</h1>
        <p className="text-sm text-sage-500 mt-1">Organic search opportunities, website visitors, leads and engagement.</p>
      </header>
      {children}
    </div>
  )
}

/* ── Setup / error states ───────────────────────────────────────── */

function GscSetupCard() {
  return (
    <Card className="bg-sage-50/60 border-sage-100">
      <div className="flex items-start gap-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-sage-200 text-sage-500 shrink-0"><Search size={18} /></span>
        <div className="text-sm">
          <p className="font-semibold text-sage-800 mb-1">See the search terms people find you with</p>
          <p className="text-sage-500">Connect Google Search Console to show your top search queries + average position here. It reuses the analytics service account — add it as a user in Search Console, enable the Search Console API, and set <span className="font-mono text-xs">GSC_SITE_URL</span> in Netlify.</p>
        </div>
      </div>
    </Card>
  )
}

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

function ErrorCard({ what, message }: { what: string; message: string }) {
  return (
    <Card className="border-amber-100 bg-amber-50/70">
      <p className="font-semibold text-amber-800 mb-2">Couldn’t load {what} right now.</p>
      <p className="font-mono text-xs bg-white/70 border border-amber-100 rounded-lg px-3 py-2 break-words text-amber-800">{message}</p>
      <p className="mt-3 text-sm text-amber-700">
        This is usually a temporary data or connection issue — try again shortly. If it persists, the message above will help
        us pin it down.
      </p>
    </Card>
  )
}
