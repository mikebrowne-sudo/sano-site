'use client'

import { useCallback, useId, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import Link from 'next/link'
import { Check, Info } from 'lucide-react'
import {
  type Checklist,
  type ChecklistRoom,
  totalChecklistItems,
} from '@/types/checklist'

/**
 * Render the checklist name with the "N-Point" portion emphasised in sage,
 * so the point-count claim feels like part of the headline rather than an
 * extra chip beside it. Falls back to plain text for any name without an
 * "N-Point" pattern (e.g. the Deep Clean Detail Checklist).
 */
function renderChecklistName(name: string): ReactNode {
  const match = name.match(/^(.*?)(\d+-Point)(.*)$/)
  if (!match) return name
  const [, before, point, after] = match
  return (
    <>
      {before}
      <span className="italic font-medium text-sage-600">{point}</span>
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

  const totalItems = totalChecklistItems(checklist)
  const showDraftBadge = checklist.isDraft === true

  return (
    <section
      id={sectionId}
      aria-labelledby={`${baseId}-heading`}
      className="section-padding section-y bg-white"
    >
      <div className="container-max">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center">
          <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
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

          <h2 id={`${baseId}-heading`} className="text-sage-800 mb-4">
            {renderChecklistName(checklist.name)}
          </h2>

          {intro && (
            <p className="body-text mx-auto max-w-2xl">{intro}</p>
          )}

          {checklist.caveat && (
            <aside
              role="note"
              className="mx-auto mt-5 max-w-2xl rounded-lg border border-sage-200 bg-sage-50 px-4 py-3 text-left"
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

        {/* Category tab row — flat selector, no inactive borders */}
        <div
          role="tablist"
          aria-label={`${checklist.name} categories`}
          className="mt-8 flex gap-1.5 overflow-x-auto pb-2 md:flex-wrap md:justify-center md:overflow-visible md:pb-0"
        >
          {rooms.map((room) => {
            const isActive = room.slug === activeSlug
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
                  'inline-flex flex-shrink-0 snap-start items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-medium leading-none transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sage-500',
                  isActive
                    ? 'bg-sage-800 text-white'
                    : 'bg-sage-50 text-sage-700 hover:bg-sage-100',
                ].join(' ')}
              >
                <span>{room.name}</span>
                <span
                  aria-hidden="true"
                  className={[
                    'inline-flex min-w-[1.125rem] items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-none',
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-sage-600',
                  ].join(' ')}
                >
                  {room.items.length}
                </span>
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
            <div className="mb-5 flex items-baseline justify-between gap-3 border-b border-sage-100 pb-3">
              <h3 className="text-sage-800 text-lg md:text-xl font-semibold">
                {activeRoom.name}
              </h3>
              <span
                className="flex-shrink-0 text-xs font-medium uppercase tracking-wider text-sage-500"
                aria-hidden="true"
              >
                {activeRoom.items.length} {activeRoom.items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <ul className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 xl:grid-cols-3">
              {activeRoom.items.map((item, index) => (
                <li
                  key={`${activeRoom.slug}-${index}`}
                  className="flex items-start gap-2 rounded-md border border-sage-100 bg-white px-3 py-2 transition-colors duration-150 hover:border-sage-200 hover:bg-sage-50/50"
                >
                  <Check
                    size={14}
                    strokeWidth={2.5}
                    aria-hidden="true"
                    className="mt-[3px] flex-shrink-0 text-sage-600"
                  />
                  <div className="min-w-0 text-sage-800">
                    <p className="text-[13px] leading-[1.35]">{item.text}</p>
                    {item.note && (
                      <p className="mt-0.5 text-[11px] leading-snug text-sage-500">{item.note}</p>
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

        {/* Footer count + CTA */}
        <div className="mt-8 text-center text-[11px] uppercase tracking-[0.15em] text-sage-500">
          {totalItems} items · {rooms.length} {rooms.length === 1 ? 'category' : 'categories'}
        </div>

        {showQuoteCta && (
          <div className="mx-auto mt-6 flex max-w-3xl flex-wrap items-center justify-center gap-4 rounded-xl border border-sage-100 bg-sage-50/60 px-5 py-4 text-center">
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
