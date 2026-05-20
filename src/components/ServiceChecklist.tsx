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
 * Render the checklist name with the "N-Point" portion emphasised in
 * Sano green, so the point-count claim reads as part of the headline
 * rather than an external chip. Bold-weight + sage-500 (Sano primary
 * green) — matches the bright accent emphasis on equivalent industry
 * checklist hero treatments. Falls back to plain text for any name
 * without an "N-Point" pattern (e.g. the Deep Clean Detail Checklist).
 */
function renderChecklistName(name: string): ReactNode {
  const match = name.match(/^(.*?)(\d+-Point)(.*)$/)
  if (!match) return name
  const [, before, point, after] = match
  return (
    <>
      {before}
      <span className="font-bold text-sage-500">{point}</span>
      {after}
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
  /** Becomes the section's `id` attribute. Defaults to `checklist.slug`. */
  anchorId?: string
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
  anchorId,
  showQuoteCta = false,
  ctaHref = '/contact',
  ctaLabel = 'Get a free quote',
}: ServiceChecklistProps) {
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

  const showDraftBadge = checklist.isDraft === true

  return (
    <section
      id={sectionId}
      aria-labelledby={`${baseId}-heading`}
      className="section-padding section-y bg-sage-50"
    >
      <div className="container-max">
        {/* Header — stacked eyebrow lead + large hero heading */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <p className="eyebrow">{eyebrow}</p>
            {showDraftBadge && (
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
            className="mb-4 font-sans font-bold text-sage-800"
            style={{ fontSize: 'clamp(1.875rem, 3vw, 2.5rem)', lineHeight: 1.15, letterSpacing: '-0.015em' }}
          >
            {renderChecklistName(checklist.name)}
          </h2>

          {intro && (
            <p className="mx-auto max-w-2xl text-[15px] leading-relaxed text-sage-600">
              {intro}
            </p>
          )}

          {checklist.caveat && (
            <aside
              role="note"
              className="mx-auto mt-5 max-w-2xl rounded-md border border-sage-200 bg-sage-50/70 px-4 py-3 text-left"
            >
              <div className="flex items-start gap-2.5">
                <Info
                  size={16}
                  strokeWidth={1.75}
                  className="mt-0.5 flex-shrink-0 text-sage-700"
                  aria-hidden="true"
                />
                <p className="text-[13px] leading-relaxed text-sage-700">
                  {checklist.caveat}
                </p>
              </div>
            </aside>
          )}
        </div>

        {/* Category tab row — single-line on desktop, horizontal-scroll fallback */}
        <div
          role="tablist"
          aria-label={`${checklist.name} categories`}
          className="mt-10 flex gap-1.5 overflow-x-auto pb-2 md:justify-center md:pb-0"
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
                  'inline-flex flex-shrink-0 snap-start items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[12.5px] font-medium leading-none transition-colors duration-150',
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

        {/* Active panel */}
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

            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeRoom.items.map((item, index) => (
                <li
                  key={`${activeRoom.slug}-${index}`}
                  className="flex items-start gap-2.5 rounded-lg border border-sage-200 bg-white px-4 py-3"
                >
                  <Check
                    size={16}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    className="mt-[3px] flex-shrink-0 text-sage-500"
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
      </div>
    </section>
  )
}
