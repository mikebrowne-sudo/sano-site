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
 * Henderson service-area page — Stage 3, first West Auckland page.
 * Commercial-aware (per Sano's commercial growth direction): Henderson is a
 * major West Auckland centre with a large retail core, offices, and
 * light-industrial workplaces, so the hero names workplaces, the services
 * grouping leads with Property and workplace, and one of the four cards
 * covers offices / commercial spaces. Residential stays the majority
 * (three of four cards).
 *
 * Traps held: no affordability / demographic / "growing area" /
 * "family-focused community" framing (West Auckland sensitivity, same as
 * South); no industrial-specialism claims; no "careful" lead; no
 * landmark-as-proof. Built on the shared system. NO nearby-suburb links —
 * first West Auckland page, no regional siblings yet.
 */

export const metadata: Metadata = {
  title: 'Henderson Cleaning Services | Sano',
  description:
    'Cleaning for Henderson homes, rentals, and workplaces: regular upkeep, deep cleans, end of tenancy, office and commercial cleaning, and specialist surfaces.',
}

export default function HendersonServiceAreaPage() {
  return (
    <>
      <SubpageHero
        eyebrow="Henderson cleaning services"
        title="Professional cleaning for Henderson homes, rentals, and businesses."
        subtitle="Sano cleans homes, rentals, and business premises across Henderson, from regular upkeep and end-of-tenancy resets to keeping offices and commercial spaces looking right."
        imageSrc="/images/heroes/commercial-office-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">
                Cleaning across <span className="text-sage-500">Henderson</span>
              </h2>
              <div className="body-text space-y-4">
                <p>
                  Henderson is one of West Auckland&apos;s main centres, so it brings together family homes, townhouses, units, and rentals with a large retail core, offices, and a range of workplaces. Cleaning needs run right across that range, from regular home upkeep to workplace presentation, deeper resets, and move-related cleans.
                </p>
                <p>
                  In a centre this size the clean often has to fit around staff, customers, and trading hours, so Sano agrees the scope upfront, books around the building, and focuses on what each home, rental, or workplace actually needs.
                </p>
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src="/images/sano-commercial-clean-auckland.jpeg"
                alt="Sano commercial and home cleaning across West Auckland"
                fill
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 45vw"
              />
            </div>
          </div>
        </div>
      </section>

      <WhyChooseSection
        heading="Why choose Sano"
        subtitle="What to expect from Sano on any clean, regardless of the property or the reason."
        items={SUBURB_WHY_SANO_ITEMS}
      />

      <SuburbServicesSection
        suburb="Henderson"
        lead="Whether it is a workplace that needs to stay presentable or a home that needs regular upkeep, the full range of Sano services is available across Henderson. Pick a service to read its full scope."
        groups={[PROPERTY_WORKPLACE_GROUP, HOME_CLEANING_GROUP, SPECIALIST_GROUP]}
      />

      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[
          {
            title: 'Family homes',
            body: 'Standalone family homes where regular upkeep across living areas, kitchens, and bathrooms keeps a busy household running without the cleaning piling up.',
            icon: Home,
          },
          {
            title: 'Townhouses and units',
            body: 'Townhouses and units where stairs, compact layouts, and shared access shape the clean, so it is planned to suit how the property is built and used.',
            icon: Building2,
          },
          {
            title: 'Offices and commercial spaces',
            body: 'Offices, retail units, and customer-facing spaces across Henderson’s retail and commercial core, cleaned to a presentation standard and scheduled around trading hours.',
            icon: Briefcase,
          },
          {
            title: 'Rentals and move cleans',
            body: 'Handover and end-of-tenancy cleans across the area’s units, townhouses, and rentals, booked to the turnover and scoped around what a property manager signs off.',
            icon: KeyRound,
          },
        ]}
      />

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

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Henderson Cleaning Services',
            description:
              'Cleaning services across Henderson: regular, deep, end of tenancy, commercial and office, post-construction, carpet, and window.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      <CtaBanner
        headline="Ready to book your clean?"
        subtext="Send through the property details and the service you need. We will come back with a clear, practical quote."
      />

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
