'use client'

import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import {
  BadgeCheck,
  Bath,
  BedDouble,
  Briefcase,
  Check,
  ChefHat,
  DoorOpen,
  Hand,
  Info,
  PaintRoller,
  PanelTop,
  PlusCircle,
  Sofa,
  Sparkles,
  UtensilsCrossed,
  Warehouse,
  WashingMachine,
  type LucideIcon,
} from 'lucide-react'
import {
  type Checklist,
  type ChecklistRoom,
} from '@/types/checklist'

/** Lucide icon registry used by the tab row. Add new names here when a
 *  data file references an icon not yet imported. */
const ICON_MAP: Record<string, LucideIcon> = {
  BadgeCheck,
  Bath,
  BedDouble,
  Briefcase,
  ChefHat,
  DoorOpen,
  Hand,
  PaintRoller,
  PanelTop,
  PlusCircle,
  Sofa,
  Sparkles,
  UtensilsCrossed,
  Warehouse,
  WashingMachine,
}

function getIcon(name?: string): LucideIcon | null {
  if (!name) return null
  return ICON_MAP[name] ?? null
}

/**
 * Render a heading with an optional `highlight` substring emphasised in
 * Sano sage. Colour-only emphasis (no extra weight) — the heading itself
 * carries the semibold weight, the highlight differs only in colour so
 * the emphasis reads as refined rather than heavy.
 *
 * If `highlight` is omitted or not found in `heading`, falls back to
 * rendering `heading` as plain text.
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

interface ServiceChecklistProps {
  /** The data source for this section. */
  checklist: Checklist
  /** Small uppercase label above the heading. */
  eyebrow: string
  /** Optional paragraph beneath the heading. */
  intro?: string
  /**
   * Optional display string for the main `<h2>`. Defaults to `checklist.name`.
   * Use this when the data-file name carries a brand prefix that you want
   * dropped visually (e.g. data: "Sano 100-Point Home Clean Checklist",
   * heading: "100-Point Home Clean Checklist").
   */
  displayHeading?: string
  /**
   * Optional substring of the rendered heading to emphasise in sage-500
   * bold. If not provided, the heading renders as plain text.
   */
  headingHighlight?: string
  /** Becomes the section's `id` attribute. Defaults to `checklist.slug`. */
  anchorId?: string
  /**
   * When false, suppress the amber "Draft" badge in the section header
   * even if `checklist.isDraft` is true. Lets a service-page integration
   * opt out of the draft signal while the underlying data file still
   * carries the gating flag for internal preview surfaces. Default: true.
   */
  showDraftBadge?: boolean
  /** Render the bottom CTA strip. Default: false. */
  showQuoteCta?: boolean
  /** CTA destination. Default: '/contact'. */
  ctaHref?: string
  /** CTA text. Default: 'Get a free quote'. */
  ctaLabel?: string
}

export function ServiceChecklist({
  checklist,
  eyebrow,
  intro,
  displayHeading,
  headingHighlight,
  anchorId,
  showDraftBadge = true,
  showQuoteCta = false,
  ctaHref = '/contact',
  ctaLabel = 'Get a free quote',
}: ServiceChecklistProps) {
  const heading = displayHeading ?? checklist.name
  const sectionId = anchorId ?? checklist.slug
  const baseId = useId()
  const pillIdFor = (roomSlug: string) => `${baseId}-pill-${roomSlug}`
  const panelIdFor = (roomSlug: string) => `${baseId}-panel-${roomSlug}`

  const rooms = checklist.rooms
  const [activeSlug, setActiveSlug] = useState<string>(rooms[0]?.slug ?? '')
  const activeRoom = useMemo<ChecklistRoom | undefined>(
    () => rooms.find((r) => r.slug === activeSlug) ?? rooms[0],
    [rooms, activeSlug],
  )

  const pillRefs = useRef<Map<string, HTMLButtonElement>>(new Map())

  const focusRoom = useCallback((slug: string) => {
    const btn = pillRefs.current.get(slug)
    btn?.focus()
  }, [])

  const onPillKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>, currentSlug: string) => {
      const currentIndex = rooms.findIndex((r) => r.slug === currentSlug)
      if (currentIndex < 0) return

      let nextIndex: number | null = null
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
          nextIndex = (currentIndex + 1) % rooms.length
          break
        case 'ArrowLeft':
        case 'ArrowUp':
          nextIndex = (currentIndex - 1 + rooms.length) % rooms.length
          break
        case 'Home':
          nextIndex = 0
          break
        case 'End':
          nextIndex = rooms.length - 1
          break
        default:
          return
      }

      event.preventDefault()
      const nextSlug = rooms[nextIndex].slug
      setActiveSlug(nextSlug)
      focusRoom(nextSlug)
    },
    [rooms, focusRoom],
  )

  const draftBadgeVisible = showDraftBadge && checklist.isDraft === true

  return (
    <section
      id={sectionId}
      aria-labelledby={`${baseId}-heading`}
      className="section-y bg-sage-50 overflow-x-clip"
    >
      {/* Header — narrower container, centred */}
      <div className="section-padding">
        <div className="container-max">
          <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <p className="eyebrow">{eyebrow}</p>
            {draftBadgeVisible && (
              <span
                className="inline-flex items-center rounded-full border border-amber-200/70 bg-amber-50 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-amber-700"
                aria-label="Draft content — not final"
              >
                Draft
              </span>
            )}
          </div>

          <h2
            id={`${baseId}-heading`}
            className="mb-4 font-sans font-semibold text-sage-800"
            style={{ fontSize: 'clamp(1.875rem, 3vw, 2.5rem)', lineHeight: 1.15, letterSpacing: '-0.015em' }}
          >
            {renderHeading(heading, headingHighlight)}
          </h2>

          {intro && (
            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-sage-600">
              {intro}
            </p>
          )}
          </div>
        </div>
      </div>

      {/* Category tab row — full-width band so 10 categories fit on one
          desktop line at xl+ without a scrollbar AND without tiny tabs.
          Mobile and small-desktop (< xl) keep horizontal scroll. The
          section is overflow-x-clip so any rare spill at narrow viewports
          can never trigger a page-level horizontal scrollbar. */}
      <div className="mt-10 px-4 sm:px-6 xl:px-8">
        <div className="mx-auto max-w-none">
          <div
            role="tablist"
            aria-label={`${checklist.name} categories`}
            className="flex gap-1.5 overflow-x-auto pb-2 xl:flex-nowrap xl:justify-center xl:overflow-visible xl:pb-0"
          >
          {rooms.map((room) => {
            const isActive = room.slug === activeSlug
            const Icon = getIcon(room.icon)
            return (
              <button
                key={room.slug}
                ref={(el) => {
                  if (el) pillRefs.current.set(room.slug, el)
                  else pillRefs.current.delete(room.slug)
                }}
                id={pillIdFor(room.slug)}
                role="tab"
                type="button"
                aria-selected={isActive}
                aria-controls={panelIdFor(room.slug)}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveSlug(room.slug)}
                onKeyDown={(event) => onPillKeyDown(event, room.slug)}
                className={[
                  'inline-flex flex-shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-2 text-[13px] font-medium leading-none transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
                  isActive
                    ? 'border-sage-800 bg-sage-800 text-white shadow-sm'
                    : 'border-sage-200 bg-white text-sage-700 hover:border-sage-300 hover:bg-sage-50',
                ].join(' ')}
              >
                {Icon && (
                  <Icon
                    size={13}
                    strokeWidth={1.75}
                    aria-hidden="true"
                    className={isActive ? 'text-white' : 'text-sage-600'}
                  />
                )}
                <span>{room.name}</span>
              </button>
            )
          })}
          </div>
        </div>
      </div>

      {/* Active panel — items in standard container-max */}
      <div className="section-padding mt-8">
        <div className="container-max">
        {activeRoom && (
          <div
            key={activeRoom.slug}
            id={panelIdFor(activeRoom.slug)}
            role="tabpanel"
            aria-labelledby={pillIdFor(activeRoom.slug)}
            tabIndex={0}
            className="mt-8"
          >
            <div className="mb-6 flex items-baseline justify-between gap-3 border-b border-sage-200 pb-3">
              <h3 className="font-sans text-xl md:text-2xl font-bold text-sage-800">
                {activeRoom.name}
              </h3>
              <span
                className="flex-shrink-0 inline-flex items-center rounded-full bg-sage-100/70 px-3 py-1 text-[13px] font-medium text-sage-700"
                aria-hidden="true"
              >
                {activeRoom.items.length} {activeRoom.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {activeRoom.items.map((item, index) => (
                <li
                  key={`${activeRoom.slug}-${index}`}
                  className="flex min-h-[3.5rem] items-center gap-2.5 rounded-lg border border-sage-200 bg-white px-3.5 py-2"
                >
                  <Check
                    size={15}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    className="flex-shrink-0 text-sage-500"
                  />
                  <div className="min-w-0 text-sage-800">
                    <p className="text-[14px] leading-snug">{item.text}</p>
                    {item.note && (
                      <p className="mt-0.5 text-[11.5px] leading-snug text-sage-500">{item.note}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <p
              aria-live="polite"
              className="sr-only"
            >
              Showing {activeRoom.items.length} {activeRoom.items.length === 1 ? 'item' : 'items'} in {activeRoom.name}.
            </p>
          </div>
        )}

        {showQuoteCta && (
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-4 text-center">
            <p className="text-[0.875rem] text-sage-700">
              See something that matches your space?
            </p>
            <Link
              href={ctaHref}
              className="inline-flex items-center rounded-full bg-sage-800 px-5 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-sage-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500"
            >
              {ctaLabel}
            </Link>
          </div>
        )}

        {checklist.caveat && (
          <aside
            role="note"
            className="mx-auto mt-8 max-w-3xl rounded-lg border border-sage-200 bg-sage-50/60 px-4 py-3.5"
          >
            <div className="flex items-start gap-2.5">
              <Info
                size={16}
                strokeWidth={1.75}
                className="mt-0.5 flex-shrink-0 text-sage-600"
                aria-hidden="true"
              />
              <div className="min-w-0 text-sage-700">
                <p className="mb-1 text-[13px] font-semibold text-sage-800">
                  {checklist.caveatTitle ?? 'A quick note'}
                </p>
                <p className="text-[13px] leading-relaxed">
                  {checklist.caveat}
                </p>
              </div>
            </div>
          </aside>
        )}
        </div>
      </div>
    </section>
  )
}
