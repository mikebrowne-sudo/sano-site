'use client'

// Google reviews slideshow — one review at a time with a gentle cross-fade.
// Auto-advances every 7s; pauses on hover/focus and when the tab is hidden;
// arrows, dots and swipe to move. Honours reduced-motion.
//
//   tone 'dark'  — large serif quote on the dark sage band (commercial page)
//   tone 'light' — compact, short quote on cream (homepage)

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface CarouselReview {
  author: string
  rating: number
  text: string
  relativeTime: string
}

const INTERVAL_MS = 7000

function Stars({ value, size, light }: { value: number; size: number; light: boolean }) {
  return (
    <span className="inline-flex gap-1" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 20 20" aria-hidden="true">
          <path
            d="M10 1.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9l-5.2 2.7 1-5.8L1.5 7.7l5.9-.9z"
            fill={value >= i - 0.25 ? (light ? '#076653' : '#7EC87A') : light ? '#E0EAE3' : 'rgba(255,255,255,0.18)'}
          />
        </svg>
      ))}
    </span>
  )
}

export function ReviewsCarousel({ reviews, tone = 'dark' }: { reviews: CarouselReview[]; tone?: 'dark' | 'light' }) {
  const light = tone === 'light'
  const reduce = useReducedMotion()
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const touchX = useRef<number | null>(null)
  const count = reviews.length

  const go = useCallback((delta: number) => setIndex((i) => (i + delta + count) % count), [count])

  useEffect(() => {
    if (reduce || paused || count < 2) return
    const t = setInterval(() => { if (!document.hidden) go(1) }, INTERVAL_MS)
    return () => clearInterval(t)
  }, [reduce, paused, count, go])

  if (count === 0) return null
  const r = reviews[index]

  const quoteClass = light
    ? 'mt-3 font-display text-[1.0625rem] leading-relaxed text-sage-800 sm:text-[1.125rem] line-clamp-4'
    : `mt-5 font-display leading-relaxed text-white line-clamp-[8] ${r.text.length > 280 ? 'text-[1.0625rem] sm:text-[1.25rem]' : 'text-[1.25rem] sm:text-[1.5rem]'}`
  const arrow = light
    ? 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-sage-200 text-sage-700 transition-colors hover:border-sage-500 hover:text-sage-800'
    : 'inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/25 text-white transition-colors hover:border-sage-300 hover:text-sage-300'

  return (
    <div
      className={`relative mx-auto ${light ? 'max-w-2xl' : 'max-w-3xl'}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
      onTouchEnd={(e) => {
        if (touchX.current == null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1)
        touchX.current = null
      }}
      aria-roledescription="carousel"
      aria-label="Customer reviews"
    >
      <div className={`relative ${light ? 'min-h-[170px]' : 'min-h-[300px] sm:min-h-[260px]'}`} aria-live={paused ? 'polite' : 'off'}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.figure
            key={index}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            className="flex flex-col items-center text-center"
            aria-roledescription="slide"
            aria-label={`Review ${index + 1} of ${count}`}
          >
            {!light && <span aria-hidden="true" className="font-display text-[72px] leading-none text-sage-300/60">&ldquo;</span>}
            <Stars value={r.rating} size={light ? 15 : 18} light={light} />
            <blockquote className={quoteClass}>{light ? <>&ldquo;{r.text}&rdquo;</> : r.text}</blockquote>
            <figcaption className={light ? 'mt-3' : 'mt-6'}>
              <span className={`block text-[0.9375rem] font-semibold ${light ? 'text-sage-800' : 'text-white'}`}>{r.author}</span>
              <span className={`mt-0.5 block text-xs uppercase tracking-[0.18em] ${light ? 'text-sage-500' : 'text-sage-300'}`}>
                Google review{r.relativeTime ? ` · ${r.relativeTime}` : ''}
              </span>
            </figcaption>
          </motion.figure>
        </AnimatePresence>
      </div>

      {count > 1 && (
        <div className={`${light ? 'mt-5' : 'mt-8'} flex items-center justify-center gap-4`}>
          <button type="button" onClick={() => go(-1)} aria-label="Previous review" className={arrow}>
            <ChevronLeft size={light ? 16 : 18} />
          </button>
          <div className="flex items-center gap-2">
            {reviews.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Show review ${i + 1}`}
                aria-current={i === index}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === index
                    ? `w-7 ${light ? 'bg-sage-500' : 'bg-sage-300'}`
                    : `w-2 ${light ? 'bg-sage-200 hover:bg-sage-300' : 'bg-white/30 hover:bg-white/60'}`
                }`}
              />
            ))}
          </div>
          <button type="button" onClick={() => go(1)} aria-label="Next review" className={arrow}>
            <ChevronRight size={light ? 16 : 18} />
          </button>
        </div>
      )}
    </div>
  )
}
