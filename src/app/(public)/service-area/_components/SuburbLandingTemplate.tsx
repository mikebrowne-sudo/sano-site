import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CtaBanner } from '@/components/CtaBanner'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'
import { BookingStepsSection } from '../../services/_components/BookingStepsSection'
import { WhatWeCoverSection, type CoverItem } from '../../services/_components/WhatWeCoverSection'
import { WhyChooseSection } from '../../services/_components/WhyChooseSection'
import { SUBURB_WHY_SANO_ITEMS } from '@/lib/suburb-why-sano'
import { SuburbServicesSection, type ServiceGroup } from './SuburbServicesSection'
import { NearbySuburbsSection, type NearbySuburb } from './NearbySuburbsSection'

/**
 * Shared, data-driven suburb landing page. Renders the exact same section
 * order as the hand-built pilot pages (SubpageHero → intro → Why Sano →
 * services → what-we-cover → booking steps → Service schema → nearby →
 * CTA → footer links) so the second-wave suburb pages stay uniform with
 * the originals. Only the per-suburb content lives in `SuburbData`.
 *
 * Copy standard (locked): intros are service-led and natural, never
 * geography/research; property context only where useful; no
 * prestige/demographic/heritage framing; vary by details, not voice.
 */

export interface SuburbData {
  suburb: string
  /** Hero eyebrow. Default: "<Suburb> cleaning services". */
  heroEyebrow?: string
  heroTitle: string
  heroSubtitle: string
  /** Hero background image (an existing /images/heroes/* file). */
  heroImage: string
  /** Two intro paragraphs under the "Cleaning across <Suburb>" heading. */
  introParagraphs: readonly [string, string]
  /** Right-column intro image + alt (an existing /images/* file). */
  introImage: string
  introImageAlt: string
  /** Supporting line under the "Why choose Sano" heading. */
  whyChooseSubtitle?: string
  /** Services section lead sentence. */
  servicesLead: string
  /** Service groups in the order this suburb should present them. */
  serviceGroups: readonly ServiceGroup[]
  /** Four property-type "what we cover" cards. */
  cover: readonly CoverItem[]
  /** Service JSON-LD description. */
  schemaDescription: string
  /** Up to three nearby suburb links. */
  nearby: readonly NearbySuburb[]
  ctaHeadline?: string
  ctaSubtext?: string
}

function introHeading(suburb: string): ReactNode {
  return (
    <>
      Cleaning across <span className="text-sage-500">{suburb}</span>
    </>
  )
}

export function SuburbLandingTemplate({ data }: { data: SuburbData }) {
  return (
    <>
      <SubpageHero
        eyebrow={data.heroEyebrow ?? `${data.suburb} cleaning services`}
        title={data.heroTitle}
        subtitle={data.heroSubtitle}
        imageSrc={data.heroImage}
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      <section className="section-padding bg-white py-10 lg:py-12">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-10 items-start">
            <div>
              <h2 className="mb-5 border-b border-sage-100 pb-4">{introHeading(data.suburb)}</h2>
              <div className="body-text space-y-4">
                {data.introParagraphs.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>

            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl">
              <Image
                src={data.introImage}
                alt={data.introImageAlt}
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
        subtitle={data.whyChooseSubtitle ?? 'What to expect from Sano on any clean, regardless of the property or the reason.'}
        items={SUBURB_WHY_SANO_ITEMS}
      />

      <SuburbServicesSection
        suburb={data.suburb}
        lead={data.servicesLead}
        groups={[...data.serviceGroups]}
      />

      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[...data.cover]}
      />

      <BookingStepsSection
        heading="Book your clean in 3 simple steps"
        headingHighlight="3 simple steps"
        steps={[
          { title: 'Send through details', body: 'Share the property details and the service you need.' },
          { title: 'We arrange a time', body: 'A clear quote and a time that fits your schedule.' },
          { title: 'Clean done properly', body: 'The team arrives prepared and works through the agreed scope.' },
        ]}
      />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: `${data.suburb} Cleaning Services`,
            description: data.schemaDescription,
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />

      {data.nearby.length > 0 && <NearbySuburbsSection suburbs={[...data.nearby]} />}

      <CtaBanner
        headline={data.ctaHeadline ?? 'Ready to book your clean?'}
        subtext={
          data.ctaSubtext ??
          'Send through the property details and the service you need. We will come back with a clear, practical quote.'
        }
      />

      <section className="bg-[#faf9f6] py-6 text-center">
        <p className="text-[0.875rem] text-sage-600">
          <Link href="/service-area" className="font-semibold text-sage-500 underline-offset-4 hover:underline">
            Check another suburb
          </Link>
          {' · '}
          <Link href="/guarantee" className="font-semibold text-sage-500 underline-offset-4 hover:underline">
            Our guarantee
          </Link>
          {' · '}
          <Link href="/faq" className="font-semibold text-sage-500 underline-offset-4 hover:underline">
            FAQ
          </Link>
        </p>
      </section>
    </>
  )
}
