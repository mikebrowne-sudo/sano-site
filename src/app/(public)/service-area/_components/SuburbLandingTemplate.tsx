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
import { SuburbFaqAccordion } from './SuburbFaqAccordion'
import { SERVICE_AREAS, getAreasByRegion, hasSuburbPage } from '@/lib/service-areas'

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
  /**
   * Registry name for the SERVICE_AREAS lookup when the display name
   * differs (e.g. macrons: display "Te Atatū Peninsula" vs registry
   * "Te Atatu Peninsula"). Defaults to `suburb`.
   */
  areaName?: string
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
  // Real, per-suburb facts pulled from the coverage data — no invented
  // detail. Feeds a specific `areaServed` (postcode + region) in the
  // schema and a unique "areas we cover" block, so each page carries
  // genuinely distinct local signal instead of near-duplicate boilerplate.
  const areaName = data.areaName ?? data.suburb
  const area = SERVICE_AREAS.find((a) => a.suburb === areaName)
  const region = area?.region ?? null
  const postcode = area?.postcodes?.[0] ?? null
  const nearbyLocalities = region
    ? getAreasByRegion(region).filter((a) => a.suburb !== areaName).slice(0, 8)
    : []

  const areaServedSchema = region
    ? {
        '@type': 'Place',
        name: `${data.suburb}, Auckland`,
        ...(postcode
          ? {
              address: {
                '@type': 'PostalAddress',
                addressLocality: data.suburb,
                addressRegion: 'Auckland',
                postalCode: postcode,
                addressCountry: 'NZ',
              },
            }
          : {}),
      }
    : { '@type': 'City', name: 'Auckland' }

  // Per-suburb FAQ. Questions are broad (service + logistics + trust), so
  // no page implies Sano only does one thing — the first answer lists the
  // full range on purpose. The coverage answer carries the real, unique
  // localities for this suburb (and doubles as internal links in the
  // visible copy). `a` is the plain-text answer used for FAQPage schema;
  // `aNode` is the richer visible version. Both must match for valid
  // rich results, so aNode is only a link-decorated form of the same text.
  const localityText = nearbyLocalities.map((a) => a.suburb).join(', ')
  const faqs: { q: string; a: string; aNode?: ReactNode }[] = [
    {
      q: `What cleaning services does Sano offer in ${data.suburb}?`,
      a: `The full range: regular weekly or fortnightly cleaning, one-off and deep cleans, end-of-tenancy resets, commercial and office cleaning, plus carpet, upholstery, window, and post-construction cleaning. We scope each job to the property and the situation.`,
    },
    {
      q: `How soon can you start in ${data.suburb}?`,
      a: `Once we've confirmed the details and sent a quote, we book a time that suits you. Send through your property details and the service you need, and we'll come back quickly with availability.`,
    },
    {
      q: `Do your cleaners bring their own equipment and products?`,
      a: `Yes. Our cleaners arrive fully equipped with the products and gear for the job, unless you'd prefer we use something specific in your home or workplace.`,
    },
    {
      q: `Are Sano cleaners insured and vetted?`,
      a: `Yes. Every Sano cleaner is background-checked, trained, and fully insured, and we stand behind our work with a satisfaction guarantee.`,
    },
    ...(region && nearbyLocalities.length > 0
      ? [
          {
            q: `Which areas around ${data.suburb} do you cover?`,
            a: `As well as ${data.suburb}, Sano cleans nearby ${region} areas including ${localityText}. Not sure if we reach you? Check your suburb or get in touch for a free quote.`,
            aNode: (
              <>
                As well as {data.suburb}, Sano cleans nearby {region} areas including{' '}
                {nearbyLocalities.map((a, i) => (
                  <span key={a.slug}>
                    {i > 0 && ', '}
                    {hasSuburbPage(a.slug) ? (
                      <Link href={`/service-area/${a.slug}`} className="text-sage-600 underline-offset-2 hover:underline">
                        {a.suburb}
                      </Link>
                    ) : (
                      a.suburb
                    )}
                  </span>
                ))}
                . Not sure if we reach you?{' '}
                <Link href="/service-area" className="text-sage-600 font-medium underline-offset-2 hover:underline">
                  Check your suburb
                </Link>{' '}
                or get in touch for a free quote.
              </>
            ),
          },
        ]
      : []),
  ]

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

      <section className="section-padding bg-white py-8 lg:py-10">
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

      {/* Dark variant + faint background texture: gives the page a colour
          break between the long light sections. The image sits behind the
          band only — card fills are opaque by design. */}
      <WhatWeCoverSection
        eyebrow="HOW WE APPROACH IT"
        heading="Cleaning needs vary by property type"
        headingHighlight="property type"
        subtitle="A short note on what we typically focus on for each kind of property."
        items={[...data.cover]}
        variant="dark"
        backgroundImage={data.heroImage}
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
            areaServed: areaServedSchema,
          }),
        }}
      />

      {data.nearby.length > 0 && <NearbySuburbsSection suburbs={[...data.nearby]} />}

      {/* Suburb FAQ — broad service/logistics questions (never
          market-narrowing) plus a unique local-coverage answer. Rendered
          visibly AND mirrored in FAQPage schema for rich results. The
          accordion collapses answers via CSS grid-rows so the full text
          stays in the DOM — schema and visible content keep matching. */}
      <section className="section-padding bg-white py-8 lg:py-10 border-t border-sage-100">
        <div className="container-max max-w-3xl">
          <h2 className="mb-6">Common questions about cleaning in {data.suburb}</h2>
          <SuburbFaqAccordion items={faqs.map((f) => ({ q: f.q, body: f.aNode ?? f.a }))} />
        </div>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: faqs.map((f) => ({
              '@type': 'Question',
              name: f.q,
              acceptedAnswer: { '@type': 'Answer', text: f.a },
            })),
          }),
        }}
      />

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
