import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ListChecks } from 'lucide-react'

interface SignatureSystemProps {
  /** Small uppercase eyebrow rendered as a pill above the heading. */
  eyebrow: string
  /** Main heading text. Emphasis is added via headingHighlight. */
  displayHeading: string
  /**
   * Optional substring of displayHeading to emphasise in sage-300 (lighter
   * sage chosen for contrast on the dark band). Colour-only emphasis; the
   * heading itself carries the semibold weight.
   */
  headingHighlight?: string
  /** Short paragraph beneath the heading. */
  body: string
  /** CTA button destination. */
  ctaHref: string
  /** CTA button label. */
  ctaLabel: string
  /**
   * Optional background image path served from /public. When provided, renders
   * full-bleed behind the gradient overlay at reduced opacity. When omitted
   * (default), the dark sage gradient stands alone. Lets a future PR drop a
   * real Sano photo in via a single prop change.
   */
  backgroundImage?: string
  /**
   * Optional `id` for the rendered h2. When provided, the section element also
   * gets `aria-labelledby` pointing at it so the section is labelled by its
   * heading. Useful for sibling navigation / skip-links.
   */
  ariaLabelledById?: string
}

/**
 * Render a heading with an optional `highlight` substring emphasised in
 * Sano sage-300 (lighter accent green for legibility on dark surfaces).
 * Colour-only emphasis — inherits parent semibold weight. Falls back to plain
 * text if highlight is missing or not found in heading.
 */
function renderHeading(heading: string, highlight?: string): ReactNode {
  if (!highlight) return heading
  const idx = heading.indexOf(highlight)
  if (idx < 0) return heading
  return (
    <>
      {heading.slice(0, idx)}
      <span className="text-sage-300">{highlight}</span>
      {heading.slice(idx + highlight.length)}
    </>
  )
}

/**
 * Homepage trust block — Sano "Signature System" / 100-Point Home Clean
 * Checklist teaser. Full-width dark sage band with centred content. Sits
 * between the services grid and ProcessSteps, where the visual interruption
 * between two beige sections reinforces it as a feature block.
 *
 * Background defaults to a dark sage gradient with a subtle watermark
 * ListChecks icon. A future PR can drop a real Sano photo in via the
 * `backgroundImage` prop without any other component change.
 */
export function SignatureSystem({
  eyebrow,
  displayHeading,
  headingHighlight,
  body,
  ctaHref,
  ctaLabel,
  backgroundImage,
  ariaLabelledById,
}: SignatureSystemProps) {
  return (
    <section
      aria-labelledby={ariaLabelledById}
      className="relative overflow-hidden bg-sage-800 section-padding py-20 lg:py-24"
    >
      {/* Optional full-bleed image (default: none — gradient stands alone) */}
      {backgroundImage && (
        <Image
          src={backgroundImage}
          alt=""
          fill
          className="object-cover object-center opacity-40"
          sizes="100vw"
          aria-hidden="true"
        />
      )}

      {/* Gradient overlay — gives depth on a flat dark band and ensures
          text readability on top of any future background image */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at top, rgba(7,102,83,0.5) 0%, transparent 65%), linear-gradient(180deg, rgba(6,35,29,0.95) 0%, rgba(52,76,61,0.95) 100%)',
        }}
      />

      {/* Watermark ListChecks icon — large, subtle, sits behind content
          on the right edge. Clipped by overflow-hidden on the section
          so it never spills off the page on narrow viewports. */}
      <ListChecks
        aria-hidden="true"
        size={420}
        strokeWidth={0.6}
        className="pointer-events-none absolute -right-16 top-1/2 -translate-y-1/2 text-sage-300/[0.07] lg:right-4"
      />

      {/* Centred content */}
      <div className="container-max relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 backdrop-blur-sm">
            {eyebrow}
          </span>

          <h2
            id={ariaLabelledById}
            className="mt-6 mb-5 font-sans font-semibold text-white"
            style={{
              fontSize: 'clamp(2rem, 3.5vw, 2.75rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
            }}
          >
            {renderHeading(displayHeading, headingHighlight)}
          </h2>

          <p className="mx-auto mb-8 max-w-xl text-[15px] leading-relaxed text-white/85">
            {body}
          </p>

          <Link
            href={ctaHref}
            className="inline-flex items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-sage-800 transition-colors duration-200 hover:bg-sage-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {ctaLabel}
          </Link>
        </div>
      </div>
    </section>
  )
}
