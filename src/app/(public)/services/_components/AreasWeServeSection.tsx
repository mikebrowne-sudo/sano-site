import Link from 'next/link'
import { MapPin } from 'lucide-react'
import { SERVICE_AREAS, hasSuburbPage } from '@/lib/service-areas'

/**
 * Compact "areas we serve" band for service pages. Links out to the
 * suburb landing pages (spreading internal link equity to them) and to
 * the service-area hub. Only suburbs with a real page are linked; the
 * hub covers the full 80+ list.
 */

// Suburbs that have a dedicated landing page, in data order.
const LINKED_SUBURBS = SERVICE_AREAS.filter((a) => hasSuburbPage(a.slug))

export function AreasWeServeSection() {
  return (
    <section className="section-padding bg-[#faf9f6] py-10 lg:py-12">
      <div className="container-max">
        <div className="flex items-center gap-2 mb-3">
          <MapPin size={16} className="text-sage-500" />
          <h2 className="text-lg font-semibold text-sage-800">Cleaning across Auckland</h2>
        </div>
        <p className="body-text max-w-2xl mb-6">
          We cover homes and businesses right across Auckland — Central, North Shore, East, South,
          and West. Explore some of the suburbs we clean, or check your own.
        </p>
        <ul className="flex flex-wrap gap-2">
          {LINKED_SUBURBS.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/service-area/${a.slug}`}
                className="inline-flex rounded-full border border-sage-200 bg-white px-3.5 py-1.5 text-sm font-medium text-sage-700 hover:border-sage-300 hover:text-sage-900 transition-colors"
              >
                {a.suburb}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/service-area"
              className="inline-flex rounded-full bg-sage-600 px-3.5 py-1.5 text-sm font-semibold text-white hover:bg-sage-700 transition-colors"
            >
              See all areas we serve →
            </Link>
          </li>
        </ul>
      </div>
    </section>
  )
}
