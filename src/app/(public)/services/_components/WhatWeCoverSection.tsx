import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

/**
 * Standardised "What We Cover" section used on service pages that do
 * NOT have a checklist (Carpet & Upholstery, Window Cleaning,
 * Post-Construction). Mirrors the Enhanced Cleaning reference 3-column
 * card grid with icon-block + title + body per card.
 *
 * Checklist pages (Regular Cleaning, Deep Cleaning, End of Tenancy)
 * already convey full scope via the ServiceChecklist tabs and do not
 * use this component — would duplicate scope.
 */

export interface CoverItem {
  title: string
  body: string
  icon: LucideIcon
}

export interface WhatWeCoverSectionProps {
  /** Eyebrow above the heading. Default: "OUR SCOPE". */
  eyebrow?: string
  /** Section heading. */
  heading?: string
  /**
   * Optional substring of `heading` to colour-emphasise in sage-500.
   * Falls back to plain heading text when missing or not found.
   */
  headingHighlight?: string
  /** Optional supporting line beneath the heading. */
  subtitle?: string
  /** Items rendered in the 3-col grid. */
  items: ReadonlyArray<CoverItem>
}

function renderHeading(heading: string, highlight?: string): ReactNode {
  if (!highlight) return heading
  const idx = heading.indexOf(highlight)
  if (idx < 0) return heading
  return (
    <>
      {heading.slice(0, idx)}
      <span className="text-sage-500">{highlight}</span>
      {heading.slice(idx + highlight.length)}
    </>
  )
}

export function WhatWeCoverSection({
  eyebrow = 'OUR SCOPE',
  heading = 'What we cover',
  headingHighlight = 'cover',
  subtitle,
  items,
}: WhatWeCoverSectionProps) {
  return (
    <section className="section-padding section-y bg-[#faf9f6]">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500">
            {eyebrow}
          </p>
          <h2
            className="mt-3 font-display font-bold text-sage-800"
            style={{
              fontSize: 'clamp(1.75rem, 3vw, 2.25rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
            }}
          >
            {renderHeading(heading, headingHighlight)}
          </h2>
          {subtitle && <p className="mt-4 body-text">{subtitle}</p>}
        </div>

        <ul className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li
                key={item.title}
                className="rounded-2xl border border-sage-100 bg-white p-6 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-sage-100">
                  <Icon
                    size={20}
                    strokeWidth={1.75}
                    className="text-sage-500"
                    aria-hidden="true"
                  />
                </span>
                <h3 className="mt-5 font-sans text-[1.0625rem] font-semibold text-sage-800">
                  {item.title}
                </h3>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-sage-600">
                  {item.body}
                </p>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
