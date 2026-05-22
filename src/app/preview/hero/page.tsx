import type { Metadata } from 'next'
import { SubpageHero } from '@/components/SubpageHero'

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
 * Image picks are existing local Sano assets — best-fit only. Hero
 * imagery will be replaced as part of the live-page migration PRs
 * once the final source-set is locked in.
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
            Image picks are best-fit from existing local Sano assets and will be
            revisited as part of the migration PRs once the final hero source-set
            is locked in.
          </p>
        </div>
      </header>

      {/* Variant 1 — standard left-aligned service-page hero */}
      <VariantLabel title="V1 — Standard, left-aligned service-page hero" />
      <SubpageHero
        eyebrow="REGULAR CLEANING"
        title="Regular house cleaning in Auckland"
        subtitle="Keep your home consistently clean, tidy, and easy to live in with reliable ongoing cleaning."
        imageSrc="/images/sano-auckland-team.jpeg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
      />

      {/* Variant 2 — standard with secondary CTA and chips */}
      <VariantLabel title="V2 — Standard, with secondary CTA + chips (e.g. Commercial)" />
      <SubpageHero
        eyebrow="COMMERCIAL CLEANING"
        title="Workplace cleaning that quietly keeps up"
        titleHighlight="quietly keeps up"
        subtitle="Reliable, detail-focused commercial cleaning across Auckland. After-hours, early-morning, or scheduled to suit your operations."
        imageSrc="/images/sano-commercial-clean-auckland.jpeg"
        primaryCta={{ label: 'Get a Free Quote', href: '/contact' }}
        secondaryCta={{ label: 'Explore Services', href: '/services' }}
        chips={[
          { label: 'Insured' },
          { label: 'Vetted teams' },
          { label: 'Auckland wide' },
        ]}
      />

      {/* Variant 3 — compact centred utility-page hero */}
      <VariantLabel title="V3 — Compact, centred utility-page hero (e.g. About / FAQ)" />
      <SubpageHero
        eyebrow="ABOUT SANO"
        title="Cleaning that improves how a space feels"
        subtitle="Sano means healthy. We focus on consistent, detail-focused cleaning that leaves your space properly cared for."
        imageSrc="/images/cleaned-by-sano.jpg"
        align="center"
        size="compact"
        animate={false}
      />

      {/* Variant 4 — strong overlay over a busier image */}
      <VariantLabel title="V4 — Strong overlay variant (busier image, more contrast)" />
      <SubpageHero
        eyebrow="OUR TEAM"
        title="Auckland locals you can rely on"
        titleHighlight="rely on"
        subtitle="Carefully selected, properly trained, and consistent visit to visit."
        imageSrc="/images/Sano-crew-auckland.jpeg"
        overlayStrength="strong"
        primaryCta={{ label: 'Meet the Team', href: '/about' }}
        secondaryCta={{ label: 'Get a Quote', href: '/contact' }}
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
