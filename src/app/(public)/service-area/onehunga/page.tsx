import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { Briefcase, Building2, Home, KeyRound } from 'lucide-react'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../../services/_components/BookingStepsSection'
import { WhatWeCoverSection } from '../../services/_components/WhatWeCoverSection'
import { WhyChooseSection } from '../../services/_components/WhyChooseSection'
import { SUBURB_WHY_SANO_ITEMS } from '@/lib/suburb-why-sano'
import {
  SuburbServicesSection,
  HOME_CLEANING_GROUP,
  PROPERTY_WORKPLACE_GROUP,
  SPECIALIST_GROUP,
} from '../_components/SuburbServicesSection'

/**
 * Onehunga service-area page — first Stage 3 page and the second South
 * Auckland page (after Manukau).
 *
 * Commercial-aware lean (Mike, 2026-06-22): Onehunga has a genuine working
 * town centre, so this page surfaces commercial more than the Central
 * residential pages — the hero names workplaces, the services grouping
 * leads with Property and workplace, and one property-type card covers
 * offices / town-centre workplaces. Residential stays the majority (three
 * of the four cards), reflecting the ~80/20 split. See the commercial
 * growth direction in memory.
 *
 * Built on the shared system: SUBURB_WHY_SANO_ITEMS + SuburbServicesSection
 * card grid + green intro suburb name. Content logic is "local situation
 * first, then outcome"; copy is worded distinctly from the sibling pages.
 *
 * Traps held (Mike-confirmed): no "careful" lead; no affordability /
 * demographic / "growing area" framing (South Auckland sensitivity per the
 * rollout plan); no port / industrial-specialism claims; no prestige or
 * villa-heritage-value framing (villas named only as a property type);
 * no landmark-as-proof.
 *
 * Locks: Auckland-level City areaServed; SuburbChecker not mounted; closing
 * trust strip = Check another suburb · Our guarantee · FAQ. NO nearby-suburb
 * links — Manukau is the only other South page, below the >=3-sibling
 * retrofit threshold.
 */

export const metadata: Metadata = {
  title: 'Onehunga Cleaning Services | Sano',
  description:
    'Cleaning for Onehunga homes, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, office and town-centre cleaning, and specialist surfaces.',
}

export default function OnehungaServiceAreaPage() {
  return (
    <>
      {/* Hero — commercial-aware: surfaces homes, rentals AND workplaces.
          Commercial-flavoured hero image to match the lead. */}
      <SubpageHero
        eyebrow="Onehunga cleaning services"
        title="Professional cleaning for Onehunga homes, rentals, and workplaces."
        subtitle="From regular upkeep and office presentation to deeper resets and end-of-tenancy cleans, Sano matches the scope to the property and the reason for the clean."
        imageSrc="/images/heroes/commercial-office-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Intro / local property context — single-image variant. Two
          paragraphs: property-and-need angle first (town-centre mix),
          how-Sano-approaches-it second. */}
      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">
                Cleaning across <span className="text-sage-500">Onehunga</span>
              </h2>
              <div className="body-text space-y-4">
                <p>
                  Sano provides regular, deep, commercial, and move-related cleaning across Onehunga, covering offices, retail and workplaces alongside character homes, townhouses, apartments, and rentals. The work runs from ongoing upkeep to deeper cleans, handovers, and workplace presentation.
                </p>
                <p>
                  We talk it through before the first clean, plan around access and trading hours where it matters, and leave each home or workplace clean, presentable, and properly looked after.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/sano-commercial-clean-auckland.jpeg"
                alt="Sano cleaning across Auckland homes and workplaces"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* 2. Why Sano — shared constant (suburb-agnostic). */}
      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={SUBURB_WHY_SANO_ITEMS}
      />

      {/* 3. Services available in Onehunga — shared card grid. Commercial-
          aware order: Property and workplace LEADS, then Home cleaning, then
          Specialist. */}
      <SuburbServicesSection
        suburb="Onehunga"
        lead="From office and workplace presentation to regular home cleaning, deeper resets, and specialist surfaces, the full range of Sano services is available across Onehunga. Pick a service to read its full scope."
        groups={[PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP]}
      />

      {/* 4. Cleaning needs vary by property type — four cards for Onehunga's
          mix. Three residential + one commercial (offices / town-centre
          workplaces), reflecting the commercial-aware lean while residential
          stays the majority. Situation + outcome wording; no "careful" lead. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Character and villa homes',
            body: 'Older villas and character homes where original joinery, timber floors, and detailed surfaces take an unhurried clean that works through each room rather than rushing it.',
            icon: Home,
          },
          {
            title: 'Townhouses and apartments',
            body: 'Town-centre townhouses and apartments often come with shared entrances, limited parking, and set building hours, so the clean is booked and planned to work in with the building.',
            icon: Building2,
          },
          {
            title: 'Offices and town-centre workplaces',
            body: 'Offices, retail, and customer-facing spaces around the town centre, cleaned for presentation and worked in around trading hours and the business day.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'End-of-tenancy and handover cleans timed to the vacancy window, with the scope agreed against what an owner or property manager checks, so nothing gets flagged at inspection.',
            icon: KeyRound,
          },
        ]}
      />

      {/* 5. How it works — generic three-step booking. */}
      <BookingStepsSection
        heading="Book your clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          {
            title: 'Send through details',
            body: 'Share the property details and the service you need.',
          },
          {
            title: 'We arrange a time',
            body: 'A clear quote and a time that fits your schedule.',
          },
          {
            title: 'Clean done properly',
            body: 'The team arrives prepared and works through the agreed scope.',
          },
        ]}
      />

      {/* Schema.org — Auckland-level City areaServed, no suburb-level Place. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Onehunga Cleaning Services',
            description:
              'Cleaning services across Onehunga: regular, deep, end of tenancy, commercial and office, post-construction, carpet, and window.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      {/* CTA — single quote action, no suburb mention. */}
      <CtaBanner
        headline="Ready to book your clean?"
        subtext="Send through the property details and the service you need. We will come back with a clear, practical quote."
      />

      {/* Closing trust strip — three text links (sibling lock). SuburbChecker
          omitted. NO nearby-suburb block — Manukau is the only other South
          page (below the retrofit threshold). */}
      <section className="bg-[#faf9f6] py-6 text-center">
        <p className="text-[0.875rem] text-sage-600">
          <Link
            href="/service-area"
            className="font-semibold text-sage-500 underline-offset-4 hover:underline"
          >
            Check another suburb
          </Link>
          {' · '}
          <Link
            href="/guarantee"
            className="font-semibold text-sage-500 underline-offset-4 hover:underline"
          >
            Our guarantee
          </Link>
          {' · '}
          <Link
            href="/faq"
            className="font-semibold text-sage-500 underline-offset-4 hover:underline"
          >
            FAQ
          </Link>
        </p>
      </section>
    </>
  )
}
