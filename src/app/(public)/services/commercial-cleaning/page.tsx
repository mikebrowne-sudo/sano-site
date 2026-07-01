import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { AreasWeServeSection } from '../_components/AreasWeServeSection'
import {
  BadgeCheck,
  Bath,
  Briefcase,
  CalendarClock,
  ChefHat,
  ClipboardCheck,
  PaintRoller,
  PanelTop,
  PlusCircle,
  ShieldCheck,
  Sofa,
  Store,
  Trash2,
  type LucideIcon,
} from 'lucide-react'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'

export const metadata: Metadata = {
  title: 'Commercial & Office Cleaning Auckland | Sano',
  description:
    'Reliable commercial and office cleaning in Auckland. Consistent, detail-focused cleaning that keeps your workplace presentable and easy to maintain. Free quote.',
}

interface FeatureCard {
  title: string
  body: string
  icon: LucideIcon
}

const WHY_CHOOSE_CARDS: ReadonlyArray<FeatureCard> = [
  {
    title: 'Insured and reliable',
    body: 'Fully insured cleaning teams who show up when they say they will.',
    icon: ShieldCheck,
  },
  {
    title: 'Site-specific cleaning plans',
    body: 'Built around your space, schedule, and the standards that matter to your business.',
    icon: ClipboardCheck,
  },
  {
    title: 'Flexible scheduling',
    body: 'After-hours, early morning, or scheduled around your operations.',
    icon: CalendarClock,
  },
  {
    title: 'Consistent standards',
    body: 'A steady team and clear systems, so the standard does not drift between visits.',
    icon: BadgeCheck,
  },
]

const WHAT_WE_COVER_CARDS: ReadonlyArray<FeatureCard> = [
  {
    title: 'Reception and common areas',
    body: 'Front-of-house spaces kept tidy and presentable for staff and visitors.',
    icon: Sofa,
  },
  {
    title: 'Kitchens and breakrooms',
    body: 'Benches, sinks, appliances and shared dining areas cleaned and reset.',
    icon: ChefHat,
  },
  {
    title: 'Bathrooms and amenities',
    body: 'Toilets, basins, mirrors and floors cleaned and sanitised every visit.',
    icon: Bath,
  },
  {
    title: 'Desks, workstations and meeting rooms',
    body: 'Surfaces wiped, shared spaces reset, and detail-focused finishing throughout.',
    icon: Briefcase,
  },
  {
    title: 'Floors and high-touch points',
    body: 'Vacuuming, mopping, and touchpoint cleaning across daily-use areas.',
    icon: PaintRoller,
  },
  {
    title: 'Windows, glass and internal doors',
    body: 'Internal glass, partitions and door surfaces cleaned for a clear finish.',
    icon: PanelTop,
  },
  {
    title: 'Rubbish, recycling and consumables',
    body: 'Bins emptied, liners replaced, and shared consumables restocked as agreed.',
    icon: Trash2,
  },
  {
    title: 'Showrooms and client-facing spaces',
    body: 'Higher-detail cleaning for spaces where presentation matters most.',
    icon: Store,
  },
  {
    title: 'Tailored requirements',
    body: 'Site-specific tasks built into your cleaning plan, agreed upfront.',
    icon: PlusCircle,
  },
]

export default function CommercialCleaningPage() {
  return (
    <>
      {/* SubpageHero — unchanged from the #173 rollout. */}
      <SubpageHero
        eyebrow="COMMERCIAL CLEANING"
        title="Commercial and office cleaning across Auckland"
        subtitle="Reliable cleaning for offices, workplaces, and commercial spaces, with clear communication and consistent standards from Sano."
        imageSrc="/images/heroes/commercial-office-cleaning-hero.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* 1. Service Information — white background, two-column layout:
          long-form intro on the left, sage-tinted quote card on the right.
          Mirrors the Enhanced Cleaning office-cleaning reference body
          structure (Service Information section). */}
      <section className="section-padding section-y bg-white">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-10 lg:gap-14 items-start">
            <div>
              <h2 className="mb-6 border-b border-sage-100 pb-5">
                Commercial cleaning for workplaces that need consistency
              </h2>
              <div className="body-text space-y-4">
                <p>
                  Sano provides reliable commercial and office cleaning across Auckland for
                  workplaces that need clear communication, consistent standards, and a team
                  that understands the details that matter.
                </p>
                <p>
                  Our commercial cleaning service is built around practical systems, regular
                  schedules, and site-specific requirements, so your workplace stays clean,
                  presentable, and easier to manage.
                </p>
                <p>
                  Whether you need office cleaning, shared amenity cleaning, showroom
                  cleaning, or a tailored cleaning plan, we can shape the service around
                  your space, schedule, and standards.
                </p>
              </div>
            </div>

            {/* Quote card — sage-tinted with internal padding, single CTA. */}
            <aside className="rounded-2xl border border-sage-100 bg-sage-50 p-6 lg:p-7 lg:sticky lg:top-24">
              <h3 className="font-sans text-xl font-semibold text-sage-800">
                Book a Commercial Cleaning Quote
              </h3>
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-sage-700">
                Tell us about your workplace, schedule, and cleaning requirements. We&apos;ll
                come back with a clear, practical quote based on the scope of work.
              </p>
              <Link
                href="/contact"
                className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-sage-500 px-6 py-3 text-[0.875rem] font-semibold text-white transition-colors duration-200 hover:bg-sage-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
              >
                Get a Free Quote
              </Link>
            </aside>
          </div>
        </div>
      </section>

      {/* 2. Why Choose — dark sage-800 band, centred header with sage-300
          highlight, 4 white feature cards in a row on desktop. */}
      <section className="section-padding section-y bg-sage-800">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-300">
              WHY SANO
            </p>
            <h2 className="mt-3 font-sans font-semibold text-white" style={headingStyle}>
              Why choose Sano for{' '}
              <span className="text-sage-300">your workplace</span>
            </h2>
            <p className="mt-4 text-[1rem] leading-[1.6] text-white/80">
              Clear systems, reliable people, and cleaning standards built around your site.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {WHY_CHOOSE_CARDS.map((card) => (
              <li
                key={card.title}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >
                <IconBlock icon={card.icon} />
                <h3 className="mt-5 font-sans text-[1.0625rem] font-semibold text-sage-800">
                  {card.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-sage-600">
                  {card.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 3. What We Cover — light cream band, centred header with sage-500
          highlight, 9 white cards in a 3-column grid on desktop. */}
      <section className="section-padding section-y bg-[#faf9f6]">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500">
              OUR SCOPE
            </p>
            <h2 className="mt-3 font-display font-bold text-sage-800" style={headingStyle}>
              What we <span className="text-sage-500">cover</span>
            </h2>
            <p className="mt-4 body-text">
              From front-of-house areas to staff spaces, we keep the everyday working areas
              clean, tidy and ready to use.
            </p>
          </div>

          <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {WHAT_WE_COVER_CARDS.map((card) => (
              <li
                key={card.title}
                className="rounded-2xl border border-sage-100 bg-white p-6 shadow-sm"
              >
                <IconBlock icon={card.icon} />
                <h3 className="mt-5 font-sans text-[1.0625rem] font-semibold text-sage-800">
                  {card.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-sage-600">
                  {card.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* 4. Bottom CTA banner — image-backed dark band with two CTAs.
          Mirrors the reference's "Ready for a Sparkling Clean Workplace?"
          section. Uses the existing Sano commercial photograph as the
          background, with a sage-800 overlay for legibility. */}
      <section className="relative overflow-hidden bg-sage-800 section-padding py-16 lg:py-20">
        <Image
          src="/images/sano-commercial-clean-auckland.jpeg"
          alt=""
          fill
          className="object-cover object-center"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(to right, rgba(6,35,29,0.88) 0%, rgba(6,35,29,0.78) 50%, rgba(6,35,29,0.72) 100%)',
          }}
        />
        <div className="relative z-10 container-max">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="font-sans font-semibold text-white" style={headingStyle}>
              Ready for a cleaner, better-presented workplace?
            </h2>
            <p className="mt-4 text-[1rem] leading-[1.6] text-white/85">
              Get a clear quote for commercial cleaning across Auckland.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/contact"
                className="inline-flex items-center rounded-full bg-white px-6 py-3 text-[0.875rem] font-semibold text-sage-800 transition-colors duration-200 hover:bg-sage-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Get a Free Quote
              </Link>
              <Link
                href="tel:0800726686"
                className="inline-flex items-center rounded-full border border-white/40 px-6 py-3 text-[0.875rem] font-semibold text-white transition-colors duration-200 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Call Sano
              </Link>
            </div>
          </div>
        </div>
      </section>

      <AreasWeServeSection />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Service',
            name: 'Commercial & Office Cleaning',
            description:
              'Reliable commercial and office cleaning in Auckland. Consistent, detail-focused cleaning for workplaces.',
            provider: { '@type': 'LocalBusiness', name: 'Sano Property Services' },
            areaServed: { '@type': 'City', name: 'Auckland' },
          }),
        }}
      />
    </>
  )
}

/**
 * Inline style used for the centred section h2s in Why Choose, What We
 * Cover, and the bottom CTA banner. Matches the homepage hero's
 * clamp() + letter-spacing typography family — slightly smaller scale
 * for body sections so the hero stays the largest moment on the page.
 */
const headingStyle = {
  fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
  lineHeight: 1.15,
  letterSpacing: '-0.015em',
} as const

/**
 * Sage-tinted square icon block used above each feature card title.
 * Matches the reference's blue square icon blocks but recoloured to
 * the Sano sage palette.
 */
function IconBlock({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-100">
      <Icon size={20} strokeWidth={1.75} className="text-sage-500" aria-hidden="true" />
    </div>
  )
}
