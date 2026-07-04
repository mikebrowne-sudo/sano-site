import type { ReactNode } from 'react'

/**
 * Standardised "Book your [service] clean in 3 simple steps" section.
 * Mirrors the Enhanced Cleaning vacate-cleaning reference: light band,
 * centred eyebrow + heading, 3-card row on desktop. Each card has a
 * numbered badge, h3 title, and short body.
 *
 * Used by the six pages standardised in this PR — always 3 steps.
 */

export interface BookingStep {
  title: string
  body: string
}

export interface BookingStepsSectionProps {
  /** Eyebrow above the heading. Default: "HOW IT WORKS". */
  eyebrow?: string
  /** Section heading, e.g. "Book your regular house clean in 3 simple steps". */
  heading: string
  /**
   * Optional substring of `heading` to colour-emphasise in sage-500.
   * Falls back to plain heading text when missing or not found.
   */
  headingHighlight?: string
  /** Always 3 steps. */
  steps: ReadonlyArray<BookingStep>
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

export function BookingStepsSection({
  eyebrow = 'HOW IT WORKS',
  heading,
  headingHighlight,
  steps,
}: BookingStepsSectionProps) {
  return (
    <section className="section-padding bg-white py-10 lg:py-12">
      <div className="container-max">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-sage-500">
            {eyebrow}
          </p>
          <h2
            className="mt-2 font-display font-bold text-sage-800"
            style={{
              fontSize: 'clamp(1.5rem, 2.25vw, 1.875rem)',
              lineHeight: 1.15,
              letterSpacing: '-0.015em',
            }}
          >
            {renderHeading(heading, headingHighlight)}
          </h2>
        </div>

        <ol className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-5">
          {steps.map((step, i) => (
            <li
              key={step.title}
              className="rounded-2xl border border-sage-100 bg-[#faf9f6] p-5 text-center transition-all duration-200 hover:scale-[1.03] hover:shadow-md hover:border-sage-300"
            >
              <span
                aria-hidden="true"
                className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-sage-500 text-[0.875rem] font-bold text-white shadow-sm"
              >
                {i + 1}
              </span>
              <h3 className="mt-3 font-sans text-[1rem] font-semibold text-sage-800">
                {step.title}
              </h3>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-sage-600">
                {step.body}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
