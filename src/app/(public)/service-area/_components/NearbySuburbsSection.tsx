import Link from 'next/link'
import { MapPin } from 'lucide-react'

/**
 * "Other areas we clean nearby" internal-link block, shown on suburb pages
 * that have at least a few live siblings in the same part of Auckland (the
 * Central cluster). Each page passes its 2–3 geographically-nearest sibling
 * suburb pages; the section renders them as pill links.
 *
 * Purpose is internal linking: it spreads ranking signal across the related
 * suburb pages, helps search engines treat them as a local set, and lets a
 * visitor who is actually in a neighbouring suburb jump to the right page.
 *
 * Only mounted where the nearby pages genuinely exist and are genuinely near
 * (per the rollout plan's "retrofit once ≥3 regional siblings are live"
 * rule) — isolated pages (e.g. the only page in a region) omit it.
 */

export interface NearbySuburb {
  name: string
  href: string
}

export interface NearbySuburbsSectionProps {
  suburbs: ReadonlyArray<NearbySuburb>
}

export function NearbySuburbsSection({ suburbs }: NearbySuburbsSectionProps) {
  if (suburbs.length === 0) return null
  return (
    <section className="section-padding bg-white py-10 lg:py-12">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500">
            NEARBY AREAS
          </p>
          <h2
            className="mt-2 font-display font-bold text-sage-800"
            style={{
              fontSize: 'clamp(1.5rem, 2.25vw, 1.875rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
            }}
          >
            Other areas we clean nearby
          </h2>
          <p className="mt-3 body-text">
            Sano covers homes and workplaces right across central Auckland. Take a look at cleaning in a nearby suburb.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          {suburbs.map((suburb) => (
            <Link
              key={suburb.href}
              href={suburb.href}
              className="inline-flex items-center gap-2 rounded-full border border-sage-100 bg-[#faf9f6] px-5 py-2.5 text-[0.9375rem] font-semibold text-sage-700 transition-all duration-200 hover:scale-[1.05] hover:shadow-sm hover:border-sage-300 hover:text-sage-800"
            >
              <MapPin size={15} className="flex-shrink-0 text-sage-500" aria-hidden="true" />
              {suburb.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
