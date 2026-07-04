'use client'

import { useRef, useState, type ReactNode } from 'react'
import { motion, useInView } from 'framer-motion'

/**
 * Interactive accordion for the per-suburb FAQ block.
 *
 * Interaction family: PoliciesAccordion (circular chevron that flips and
 * fills sage on open, multiple items open at once) with the marketing
 * site's motion language on top (FadeIn/Stagger easing `[0.22,1,0.36,1]`,
 * scroll-reveal stagger, spring on the chevron).
 *
 * SEO contract: answers are collapsed with the CSS grid-rows trick, so the
 * full FAQ text stays in the DOM at all times — the FAQPage JSON-LD emitted
 * by SuburbLandingTemplate keeps matching visible page content.
 */

export interface SuburbFaqItem {
  q: string
  /** Rendered answer (may carry internal links). */
  body: ReactNode
}

const EASE = [0.22, 1, 0.36, 1] as const

export function SuburbFaqAccordion({ items }: { items: SuburbFaqItem[] }) {
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set())
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: '0px 0px -60px 0px' })

  const toggle = (i: number) => {
    setOpenIdx((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else next.add(i)
      return next
    })
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ visible: { transition: { staggerChildren: 0.07 } }, hidden: {} }}
      className="rounded-2xl border border-sage-100 bg-white overflow-hidden divide-y divide-sage-100"
    >
      {items.map((item, i) => {
        const isOpen = openIdx.has(i)
        const panelId = `suburb-faq-panel-${i}`
        return (
          <motion.div
            key={item.q}
            variants={{
              hidden: { opacity: 0, y: 20 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
            }}
          >
            <button
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              aria-controls={panelId}
              className={`w-full flex items-center justify-between gap-4 px-5 py-4 md:px-6 text-left transition-colors duration-150 ${
                isOpen ? 'bg-sage-50' : 'hover:bg-[#fafcfa]'
              }`}
            >
              <span className="font-semibold text-sage-800 text-[15px] leading-snug">{item.q}</span>
              {/* Chevron: white circle with border when closed, sage-filled when open */}
              <motion.span
                aria-hidden="true"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-colors duration-300 ${
                  isOpen ? 'bg-sage-700 text-white' : 'bg-white text-sage-500'
                }`}
                style={isOpen ? undefined : { border: '1px solid #c8dcd0' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path
                    d="M2 3.5L5 6.5L8 3.5"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </motion.span>
            </button>

            {/* Answer stays mounted (grid-rows collapse) so FAQPage schema
                always matches on-page content. */}
            <div
              id={panelId}
              className="grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
            >
              <div className="overflow-hidden">
                <p className="body-text px-5 md:px-6 pb-5 pt-0.5">{item.body}</p>
              </div>
            </div>
          </motion.div>
        )
      })}
    </motion.div>
  )
}
