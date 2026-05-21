import type { ReactNode } from 'react'
import Link from 'next/link'
import { ListChecks } from 'lucide-react'

interface SignatureSystemProps {
  /** Small uppercase eyebrow label above the heading. */
  eyebrow: string
  /** Main heading text. The full string is rendered; emphasis is added via headingHighlight. */
  displayHeading: string
  /**
   * Optional substring of displayHeading to emphasise in sage-500. Colour-only emphasis;
   * inherits the heading's font weight so the highlight reads as refined rather than heavy.
   */
  headingHighlight?: string
  /** Short paragraph beneath the heading. */
  body: string
  /** CTA button destination. */
  ctaHref: string
  /** CTA button label. */
  ctaLabel: string
  /** Optional small spec line rendered below the CTA (uppercase tracked sage-500). */
  specLine?: string
  /**
   * Optional `id` for the rendered h2. When provided, the section element also gets
   * `aria-labelledby` pointing at this id so the section is labelled by its heading.
   * Useful when the caller wants to wire up sibling navigation or skip-links.
   */
  ariaLabelledById?: string
}

/**
 * Render a heading with an optional `highlight` substring emphasised in
 * Sano sage. Colour-only emphasis (no extra weight) so the heading reads as
 * one refined block. Falls back to plain text when highlight is missing or
 * not found in heading. Mirrors the pattern used in ServiceChecklist.
 */
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

/**
 * Homepage trust block — Sano "Signature System" / 100-Point Home Clean Checklist
 * teaser. Structurally inspired by Enhanced Cleaning's signature-system block on
 * their homepage, rebuilt in Sano voice with Sano tokens. Light surface, two-column
 * on lg+ (text left, soft sage icon tile right), stacks on mobile.
 *
 * The CTA is intended to link to /services/regular-cleaning#home-clean-checklist
 * once the service-page integration ships. Before that, clicking the CTA lands
 * the user on the regular-cleaning page top — soft-fail, useful context.
 *
 * No checklist data, no draft content, no preview-route exposure on the homepage.
 */
export function SignatureSystem({
  eyebrow,
  displayHeading,
  headingHighlight,
  body,
  ctaHref,
  ctaLabel,
  specLine,
  ariaLabelledById,
}: SignatureSystemProps) {
  return (
    <section
      aria-labelledby={ariaLabelledById}
      className="section-padding section-y bg-white"
    >
      <div className="container-max">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Text side */}
          <div>
            <p className="eyebrow mb-4">{eyebrow}</p>

            <h2
              id={ariaLabelledById}
              className="mb-5 font-sans font-semibold text-sage-800"
              style={{
                fontSize: 'clamp(1.875rem, 3vw, 2.5rem)',
                lineHeight: 1.15,
                letterSpacing: '-0.015em',
              }}
            >
              {renderHeading(displayHeading, headingHighlight)}
            </h2>

            <p className="body-text mb-8 max-w-xl">{body}</p>

            <Link
              href={ctaHref}
              className="inline-flex items-center rounded-full bg-sage-800 px-6 py-3 text-sm font-semibold text-white transition-colors duration-200 hover:bg-sage-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
            >
              {ctaLabel}
            </Link>

            {specLine && (
              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.2em] text-sage-500">
                {specLine}
              </p>
            )}
          </div>

          {/* Visual side — soft sage icon tile, stacks above text on mobile per
              grid order; right-aligned on lg+ so it sits against the section edge */}
          <div className="flex justify-center lg:justify-end">
            <div
              aria-hidden="true"
              className="flex h-40 w-40 items-center justify-center rounded-3xl border border-sage-100 bg-sage-50 sm:h-48 sm:w-48"
            >
              <ListChecks size={72} strokeWidth={1.5} className="text-sage-600" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
