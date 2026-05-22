import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

interface SignatureSystemProps {
  /** Small uppercase eyebrow rendered as a pill above the heading. */
  eyebrow: string
  /** Main heading text. Emphasis is added via headingHighlight. */
  displayHeading: string
  /**
   * Optional substring of displayHeading to emphasise in sage-300 (lighter
   * sage chosen for contrast on the dark sage overlay). Colour-only emphasis;
   * inherits parent semibold weight.
   */
  headingHighlight?: string
  /** Short paragraph beneath the heading. */
  body: string
  /** CTA button destination. */
  ctaHref: string
  /** CTA button label. */
  ctaLabel: string
  /**
   * Optional override of the default background image path. Default points
   * at `/images/homepage-signature-system.jpg`. Lets a future PR swap the
   * image without component changes.
   */
  backgroundImage?: string
  /** Optional alt text override for the background image. Aria-hidden on
   *  default since the heading already carries the section meaning. */
  backgroundAlt?: string
  /**
   * Optional `id` for the rendered h2. When provided, the section element
   * also gets `aria-labelledby` pointing at it.
   */
  ariaLabelledById?: string
}

const DEFAULT_BACKGROUND = '/images/homepage-signature-system.jpg'

/**
 * Render a heading with an optional `highlight` substring emphasised in
 * sage-300 (lighter accent for legibility on dark surfaces). Colour-only
 * emphasis — inherits parent semibold weight. Falls back to plain text if
 * highlight is missing or not found in heading.
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
 * Soft checklist/document watermark. Built from CSS shapes rather than a
 * lucide icon so it reads as an elegant document silhouette behind the
 * heading rather than a literal icon. Sits at the right edge, partially
 * cropped, very low opacity. Pure presentational — aria-hidden.
 *
 * Structure is split in two layers on purpose:
 *
 *   - Outer wrapper owns static positioning (`top-1/2 -translate-y-1/2`).
 *     If we put the drift animation on this element directly, the
 *     keyframe's `transform: translate(...)` would clobber the
 *     `-translate-y-1/2` centering transform and the watermark would
 *     jump down by half its height. So this wrapper never animates.
 *
 *   - Inner element owns the drift animation via `motion-safe:` so
 *     reduced-motion users see a static watermark. Only this element
 *     moves — the background image, overlays, heading, body and CTA
 *     all stay completely static.
 *
 * Hidden below `sm:` so it never competes with text on mobile.
 */
function DocumentWatermark() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute right-[-3rem] top-1/2 hidden h-[21rem] w-[17rem] -translate-y-1/2 sm:block lg:right-[-2rem]"
    >
      <div className="h-full w-full opacity-[0.09] motion-safe:signature-drift">
        <div className="flex h-full w-full flex-col rounded-2xl border border-white p-6">
          {/* Document title bar */}
          <div className="mb-5 h-1.5 w-20 rounded-full bg-white" />

          {/* Five checklist rows */}
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="mb-3.5 flex items-center gap-3">
              {/* Check tile */}
              <div className="flex h-3 w-3 flex-shrink-0 items-center justify-center rounded-[3px] border border-white">
                <div className="h-1 w-1 rounded-[1px] bg-white" />
              </div>
              {/* Row label */}
              <div
                className="h-1.5 rounded-full bg-white"
                style={{ width: `${78 - i * 8}%` }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Homepage trust block — Sano "Signature System" / 100-Point Home Clean
 * Checklist teaser. Full-width image-backed dark sage banner with centred
 * content. Sits between the services grid and ProcessSteps.
 *
 * - Background image: real Sano photography supplied at
 *   /images/homepage-signature-system.jpg. Static (never animates).
 * - Layered sage overlay: solid sage-800/[0.85] base + radial sage-500
 *   highlight to give the dark band depth without going harsh-black.
 * - Watermark: document/checklist shape built from CSS, very low
 *   opacity, partially cropped at the right edge. Gentle drift via
 *   the `signature-drift` keyframe in globals.css, gated by
 *   `motion-safe:` so reduced-motion users see it static.
 * - Content: centred, white text, sage-300 highlight, white CTA
 *   with sage-800 text.
 */
export function SignatureSystem({
  eyebrow,
  displayHeading,
  headingHighlight,
  body,
  ctaHref,
  ctaLabel,
  backgroundImage = DEFAULT_BACKGROUND,
  backgroundAlt = '',
  ariaLabelledById,
}: SignatureSystemProps) {
  return (
    <section
      aria-labelledby={ariaLabelledById}
      className="relative overflow-hidden bg-sage-800 section-padding py-20 lg:py-24"
    >
      {/* Static background image */}
      <Image
        src={backgroundImage}
        alt={backgroundAlt}
        fill
        sizes="100vw"
        className="object-cover object-center"
        priority={false}
      />

      {/* Base dark sage overlay — strong enough for clear white text */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-sage-800/85"
      />

      {/* Subtle radial sage highlight on top of the base overlay — gives
          the dark band depth and a soft centre-focus glow */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse at center, rgba(7,102,83,0.30) 0%, transparent 60%)',
        }}
      />

      {/* Document watermark — drifts only on motion-safe */}
      <DocumentWatermark />

      {/* Centred content */}
      <div className="container-max relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center rounded-full border border-white/25 bg-white/10 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 backdrop-blur-sm">
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
