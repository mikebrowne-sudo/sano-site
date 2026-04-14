import type { Metadata } from 'next'
import { SuburbChecker } from '@/components/SuburbChecker'
import { CtaBanner } from '@/components/CtaBanner'
import { QuoteButton } from '@/components/QuoteButton'
import { SERVICE_AREAS, REGIONS, getAreasByRegion } from '@/lib/service-areas'

export const metadata: Metadata = {
  title: 'Service Areas | Sano Cleaning Auckland',
  description:
    'Check if Sano Cleaning services your Auckland suburb. We cover Central Auckland, North Shore, East Auckland, South Auckland, and West Auckland.',
}

// ─── Region icon map ──────────────────────────────────────────────────────────
const REGION_META: Record<string, { icon: React.ReactNode; description: string }> = {
  'Central Auckland': {
    description: 'CBD fringe, inner suburbs, and surrounding areas.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 21V7l9-4 9 4v14M9 21V11h6v10" />
      </svg>
    ),
  },
  'North Shore': {
    description: 'Takapuna, Devonport, and surrounding northern suburbs.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5m0 0l-4 4m4-4l4 4" />
      </svg>
    ),
  },
  'East Auckland': {
    description: 'Howick, Pakuranga, Botany, and eastern suburbs.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m0 0l-4-4m4 4l-4 4" />
      </svg>
    ),
  },
  'South Auckland': {
    description: 'Onehunga, Manukau, and southern suburbs.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m0 0l4-4m-4 4l-4-4" />
      </svg>
    ),
  },
  'West Auckland': {
    description: 'Henderson, New Lynn, Te Atatu, and western areas.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 12H5m0 0l4-4M5 12l4 4" />
      </svg>
    ),
  },
}

// ─── Why local matters ────────────────────────────────────────────────────────
const LOCAL_POINTS = [
  {
    title: 'Reliable scheduling',
    body: 'Shorter travel times mean we can fit you in more easily and keep consistent booking slots.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: 'Straightforward communication',
    body: "We're local, so reaching us is easy. No call centres, no delays — just a quick message or call.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
      </svg>
    ),
  },
  {
    title: 'Familiarity with local homes',
    body: 'Every area has its own housing styles and common needs. We know what to look for in the homes we service.',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    title: 'Part of the community',
    body: "We're based in Auckland and genuinely invested in doing a good job for the people around us.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
]

const totalSuburbs = SERVICE_AREAS.filter((a) => a.active).length

// ─── Suburb tag — swap <span> for <Link href={...}> when suburb pages exist ──
// To enable suburb pages:
//   1. Create src/app/service-area/[slug]/page.tsx
//   2. Replace the <span> below with:
//      <Link href={`/service-area/${area.slug}`} ...>
function SuburbTag({ area }: { area: ReturnType<typeof getAreasByRegion>[0] }) {
  return (
    <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-white border border-sage-200 text-sage-800 text-[13px] font-medium shadow-[0_1px_3px_rgba(52,76,61,0.06)] hover:border-sage-300 hover:shadow-[0_2px_6px_rgba(52,76,61,0.09)] transition-all cursor-default">
      {area.suburb}
    </span>
  )
}

export default function ServiceAreaPage() {
  return (
    <>
      {/* ── Hero ── */}
      <section className="section-padding py-14 md:py-20 bg-gradient-to-b from-sage-50 to-white">
        <div className="container-max max-w-2xl mx-auto text-center">
          <p className="eyebrow mb-4">Auckland Coverage</p>
          <h1 className="text-sage-800 mb-4">Service Areas</h1>
          <p className="body-text mb-10 max-w-lg mx-auto">
            Check if we service your suburb and explore the areas we cover across Auckland.
          </p>

          {/* ── Suburb checker ── */}
          <SuburbChecker />

          <p className="mt-5 text-xs text-gray-400">
            Currently servicing{' '}
            <span className="font-semibold text-sage-600">{totalSuburbs} suburbs</span> across
            Auckland
          </p>
        </div>
      </section>

      {/* ── Coverage overview ── */}
      <section className="section-padding py-10 md:py-14 bg-white">
        <div className="container-max">
          <div className="text-center mb-8">
            <h2 className="text-sage-800 mb-3">Cleaning services across Auckland</h2>
            <p className="body-text max-w-xl mx-auto">
              We service a growing range of suburbs across Auckland for residential and commercial
              cleaning.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {REGIONS.map((region) => {
              const areas = getAreasByRegion(region)
              const meta = REGION_META[region]
              const preview = areas.slice(0, 3)
              return (
                <div
                  key={region}
                  className="rounded-2xl border border-sage-200 bg-sage-50 p-5 flex flex-col gap-3 shadow-[0_1px_4px_rgba(52,76,61,0.06)]"
                >
                  <div className="w-9 h-9 rounded-xl bg-sage-700 text-white flex items-center justify-center shrink-0">
                    {meta.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-sage-800 text-[14px] leading-snug mb-1">
                      {region}
                    </p>
                    <p className="text-gray-500 text-[12px] leading-relaxed">{meta.description}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-sage-500 mb-1.5">
                      {areas.length} suburbs
                    </p>
                    <p className="text-[12px] text-gray-400">
                      {preview.map((a) => a.suburb).join(', ')}
                      {areas.length > 3 && ` +${areas.length - 3} more`}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* ── Browse by suburb ── */}
      <section className="section-padding py-10 md:py-14 bg-sage-50">
        <div className="container-max">
          <div className="text-center mb-10">
            <h2 className="text-sage-800 mb-3">Browse our service areas</h2>
            <p className="body-text max-w-xl mx-auto">
              All suburbs we currently service across Auckland. More are being added regularly.
            </p>
          </div>

          <div className="space-y-10">
            {REGIONS.map((region) => {
              const areas = getAreasByRegion(region)
              return (
                <div key={region}>
                  {/* Region heading */}
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sage-800 text-[15px] font-semibold">{region}</h3>
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-sage-400 mt-0.5">
                      {areas.length} areas
                    </span>
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

      {/* ── Why local matters ── */}
      <section className="section-padding py-10 md:py-14 bg-white">
        <div className="container-max">
          <div className="text-center mb-8">
            <h2 className="text-sage-800 mb-3">Why local matters</h2>
            <p className="body-text max-w-md mx-auto">
              Choosing a local cleaning service makes a real difference to what you get.
            </p>
          </div>

          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {LOCAL_POINTS.map((point) => (
              <li
                key={point.title}
                className="rounded-2xl border border-sage-200 bg-white p-5 shadow-[0_1px_4px_rgba(52,76,61,0.05)]"
              >
                <div className="w-9 h-9 rounded-xl bg-sage-100 text-sage-700 flex items-center justify-center mb-4">
                  {point.icon}
                </div>
                <h3 className="text-sage-800 text-[14px] font-semibold mb-1.5">{point.title}</h3>
                <p className="text-gray-500 text-[13px] leading-relaxed">{point.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Closing CTA ── */}
      <section className="section-padding py-14 md:py-16 bg-gradient-to-br from-sage-800 to-sage-700 text-center">
        <div className="container-max max-w-xl mx-auto">
          <h2 className="text-white mb-4">Need cleaning in your area?</h2>
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
