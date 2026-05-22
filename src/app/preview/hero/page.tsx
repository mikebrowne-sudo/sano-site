import type { Metadata } from 'next'
import { DEFAULT_TRUST_ITEMS, SubpageHero } from '@/components/SubpageHero'

export const metadata: Metadata = {
  title: 'SubpageHero — preview',
  description: 'Internal preview of the SubpageHero component. Not for public consumption.',
  robots: { index: false, follow: false, nocache: true },
}

/**
 * Preview-only route for visual review of the SubpageHero component
 * before any live page migration.
 *
 * - Not linked from anywhere in the public site nav.
 * - Marked noindex / nofollow.
 * - Will be removed (or kept as an internal style surface) once the
 *   migration PRs land.
 *
 * Image picks are existing local Sano assets — best-fit only. The
 * dedicated hero source set for each service (Regular House Cleaning,
 * Deep Cleaning, End of Tenancy / Property Reset, Commercial & Office)
 * lives in F:\Sano\10-Branding\Website images\ and will be wired into
 * the live pages by the next rollout PR (PR-B in the audit).
 */
export default function HeroPreviewPage() {
  return (
    <main className="bg-white">
      <header className="section-padding border-b border-sage-100 bg-sage-50 py-10">
        <div className="container-max">
          <p className="eyebrow mb-3">Internal preview</p>
          <h1 className="text-sage-800 mb-3">SubpageHero — component preview</h1>
          <p className="body-text max-w-2xl">
            Visual review surface for{' '}
            <code className="rounded bg-white px-1.5 py-0.5 text-sage-700">
              SubpageHero
            </code>
            . Four variants render below. This route is <strong>noindex</strong> and not
            linked from the public site; it can be removed once the migration PRs
            land on the live service and utility pages.
          </p>
          <p className="body-text mt-4 max-w-2xl">
            Gradient + mobile top-up + trust row visually mirror the homepage hero
            exactly. Image picks are best-fit from existing local Sano assets and
            will be replaced with the dedicated per-service hero photography during
            the live-page migration PR.
          </p>
        </div>
      </header>

      {/* Variant 1 — cleaning service hero (the canonical pattern).
          Primary CTA only (no "Explore Services" by convention), trust
          row mirroring the homepage's four trust items. */}
      <VariantLabel title="V1 — Cleaning service hero (canonical pattern)" />
      <SubpageHero
        eyebrow="REGULAR CLEANING"
        title="Regular house cleaning in Auckland"
        subtitle="Keep your home consistently clean, tidy, and easy to live in with reliable ongoing cleaning."
        imageSrc="/images/sano-auckland-team.jpeg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* Variant 2 — second cleaning-service hero example. Different
          image, demonstrates the `titleHighlight` substring emphasis
          pattern (colour-only sage-300 highlight on a phrase within the
          h1). Same canonical structure as V1: primary CTA only, full
          trust row, no secondary CTA. */}
      <VariantLabel title="V2 — Cleaning service hero with titleHighlight emphasis" />
      <SubpageHero
        eyebrow="REGULAR CLEANING"
        title="Regular house cleaning, built around your home"
        titleHighlight="built around your home"
        subtitle="Reliable, detail-focused cleaning across Auckland — weekly, fortnightly, or on a custom schedule."
        imageSrc="/images/sano-commercial-clean-auckland.jpeg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* Variant 3 — non-cleaning / general sub-page hero. Keeps the
          "Explore Services" secondary CTA pattern from the homepage.
          Trust row included here per visual-review feedback — for real
          non-cleaning pages, trust row is opt-in via the `trustItems`
          prop; pages like /about or /service-area would typically pass
          it, while pages like /policies or /blog might omit it. */}
      <VariantLabel title="V3 — Non-cleaning / general sub-page (with Explore Services + trust row)" />
      <SubpageHero
        eyebrow="ABOUT SANO"
        title="Cleaning that improves how a space feels"
        subtitle="Sano means healthy. We focus on consistent, detail-focused cleaning that leaves your space properly cared for."
        imageSrc="/images/cleaned-by-sano.jpg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        secondaryCta={{ label: 'Explore Services', href: '/services' }}
        trustItems={DEFAULT_TRUST_ITEMS}
      />

      {/* Variant 4 — compact utility-page hero. Centred, no CTAs or
          trust row, no entrance animation. Fits short-content surfaces
          like /faq, /policies, /service-area. "Help" is promoted from
          the eyebrow into the title with `titleHighlight` so it reads
          as the strongest word in the hero (sage-300 colour emphasis,
          no weight change — subtle, not overdone). */}
      <VariantLabel title="V4 — Compact, centred utility-page hero" />
      <SubpageHero
        eyebrow="FAQ"
        title="Help and common questions"
        titleHighlight="Help"
        subtitle="Answers to common questions about Sano Cleaning: pricing, booking, our cleaners, products, and more."
        imageSrc="/images/Sano-crew-auckland.jpeg"
        align="center"
        size="compact"
        animate={false}
      />

      <footer className="section-padding py-12">
        <div className="container-max">
          <p className="body-text text-sm text-sage-600">
            End of preview. No live page has been migrated.
          </p>
        </div>
      </footer>
    </main>
  )
}

function VariantLabel({ title }: { title: string }) {
  return (
    <div className="section-padding border-y border-sage-100 bg-sage-50/60 py-3">
      <div className="container-max">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-sage-700">
          {title}
        </p>
      </div>
    </div>
  )
}
