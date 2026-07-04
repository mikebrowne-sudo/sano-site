import type { ReactNode } from 'react'
import Image from 'next/image'
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
 *
 * `variant="dark"` (suburb pages) renders the WhyChooseSection dialect:
 * sage-800 band, sage-300 eyebrow/highlight, white heading, opaque
 * slightly-lightened dark cards. An optional `backgroundImage` sits
 * behind the band at low opacity under a dark gradient — never behind
 * the cards themselves (card fill is opaque by design). Default stays
 * `light` so the six service pages are untouched.
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
   * Optional substring of `heading` to colour-emphasise (sage-500 on
   * light, sage-300 on dark). Falls back to plain heading text when
   * missing or not found.
   */
  headingHighlight?: string
  /** Optional supporting line beneath the heading. */
  subtitle?: string
  /** Items rendered in the 3-col grid. */
  items: ReadonlyArray<CoverItem>
  /** Visual variant. Default "light" (service-page original). */
  variant?: 'light' | 'dark'
  /**
   * Dark variant only: full-bleed image behind the band, rendered at low
   * opacity beneath a sage gradient. Cards stay opaque on top of it.
   */
  backgroundImage?: string
}

function renderHeading(heading: string, highlight: string | undefined, highlightClass: string): ReactNode {
  if (!highlight) return heading
  const idx = heading.indexOf(highlight)
  if (idx < 0) return heading
  return (
    <>
      {heading.slice(0, idx)}
      <span className={highlightClass}>{highlight}</span>
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
  variant = 'light',
  backgroundImage,
}: WhatWeCoverSectionProps) {
  const dark = variant === 'dark'

  return (
    <section
      className={
        dark
          ? 'relative overflow-hidden section-padding bg-sage-800 py-10 lg:py-12'
          : 'section-padding bg-[#faf9f6] py-10 lg:py-12'
      }
    >
      {dark && backgroundImage && (
        <div className="absolute inset-0" aria-hidden="true">
          <Image
            src={backgroundImage}
            alt=""
            fill
            className="object-cover opacity-[0.13]"
            sizes="100vw"
          />
          {/* Anchor the band edges dark so the texture reads as a wash,
              not a photo, and the neighbouring sections stay seamless. */}
          <div className="absolute inset-0 bg-gradient-to-b from-sage-800/80 via-sage-800/30 to-sage-800/85" />
        </div>
      )}

      <div className={dark ? 'relative container-max' : 'container-max'}>
        <div className="mx-auto max-w-3xl text-center">
          <p
            className={`text-[0.6875rem] font-semibold uppercase tracking-[0.2em] ${
              dark ? 'text-sage-300' : 'text-sage-500'
            }`}
          >
            {eyebrow}
          </p>
          <h2
            className={`mt-2 font-display font-bold ${dark ? 'text-white' : 'text-sage-800'}`}
            style={{
              fontSize: 'clamp(1.5rem, 2.25vw, 1.875rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
            }}
          >
            {renderHeading(heading, headingHighlight, dark ? 'text-sage-300' : 'text-sage-500')}
          </h2>
          {subtitle &&
            (dark ? (
              <p className="mt-3 text-[0.9375rem] leading-[1.6] text-white/80">{subtitle}</p>
            ) : (
              <p className="mt-3 body-text">{subtitle}</p>
            ))}
        </div>

        <ul className="mt-8 flex flex-wrap justify-center gap-4 lg:gap-5">
          {items.map((item) => {
            const Icon = item.icon
            return (
              <li
                key={item.title}
                className={
                  dark
                    ? 'w-full rounded-2xl border border-white/10 bg-sage-800 bg-[linear-gradient(rgba(255,255,255,0.05),rgba(255,255,255,0.05))] p-5 transition-all duration-200 hover:scale-[1.03] hover:border-white/25 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.834rem)]'
                    : 'w-full rounded-2xl border border-sage-100 bg-white p-5 shadow-sm transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:border-sage-300 sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.834rem)]'
                }
              >
                <span
                  className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                    dark ? 'bg-white/10' : 'bg-sage-100'
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.75}
                    className={dark ? 'text-sage-300' : 'text-sage-500'}
                    aria-hidden="true"
                  />
                </span>
                <h3
                  className={`mt-3 font-sans text-[1rem] font-semibold ${
                    dark ? 'text-white' : 'text-sage-800'
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`mt-1.5 text-[0.9375rem] leading-relaxed ${
                    dark ? 'text-white/70' : 'text-sage-600'
                  }`}
                >
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
