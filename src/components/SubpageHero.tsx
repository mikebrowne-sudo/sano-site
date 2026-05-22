import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'

/**
 * Reusable image-backed hero for service pages, utility pages and
 * any other sub-page that needs a polished, homepage-tier above-the-fold.
 *
 * Built as a server component — entrance animation is delivered via a
 * CSS `@keyframes hero-rise` utility in globals.css gated by Tailwind's
 * `motion-safe:` variant, so:
 *
 *   - no `'use client'` boundary
 *   - reduced-motion users see the hero at its final state with no
 *     animation
 *   - the headline + subtitle never sit invisibly waiting for JS to hydrate
 *
 * The visual treatment carries over from the homepage hero:
 *
 *   - Layered sage-800 gradient overlay (3-stop for `medium`,
 *     4-stop for `strong`) plus a mobile-only top-up overlay for
 *     additional contrast on small screens
 *   - `clamp()` headline sizing + `-0.025em` letter-spacing
 *   - Tiny uppercase tracked eyebrow
 *   - Optional sage-300 highlight on a substring of the title
 *   - Rounded-full white primary CTA + ghost-outline secondary CTA
 *   - Optional chip row for trust signals
 *   - Default left-aligned, opt-in `align="center"` for utility pages
 *   - Two size variants: `standard` (520px) for top-level pages,
 *     `compact` (380px) for utility pages with less to say
 */

export interface SubpageHeroCta {
  label: string
  href: string
}

export interface SubpageHeroChip {
  label: string
}

export interface SubpageHeroProps {
  /** Small uppercase eyebrow label rendered above the title. */
  eyebrow?: string
  /** Main heading. Required. */
  title: string
  /**
   * Optional substring of `title` to colour-emphasise in sage-300. Falls
   * back to plain text when missing or not found.
   */
  titleHighlight?: string
  /** Short paragraph beneath the title. */
  subtitle?: string
  /**
   * Background image path. Local `/images/...` paths only — no external
   * URLs by convention.
   */
  imageSrc: string
  /**
   * Alt text for the background image. Leave empty (default) when the
   * title carries the semantic meaning; the image is then treated as
   * decorative.
   */
  imageAlt?: string
  /** Primary call-to-action. Optional. */
  primaryCta?: SubpageHeroCta
  /** Secondary call-to-action, rendered as a ghost outline button. */
  secondaryCta?: SubpageHeroCta
  /** Optional row of trust chips beneath the CTA row. */
  chips?: ReadonlyArray<SubpageHeroChip>
  /** Text alignment. Default: `'left'`. */
  align?: 'left' | 'center'
  /**
   * Height variant. `'standard'` = 520px (top-level service pages),
   * `'compact'` = 380px (utility pages). Default: `'standard'`.
   */
  size?: 'standard' | 'compact'
  /**
   * Overlay strength. `'medium'` (default) suits most images;
   * `'strong'` is for busier images with lots of detail competing
   * with the text.
   */
  overlayStrength?: 'medium' | 'strong'
  /**
   * Optional `object-position` override for the background image. Pass a
   * Tailwind `object-*` class fragment (e.g. `'object-center md:object-right'`)
   * to shift the focal point. Default: `'object-center'`.
   */
  imagePosition?: string
  /**
   * When true (default), apply the staggered entrance animation
   * (motion-safe-gated). Set false to render fully static.
   */
  animate?: boolean
}

const SIZE_HEIGHT_CLASS: Record<NonNullable<SubpageHeroProps['size']>, string> = {
  standard: 'h-[520px]',
  compact: 'h-[380px]',
}

/** Layered sage-800 overlays — match the homepage gradient family. */
const OVERLAY_GRADIENT: Record<NonNullable<SubpageHeroProps['overlayStrength']>, string> = {
  medium:
    'linear-gradient(to right, rgba(6,35,29,0.82) 0%, rgba(6,35,29,0.62) 35%, rgba(6,35,29,0.28) 75%, rgba(6,35,29,0.08) 100%)',
  strong:
    'linear-gradient(to right, rgba(6,35,29,0.92) 0%, rgba(6,35,29,0.78) 35%, rgba(6,35,29,0.52) 75%, rgba(6,35,29,0.28) 100%)',
}

/** Render `title` with an optional sage-300 colour highlight on a substring. */
function renderTitle(title: string, highlight?: string): ReactNode {
  if (!highlight) return title
  const idx = title.indexOf(highlight)
  if (idx < 0) return title
  return (
    <>
      {title.slice(0, idx)}
      <span className="text-sage-300">{highlight}</span>
      {title.slice(idx + highlight.length)}
    </>
  )
}

/**
 * Per-item animation classes. When `animate=false` we render nothing so
 * the elements stay at default (visible) state. The `hero-rise-item`
 * utility starts at opacity 0 and animates up — gating it behind
 * `motion-safe:` means reduced-motion users skip the animation
 * entirely and the element renders visible.
 */
function riseClass(animate: boolean): string {
  return animate ? 'motion-safe:hero-rise-item' : ''
}

function riseStyle(animate: boolean, delaySeconds: number): CSSProperties | undefined {
  if (!animate) return undefined
  return { animationDelay: `${delaySeconds}s` }
}

export function SubpageHero({
  eyebrow,
  title,
  titleHighlight,
  subtitle,
  imageSrc,
  imageAlt = '',
  primaryCta,
  secondaryCta,
  chips,
  align = 'left',
  size = 'standard',
  overlayStrength = 'medium',
  imagePosition = 'object-center',
  animate = true,
}: SubpageHeroProps) {
  const isCentred = align === 'center'
  const heightClass = SIZE_HEIGHT_CLASS[size]
  const showChips = chips && chips.length > 0

  return (
    <section className={`relative flex overflow-hidden ${heightClass}`}>
      {/* Background image — decorative by default (alt is empty unless
          the page explicitly supplies one). The title carries the
          semantic weight. */}
      <Image
        src={imageSrc}
        alt={imageAlt}
        fill
        priority
        sizes="100vw"
        className={`object-cover ${imagePosition}`}
      />

      {/* Base sage-800 layered overlay — strong on the left where text
          sits, fades softer toward the right so the photograph remains
          visible. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: OVERLAY_GRADIENT[overlayStrength] }}
      />

      {/* Mobile-only top-up overlay — small screens render the photograph
          full-bleed behind the text, so a slightly stronger overall wash
          keeps the white type readable. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 md:hidden"
        style={{
          background:
            'linear-gradient(to right, rgba(6,35,29,0.30) 0%, rgba(6,35,29,0.22) 50%, rgba(6,35,29,0.14) 100%)',
        }}
      />

      {/* Content */}
      <div
        className={[
          'relative z-10 flex w-full flex-col justify-center section-padding py-10',
          isCentred ? 'items-center text-center' : '',
        ].join(' ')}
      >
        <div className="container-max w-full">
          <div
            className={[
              isCentred ? 'mx-auto max-w-2xl' : 'max-w-2xl pl-2 lg:pl-4',
            ].join(' ')}
          >
            {eyebrow && (
              <p
                className={`mb-4 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-white/70 ${riseClass(
                  animate,
                )}`}
                style={riseStyle(animate, 0)}
              >
                {eyebrow}
              </p>
            )}

            <h1
              className={`mb-5 text-white ${riseClass(animate)}`}
              style={{
                fontSize: 'clamp(2rem, 4vw, 2.75rem)',
                lineHeight: 1.08,
                letterSpacing: '-0.025em',
                ...riseStyle(animate, 0.08),
              }}
            >
              {renderTitle(title, titleHighlight)}
            </h1>

            {subtitle && (
              <p
                className={[
                  'text-[1rem] leading-[1.6] text-white/85',
                  isCentred ? 'mx-auto max-w-[28rem]' : 'max-w-[28rem]',
                  primaryCta || secondaryCta || showChips ? 'mb-7' : '',
                  riseClass(animate),
                ].join(' ')}
                style={riseStyle(animate, 0.16)}
              >
                {subtitle}
              </p>
            )}

            {(primaryCta || secondaryCta) && (
              <div
                className={[
                  'flex flex-wrap gap-3',
                  showChips ? 'mb-6' : '',
                  isCentred ? 'justify-center' : '',
                  riseClass(animate),
                ].join(' ')}
                style={riseStyle(animate, 0.24)}
              >
                {primaryCta && (
                  <Link
                    href={primaryCta.href}
                    className="inline-flex items-center rounded-full bg-white px-6 py-2.5 text-[0.875rem] font-semibold text-sage-800 transition-all duration-300 hover:bg-sage-100 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {primaryCta.label}
                  </Link>
                )}
                {secondaryCta && (
                  <Link
                    href={secondaryCta.href}
                    className="inline-flex items-center rounded-full border border-white/40 px-6 py-2.5 text-[0.875rem] font-semibold text-white transition-all duration-300 hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                  >
                    {secondaryCta.label}
                  </Link>
                )}
              </div>
            )}

            {showChips && (
              <div
                className={[
                  'flex flex-wrap gap-2',
                  isCentred ? 'justify-center' : '',
                  riseClass(animate),
                ].join(' ')}
                style={riseStyle(animate, 0.32)}
              >
                {chips.map((chip) => (
                  <span
                    key={chip.label}
                    className="inline-flex items-center rounded-xl border border-white/50 bg-white/90 px-3 py-1.5 text-[12px] font-semibold text-sage-800 shadow-sm backdrop-blur-sm"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
