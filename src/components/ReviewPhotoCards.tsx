'use client'

// Google reviews as a row of photo cards (chosen design, Oct 2026). Each card
// shows the reviewer's first name and stars over a real Sano photo; hover,
// focus or tap a card and it opens out to show the full review. The first
// card starts open. On phones the row becomes a swipeable strip with every
// card shown open. Reduced-motion: no transitions.

import { useState } from 'react'
import Image from 'next/image'

export interface PhotoCardReview {
  author: string
  rating: number
  text: string
  relativeTime: string
  photo: string
  /** Optional phrase from the review to pick out in green. */
  highlight?: string | null
}

function Stars({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={14} height={14} viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
            fill={value >= i - 0.25 ? '#7EC87A' : 'rgba(255,255,255,0.25)'}
          />
        </svg>
      ))}
    </span>
  )
}

/** First letters of the first and last words ("Kirsty-ann Ofamo'oni" → KO). */
function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const picked = parts.length > 1 ? [parts[0], parts[parts.length - 1]] : parts
  return picked.map((p) => p[0]!.toUpperCase()).join('')
}

/** Names as reviewers typed them, capitalised for display ("shirley" → "Shirley"). */
function displayName(name: string): string {
  // Word starts only, so "Kirsty-ann" keeps her own spelling.
  return name.replace(/(^|\s)([a-z])/g, (_m, a: string, b: string) => a + b.toUpperCase())
}

/** The review text with its highlight phrase (if found) in green. */
function Quote({ text, highlight }: { text: string; highlight?: string | null }) {
  const i = highlight ? text.toLowerCase().indexOf(highlight.toLowerCase()) : -1
  if (!highlight || i < 0) return <>&ldquo;{text}&rdquo;</>
  return (
    <>
      &ldquo;{text.slice(0, i)}
      <span className="font-semibold text-sage-300">{text.slice(i, i + highlight.length)}</span>
      {text.slice(i + highlight.length)}&rdquo;
    </>
  )
}

export function ReviewPhotoCards({ reviews }: { reviews: PhotoCardReview[] }) {
  const [open, setOpen] = useState(0)

  return (
    <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] md:h-[360px] md:snap-none md:overflow-visible">
      {reviews.map((r, i) => {
        const isOpen = open === i
        return (
          <article
            key={`${r.author}-${i}`}
            tabIndex={0}
            aria-label={`Review from ${displayName(r.author)}`}
            onMouseEnter={() => setOpen(i)}
            onFocus={() => setOpen(i)}
            onClick={() => setOpen(i)}
            className={`group relative h-[460px] shrink-0 basis-[82%] snap-center overflow-hidden rounded-[18px] bg-sage-800 outline-none transition-[flex-grow] duration-500 ease-[cubic-bezier(.2,.8,.2,1)] focus-visible:ring-2 focus-visible:ring-sage-300 focus-visible:ring-offset-2 motion-reduce:transition-none md:h-full md:min-w-0 md:shrink md:basis-0 md:cursor-pointer ${
              isOpen ? 'md:grow-[3.4]' : 'md:grow'
            }`}
          >
            <Image
              src={r.photo}
              alt=""
              fill
              sizes="(min-width: 768px) 45vw, 82vw"
              className={`object-cover transition-transform duration-700 motion-reduce:transition-none ${isOpen ? 'md:scale-[1.04]' : ''}`}
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{ background: 'linear-gradient(180deg, rgba(6,35,29,0.2) 0%, rgba(6,35,29,0.92) 72%)' }}
            />

            {/* Closed (desktop only): first name + stars. */}
            <div
              className={`absolute inset-x-0 bottom-[18px] z-[1] hidden text-center text-white transition-opacity duration-300 md:block ${
                isOpen ? 'md:opacity-0' : 'md:opacity-100'
              }`}
            >
              <span className="block text-[0.85rem] font-semibold">{displayName(r.author).split(' ')[0]}</span>
              <span className="mt-1.5 inline-block"><Stars value={r.rating} /></span>
            </div>

            {/* Open: the full review. Always shown on phones. */}
            <div
              className={`absolute inset-x-0 bottom-0 z-[1] grid gap-3 px-6 pb-6 pt-5 text-white transition-[opacity,transform] delay-150 duration-[400ms] motion-reduce:transition-none ${
                isOpen ? 'md:translate-y-0 md:opacity-100' : 'md:pointer-events-none md:translate-y-3 md:opacity-0'
              }`}
            >
              <Stars value={r.rating} />
              <blockquote className="m-0 font-display text-[1.02rem] leading-relaxed line-clamp-[10] md:line-clamp-[7]">
                <Quote text={r.text} highlight={r.highlight} />
              </blockquote>
              <div className="flex items-center gap-2.5">
                <span className="grid h-[38px] w-[38px] shrink-0 place-items-center rounded-full bg-sage-300 text-[0.8rem] font-semibold text-sage-800">
                  {initials(r.author)}
                </span>
                <span>
                  <span className="block text-[0.875rem] font-semibold">{displayName(r.author)}</span>
                  <span className="block text-[0.72rem] text-white/70">
                    Google review{r.relativeTime ? ` · ${r.relativeTime}` : ''}
                  </span>
                </span>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
