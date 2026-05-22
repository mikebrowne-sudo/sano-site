import type { ReactNode } from 'react'
import { Check } from 'lucide-react'

/**
 * Standardised "Why Choose Sano for [service]" section. Mirrors the
 * Enhanced Cleaning medical-cleaning reference layout: dark full-width
 * band, centred eyebrow + heading + subtitle, 2-column grid of compact
 * dark feature items (each: small green check + h4 + body).
 *
 * Different visual paradigm from the white-card "Why Choose" used on
 * the Commercial Cleaning page rebuild (which mirrors the
 * office-cleaning reference instead). Used by the six pages
 * standardised in this PR: Regular Cleaning, Deep Cleaning, End of
 * Tenancy, Carpet & Upholstery, Window Cleaning, Post-Construction.
 */

export interface WhyChooseItem {
  title: string
  body: string
}

export interface WhyChooseSectionProps {
  /** Small uppercase eyebrow above the heading. Default: "WHY SANO". */
  eyebrow?: string
  /** Section heading. */
  heading: string
  /**
   * Optional substring of `heading` to colour-emphasise in sage-300.
   * Falls back to plain heading text when missing or not found.
   */
  headingHighlight?: string
  /** Optional supporting line beneath the heading. */
  subtitle?: string
  /** Feature items rendered in the 2-col grid. */
  items: ReadonlyArray<WhyChooseItem>
}

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

export function WhyChooseSection({
  eyebrow = 'WHY SANO',
  heading,
  headingHighlight,
  subtitle,
  items,
}: WhyChooseSectionProps) {
  return (
    <section className="section-padding bg-sage-800 py-12 lg:py-14">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-300">
            {eyebrow}
          </p>
          <h2
            className="mt-2 font-sans font-semibold text-white"
            style={{
              fontSize: 'clamp(1.625rem, 2.5vw, 2rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
            }}
          >
            {renderHeading(heading, headingHighlight)}
          </h2>
          {subtitle && (
            <p className="mt-3 text-[0.9375rem] leading-[1.6] text-white/80">
              {subtitle}
            </p>
          )}
        </div>

        <ul className="mt-10 grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
          {items.map((item) => (
            <li
              key={item.title}
              className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-5 py-4"
            >
              {/* Small sage-300 check — matches the medical-cleaning reference
                  inline check on dark feature items. */}
              <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-sage-300/20">
                <Check
                  size={13}
                  strokeWidth={2.5}
                  className="text-sage-300"
                  aria-hidden="true"
                />
              </span>
              <div className="min-w-0">
                <h3 className="font-sans text-[0.9375rem] font-semibold text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-[0.875rem] leading-relaxed text-white/70">
                  {item.body}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
