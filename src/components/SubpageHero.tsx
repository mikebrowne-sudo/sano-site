import type { CSSProperties, ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  BadgeCheck,
  MapPin,
  ShieldCheck,
  UserCheck,
  type LucideIcon,
} from 'lucide-react'

/**
 * Reusable image-backed hero for service pages, utility pages and
 * any other sub-page that needs a homepage-tier above-the-fold.
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
 * The visual treatment is a direct mirror of the homepage hero:
 *
 *   - Exact homepage gradient stops (sage-800 family,
 *     88 / 72 / 38 / 6%) plus the homepage's mobile-only top-up
 *     overlay (25 / 18 / 10%)
 *   - `clamp()` headline sizing + `-0.025em` letter-spacing +
 *     line-height 1.08, matching the homepage h1
 *   - `text-white/55` tiny uppercase tracked eyebrow, matching homepage
 *   - `text-white/85` subtitle at `max-w-[26rem]`, matching homepage
 *   - Optional sage-300 colour highlight on a substring of the title
 *   - Rounded-full white primary CTA + ghost-outline secondary CTA,
 *     identical to the homepage CTA classes
 *   - Optional inline trust row (icon + label + separators) that
 *     mirrors the homepage trust row exactly — pair with the exported
 *     `DEFAULT_TRUST_ITEMS` for cleaning service pages
 *   - Optional chip row (white-pill style) sits below the trust row
 *     when both are present, matching homepage stack order
 */

export interface SubpageHeroCta {
  label: string
  href: string
}

export interface SubpageHeroChip {
  label: string
}

export interface SubpageHeroTrustItem {
  label: string
  icon: LucideIcon
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
  /**
   * Secondary call-to-action, rendered as a ghost outline button. By
   * convention, cleaning service pages should leave this unset; non-
   * cleaning / utility pages may use it (e.g. "Explore Services") or
   * cleaning pages may use it for an anchor link such as
   * "See the 100-Point Checklist".
   */
  secondaryCta?: SubpageHeroCta
  /**
   * Optional inline trust row beneath the CTAs. Pair with the exported
   * `DEFAULT_TRUST_ITEMS` for cleaning service pages. Visually matches
   * the homepage trust row (icon + label + thin separators).
   */
  trustItems?: ReadonlyArray<SubpageHeroTrustItem>
  /** Optional row of chips beneath the trust row. */
  chips?: ReadonlyArray<SubpageHeroChip>
  /** Text alignment. Default: `'left'`. */
  align?: 'left' | 'center'
  /**
   * Height variant. `'standard'` = 520px (top-level service pages),
   * `'compact'` = 380px (utility pages). Default: `'standard'`.
   */
  size?: 'standard' | 'compact'
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

/**
 * Canonical trust row for cleaning service pages. Cleaning service
 * heroes should pass `trustItems={DEFAULT_TRUST_ITEMS}` so the row
 * stays consistent across services. Non-cleaning / utility pages
 * typically omit `trustItems` entirely.
 */
export const DEFAULT_TRUST_ITEMS: ReadonlyArray<SubpageHeroTrustItem> = [
  { label: 'Insured',                icon: ShieldCheck },
  { label: 'Vetted teams',           icon: UserCheck },
  { label: 'Auckland wide',          icon: MapPin },
  { label: 'Satisfaction guarantee', icon: BadgeCheck },
]

const SIZE_HEIGHT_CLASS: Record<NonNullable<SubpageHeroProps['size']>, string> = {
  standard: 'h-[520px]',
  compact: 'h-[380px]',
}

/**
 * Exact homepage hero gradient stops. Single source of truth — any
 * sub-page hero overlay must match this so the visual tier stays
 * consistent across the site.
 */
const HOMEPAGE_BASE_OVERLAY =
  'linear-gradient(to right, rgba(6,35,29,0.88) 0%, rgba(6,35,29,0.72) 30%, rgba(6,35,29,0.38) 55%, rgba(6,35,29,0.06) 100%)'

const HOMEPAGE_MOBILE_OVERLAY =
  'linear-gradient(to right, rgba(6,35,29,0.25) 0%, rgba(6,35,29,0.18) 50%, rgba(6,35,29,0.10) 100%)'

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
  trustItems,
  chips,
  align = 'left',
  size = 'standard',
  imagePosition = 'object-center',
  animate = true,
}: SubpageHeroProps) {
  const isCentred = align === 'center'
  const heightClass = SIZE_HEIGHT_CLASS[size]
  const showTrust = trustItems && trustItems.length > 0
  const showChips = chips && chips.length > 0
  const showCtas = Boolean(primaryCta || secondaryCta)

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

      {/* Base sage-800 gradient — exact mirror of the homepage hero. */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: HOMEPAGE_BASE_OVERLAY }}
      />

      {/* Mobile-only top-up overlay — small screens render the photograph
          full-bleed behind the text, so a slightly stronger overall wash
          keeps the white type readable. Same values as the homepage. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 md:hidden"
        style={{ background: HOMEPAGE_MOBILE_OVERLAY }}
      />

      {/* Content */}
      <div
        className={[
          'relative z-10 flex w-full flex-col justify-center section-padding py-8',
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
                className={`mb-4 text-[0.6875rem] font-semibold uppercase tracking-[0.2em] text-white/55 ${riseClass(
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
                  isCentred ? 'mx-auto max-w-[26rem]' : 'max-w-[26rem]',
                  showCtas || showTrust || showChips ? 'mb-7' : '',
                  riseClass(animate),
                ].join(' ')}
                style={riseStyle(animate, 0.16)}
              >
                {subtitle}
              </p>
            )}

            {showCtas && (
              <div
                className={[
                  'flex flex-wrap gap-3',
                  showTrust || showChips ? 'mb-6' : '',
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

            {showTrust && (
              <div
                className={[
                  'flex flex-wrap items-center gap-x-3 gap-y-2 text-[11px] font-medium text-white/85',
                  showChips ? 'mb-4' : '',
                  isCentred ? 'justify-center' : '',
                  riseClass(animate),
                ].join(' ')}
                style={riseStyle(animate, 0.32)}
              >
                {trustItems.map(({ label, icon: Icon }, i) => (
                  <span key={label} className="inline-flex items-center gap-x-3">
                    {i > 0 && (
                      <span
                        aria-hidden="true"
                        className="hidden h-3 w-px bg-white/25 sm:inline-block"
                      />
                    )}
                    <span className="inline-flex items-center gap-1.5">
                      <Icon size={14} strokeWidth={1.75} aria-hidden="true" />
                      {label}
                    </span>
                  </span>
                ))}
              </div>
            )}

            {showChips && (
              <div
                className={[
                  'flex flex-wrap gap-2',
                  isCentred ? 'justify-center' : '',
                  riseClass(animate),
                ].join(' ')}
                style={riseStyle(animate, 0.4)}
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
