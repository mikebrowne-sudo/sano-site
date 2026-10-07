import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import { ArrowLeft } from 'lucide-react'

export interface HubCard {
  href: string
  title: string
  desc: string
  icon: LucideIcon
}

export interface HubSection {
  heading?: string
  cards: HubCard[]
}

/**
 * A section-landing "hub" — a page of labelled cards that replaces a wall of flat
 * sidebar tabs. Used by the Pay / Reports / Marketing hubs. Every card is a
 * normal link to a route that still exists; nothing here is removed, just
 * organised one click down from the sidebar.
 */
export function HubGrid({
  title, intro, sections, backHref = '/portal', backLabel = 'Dashboard',
}: {
  title: string
  intro?: string
  sections: HubSection[]
  backHref?: string
  backLabel?: string
}) {
  return (
    <div className="max-w-5xl">
      <Link href={backHref} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4">
        <ArrowLeft size={14} /> {backLabel}
      </Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">{title}</h1>
      {intro && <p className="text-sm text-sage-500 mb-6 max-w-2xl">{intro}</p>}

      <div className="space-y-8">
        {sections.map((section, i) => (
          <section key={section.heading ?? i}>
            {section.heading && (
              <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-sage-400 mb-3">{section.heading}</h2>
            )}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {section.cards.map((c) => {
                const Icon = c.icon
                return (
                  <Link
                    key={c.href}
                    href={c.href}
                    className="group flex flex-col gap-1.5 rounded-xl border border-gray-100 bg-white p-4 shadow-sm hover:border-sage-200 hover:shadow transition-all"
                  >
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-sage-50 text-sage-600 group-hover:bg-sage-100">
                      <Icon size={18} />
                    </span>
                    <span className="mt-1 font-semibold text-sage-800">{c.title}</span>
                    <span className="text-[13px] text-sage-500 leading-snug">{c.desc}</span>
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
