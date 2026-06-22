import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

/**
 * "Services available in <Suburb>" section, shared by every suburb
 * service-area page. Replaces the earlier centred-heading + "·"-separated
 * link-paragraph layout with a clean three-card grid that matches the
 * card language used elsewhere on the page (Why Sano, property types).
 *
 * The seven Sano services are grouped into three canonical groups exported
 * below. Each page passes the groups in its own ORDER (residential-led
 * pages lead with Home cleaning; commercial-aware pages lead with Property
 * and workplace) plus its own `lead` line and `suburb` name. The suburb
 * name is emphasised in sage-500, matching the green used on the heading
 * and the intro "Cleaning across <Suburb>" heading.
 *
 * Cards lay out with flex + justify-center so an incomplete final row
 * (e.g. a sole trailing card) stays centred rather than left-aligned.
 */

export interface ServiceLink {
  label: string
  href: string
}

export interface ServiceGroup {
  title: string
  links: ServiceLink[]
}

// Canonical service groups — single source of truth for the link sets.
// Pages choose the ORDER; the link contents never vary by suburb.
export const HOME_CLEANING_GROUP: ServiceGroup = {
  title: 'Home cleaning',
  links: [
    { label: 'Regular house cleaning', href: '/services/regular-cleaning' },
    { label: 'Deep cleaning', href: '/services/deep-cleaning' },
    { label: 'End of tenancy cleaning', href: '/services/end-of-tenancy' },
  ],
}

export const PROPERTY_WORKPLACE_GROUP: ServiceGroup = {
  title: 'Property and workplace',
  links: [
    { label: 'Commercial and office cleaning', href: '/services/commercial-cleaning' },
    { label: 'Post-construction cleaning', href: '/services/post-construction' },
  ],
}

export const SPECIALIST_GROUP: ServiceGroup = {
  title: 'Specialist',
  links: [
    { label: 'Carpet and upholstery cleaning', href: '/services/carpet-upholstery' },
    { label: 'Window cleaning', href: '/services/window-cleaning' },
  ],
}

export interface SuburbServicesSectionProps {
  /** Suburb name, emphasised in sage-500 within the heading. */
  suburb: string
  /** Supporting line beneath the heading (per-page wording). */
  lead: string
  /** Service groups, in the order this page wants them rendered. */
  groups: ReadonlyArray<ServiceGroup>
}

export function SuburbServicesSection({ suburb, lead, groups }: SuburbServicesSectionProps) {
  return (
    <section className="section-padding bg-[#faf9f6] py-10 lg:py-12">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500">
            WHAT WE COVER
          </p>
          <h2
            className="mt-2 font-display font-bold text-sage-800"
            style={{
              fontSize: 'clamp(1.5rem, 2.25vw, 1.875rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
            }}
          >
            Services available in <span className="text-sage-500">{suburb}</span>
          </h2>
          <p className="mt-3 body-text">{lead}</p>
        </div>

        <div className="mt-8 flex flex-wrap justify-center gap-4 lg:gap-5">
          {groups.map((group) => (
            <div
              key={group.title}
              className="w-full rounded-2xl border border-sage-100 bg-white p-5 shadow-sm sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.834rem)]"
            >
              <h3 className="mb-3 border-b border-sage-100 pb-3 text-[1rem] font-semibold text-sage-800">
                {group.title}
              </h3>
              <ul className="space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="flex items-center gap-2 text-[0.9375rem] font-semibold text-sage-500 transition-colors hover:text-sage-700"
                    >
                      <ChevronRight
                        size={15}
                        strokeWidth={2.5}
                        className="flex-shrink-0 opacity-80"
                        aria-hidden="true"
                      />
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
