import type { Metadata } from 'next'
import { SuburbChecker } from '@/components/SuburbChecker'
import { CtaBanner } from '@/components/CtaBanner'
import { QuoteButton } from '@/components/QuoteButton'
import {
  SERVICE_AREAS,
  REGIONS,
  COVERAGE_BOUNDS,
  getAreasByRegion,
} from '@/lib/service-areas'
import type { ServiceArea } from '@/lib/service-areas'

export const metadata: Metadata = {
  title: 'Service Areas | Sano Cleaning Auckland',
  description:
    'Sano Cleaning services 80+ suburbs across Auckland — Central, North Shore, East, South, and West Auckland. Check your suburb or postcode.',
}

// ─── Coverage boundary display ────────────────────────────────────────────────
const BOUNDS = [
  { label: 'North', place: COVERAGE_BOUNDS.north },
  { label: 'East',  place: COVERAGE_BOUNDS.east  },
  { label: 'South', place: COVERAGE_BOUNDS.south },
  { label: 'West',  place: COVERAGE_BOUNDS.west  },
]

// ─── Region metadata ──────────────────────────────────────────────────────────
const REGION_INFO: Record<string, { description: string; icon: React.ReactNode }> = {
  'Central Auckland': {
    description: 'CBD fringe, Ponsonby, Grey Lynn, Parnell, Newmarket, and surrounding inner suburbs.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V7l9-4 9 4v14M9 21V11h6v10" />
      </svg>
    ),
  },
  'North Shore': {
    description: 'Takapuna, Devonport, Albany, and all northern suburbs up to Redvale.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-4 4m4-4l4 4" />
      </svg>
    ),
  },
  'East Auckland': {
    description: 'Remuera, Mission Bay, Howick, Pakuranga, and eastern suburbs out to Whitford.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-4-4m4 4l-4 4" />
      </svg>
    ),
  },
  'South Auckland': {
    description: 'Onehunga, Ellerslie, Manukau, and southern suburbs down to Papakura.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  'West Auckland': {
    description: 'Avondale, Henderson, New Lynn, Titirangi, and western suburbs out to Kumeu.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l4-4M5 12l4 4" />
      </svg>
    ),
  },
}

// ─── Why local section ────────────────────────────────────────────────────────
const LOCAL_BENEFITS = [
  {
    title: 'Reliable scheduling',
    body: 'Short travel times mean we can offer consistent slots and show up when we say we will.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Easy communication',
    body: "We're local. No call centres or delays — just a direct message or call and we'll sort it.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
      </svg>
    ),
  },
  {
    title: 'Knowledge of local homes',
    body: 'Auckland homes vary a lot. We know the styles and materials common across the suburbs we service.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
]

// ─── Suburb tag ───────────────────────────────────────────────────────────────
// When suburb-specific pages are ready:
//   1. Create src/app/service-area/[slug]/page.tsx
//   2. Replace the <span> wrapper below with:
//      <Link href={`/service-area/${area.slug}`} className="...">
function SuburbTag({ area }: { area: ServiceArea }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-sage-200 text-sage-800 text-[13px] shadow-[0_1px_3px_rgba(52,76,61,0.05)] hover:border-sage-300 hover:shadow-[0_2px_6px_rgba(52,76,61,0.08)] transition-all cursor-default">
      {area.suburb}
      <span className="text-sage-400 text-[11px] font-medium">{area.postcodes[0]}</span>
    </span>
  )
}

const totalSuburbs = SERVICE_AREAS.filter((a) => a.active).length

export default function ServiceAreaPage() {
  return (
    <>
      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="section-padding pt-14 pb-12 md:pt-20 md:pb-16 bg-gradient-to-b from-sage-50 to-white">
        <div className="container-max max-w-2xl mx-auto text-center">
          <p className="eyebrow mb-4">Auckland Coverage</p>
          <h1 className="text-sage-800 mb-4">Service Areas</h1>
          <p className="body-text max-w-lg mx-auto mb-8">
            Check if we service your suburb and explore the areas we cover across Auckland.
          </p>

          {/* Coverage boundary bar */}
          <div className="inline-flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10 text-[13px] text-gray-500">
            {BOUNDS.map(({ label, place }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className="font-semibold text-sage-600 text-[11px] uppercase tracking-wide">
                  {label}
                </span>
                <span>to {place}</span>
              </span>
            ))}
          </div>

          {/* Checker — the main utility of this page */}
          <div className="bg-white rounded-2xl border border-sage-200 shadow-sm p-6 md:p-8">
            <p className="text-sm font-semibold text-sage-800 mb-4">
              Check your suburb or postcode
            </p>
            <SuburbChecker />
          </div>

          <p className="mt-5 text-xs text-gray-400">
            Servicing{' '}
            <span className="font-semibold text-sage-600">{totalSuburbs} suburbs</span> across
            Auckland
          </p>
        </div>
      </section>

      {/* ── Coverage overview ────────────────────────────────────────────── */}
      <section className="section-padding py-10 md:py-14 bg-white">
        <div className="container-max">
          <div className="text-center mb-8">
            <h2 className="text-sage-800 mb-3">Cleaning services across Auckland</h2>
            <p className="body-text max-w-xl mx-auto">
              We cover a wide range of suburbs for residential and commercial cleaning — and we&apos;re
              still growing.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {REGIONS.map((region) => {
              const areas = getAreasByRegion(region)
              const info = REGION_INFO[region]
              const preview = areas.slice(0, 3).map((a) => a.suburb)
              return (
                <div
                  key={region}
                  className="flex flex-col gap-4 rounded-2xl border border-sage-200 bg-sage-50 p-5 shadow-[0_1px_4px_rgba(52,76,61,0.05)]"
                >
                  <div className="w-9 h-9 rounded-xl bg-sage-700 text-white flex items-center justify-center shrink-0">
                    {info.icon}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sage-800 text-[14px] leading-snug mb-1.5">
                      {region}
                    </p>
                    <p className="text-gray-500 text-[12px] leading-relaxed">{info.description}</p>
                  </div>
                  <div className="border-t border-sage-100 pt-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1">
                      {areas.length} suburbs
                    </p>
                    <p className="text-[12px] text-gray-400 leading-relaxed">
                      {preview.join(', ')}
                      {areas.length > 3 && (
                        <span className="text-sage-400"> +{areas.length - 3} more</span>
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Browse by suburb ─────────────────────────────────────────────── */}
      <section className="section-padding py-10 md:py-14 bg-sage-50">
        <div className="container-max">
          <div className="text-center mb-10">
            <h2 className="text-sage-800 mb-3">Browse our service areas</h2>
            <p className="body-text max-w-lg mx-auto">
              All suburbs we currently service, grouped by region. More areas are added as we grow.
            </p>
          </div>

          <div className="space-y-10">
            {REGIONS.map((region) => {
              const areas = getAreasByRegion(region)
              return (
                <div key={region}>
                  {/* Region heading row */}
                  <div className="flex items-baseline gap-3 mb-4">
                    <h3 className="text-sage-800 font-semibold text-base">{region}</h3>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-sage-400">
                      {areas.length} areas
                    </span>
                    <span className="flex-1 border-b border-sage-200" aria-hidden="true" />
                  </div>

                  {/* Suburb tags */}
                  <div className="flex flex-wrap gap-2">
                    {areas.map((area) => (
                      <SuburbTag key={area.slug} area={area} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Why local matters ────────────────────────────────────────────── */}
      <section className="section-padding py-10 md:py-14 bg-white">
        <div className="container-max">
          <div className="text-center mb-8">
            <h2 className="text-sage-800 mb-3">Why choose a local cleaner</h2>
            <p className="body-text max-w-md mx-auto">
              Staying local means we can look after you better, not just show up and clean.
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {LOCAL_BENEFITS.map((item) => (
              <li
                key={item.title}
                className="rounded-2xl border border-sage-200 bg-white p-5 shadow-[0_1px_4px_rgba(52,76,61,0.05)]"
              >
                <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center mb-4">
                  {item.icon}
                </div>
                <h3 className="text-sage-800 text-[14px] font-semibold mb-1.5">{item.title}</h3>
                <p className="text-gray-500 text-[13px] leading-relaxed">{item.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing CTA ──────────────────────────────────────────────────── */}
      <section className="section-padding py-14 md:py-16 bg-gradient-to-br from-sage-800 to-sage-700 text-center">
        <div className="container-max max-w-xl mx-auto">
          <h2 className="text-white mb-4">Get a quote in your area</h2>
          <p className="text-white/80 text-[1.0625rem] leading-[1.75] mb-8">
            If we service your suburb, we&apos;d be happy to put together a tailored quote for your
            home or business.
          </p>
          <div className="flex flex-wrap gap-3 justify-center">
            <QuoteButton variant="white" label="Get a Free Quote" />
            <QuoteButton variant="ghost" label="Contact Us" href="/contact" />
          </div>
        </div>
      </section>

      <CtaBanner />
    </>
  )
}
