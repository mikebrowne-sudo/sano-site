'use client'

// Portal command palette (Cmd/Ctrl+K). One box to jump anywhere: live
// search across quotes, jobs, invoices, clients, contractors, contractor
// invoices and remittances, plus quick nav to any portal section.
//
// - Opens on Cmd/Ctrl+K, or by clicking the topbar search button.
// - Type to search records (via /api/portal/search); nav shortcuts match
//   on section name.
// - Arrow keys move, Enter navigates, Esc closes.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search, FileText, Briefcase, Receipt, User, HardHat,
  ReceiptText, Banknote, CornerDownLeft, Loader2, ArrowRight,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { navGroupsFor } from './nav-config'
import type { SearchGroup, SearchResult, SearchResultType } from '@/lib/portal-search'

const TYPE_ICON: Record<SearchResultType, LucideIcon> = {
  quote: FileText,
  job: Briefcase,
  invoice: Receipt,
  client: User,
  contractor: HardHat,
  contractor_invoice: ReceiptText,
  remittance: Banknote,
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
  group: string
}

// Destinations that live INSIDE a hub (Pay / Reports / Marketing) rather than in
// the sidebar — added here so ⌘K still jumps straight to them by name. Keeps the
// sidebar lean while search reaches everything.
const HUB_DESTINATIONS: { href: string; label: string; group: string }[] = [
  { href: '/portal/contractor-invoices/pay-run', label: 'Pay run', group: 'Pay' },
  { href: '/portal/contractor-invoices/pending-approvals', label: 'Pending approvals', group: 'Pay' },
  { href: '/portal/contractor-invoices', label: 'Contractor invoices', group: 'Pay' },
  { href: '/portal/contractor-invoices/remittances', label: 'Remittances', group: 'Pay' },
  { href: '/portal/contractor-statements', label: 'Contractor statements', group: 'Pay' },
  { href: '/portal/payroll', label: 'Employee pay', group: 'Pay' },
  { href: '/portal/mileage', label: 'Mileage logbook', group: 'Pay' },
  { href: '/portal/finance/profit-loss', label: 'P&L statement', group: 'Reports' },
  { href: '/portal/finance/job-margins', label: 'Job margins', group: 'Reports' },
  { href: '/portal/finance/reconcile', label: 'Bank reconciliation', group: 'Reports' },
  { href: '/portal/finance/contractor-tax-remediation', label: 'Contractor tax remediation', group: 'Reports' },
  { href: '/portal/leads', label: 'Leads', group: 'Marketing' },
  { href: '/portal/campaigns', label: 'Campaigns', group: 'Marketing' },
  { href: '/portal/reviews', label: 'Reviews', group: 'Marketing' },
  { href: '/portal/jobs/calendar', label: 'Calendar', group: 'Operations' },
  { href: '/portal/staff', label: 'Staff', group: 'People' },
  { href: '/portal/settings/accountants', label: 'Accountant access', group: 'System' },
  { href: '/portal/settings/archive', label: 'Archived records', group: 'System' },
]

// Flattened, navigable portal destinations: sidebar nav items + hub children.
function useNavItems(): NavItem[] {
  return useMemo(() => {
    const out: NavItem[] = []
    for (const group of navGroupsFor(false)) {
      for (const item of group.items) {
        if (item.placeholder) continue
        out.push({ href: item.href, label: item.label, icon: item.icon, group: group.heading })
      }
    }
    // Hub children — same icon as a generic destination (reuse the first nav icon
    // so ⌘K rows stay visually consistent without importing more icons).
    const fallbackIcon = out[0]?.icon
    for (const d of HUB_DESTINATIONS) {
      if (out.some((o) => o.href === d.href)) continue
      out.push({ href: d.href, label: d.label, icon: fallbackIcon, group: d.group })
    }
    return out
  }, [])
}

type Flat =
  | { kind: 'nav'; item: NavItem }
  | { kind: 'result'; item: SearchResult }

export function CommandPalette() {
  const router = useRouter()
  const navItems = useNavItems()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [groups, setGroups] = useState<SearchGroup[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setQ('')
    setGroups([])
    setActive(0)
  }, [])

  // Global Cmd/Ctrl+K to open, Esc to close.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setOpen((v) => !v)
      } else if (e.key === 'Escape' && open) {
        close()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  // Focus the input when opened.
  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  // Debounced live search.
  useEffect(() => {
    if (!open) return
    const term = q.trim()
    if (term.length < 2) {
      setGroups([])
      setLoading(false)
      return
    }
    setLoading(true)
    const ctrl = new AbortController()
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/portal/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal })
        if (!res.ok) { setGroups([]); return }
        const json = (await res.json()) as { groups: SearchGroup[] }
        setGroups(json.groups ?? [])
        setActive(0)
      } catch {
        /* aborted or network — ignore */
      } finally {
        setLoading(false)
      }
    }, 180)
    return () => { clearTimeout(t); ctrl.abort() }
  }, [q, open])

  // Nav shortcuts matching the query (all when empty).
  const navMatches = useMemo(() => {
    const term = q.trim().toLowerCase()
    const matched = term
      ? navItems.filter((n) => n.label.toLowerCase().includes(term) || n.group.toLowerCase().includes(term))
      : navItems
    return matched.slice(0, term ? 6 : navItems.length)
  }, [q, navItems])

  // Flat, ordered list for keyboard navigation: nav first, then results.
  const flat: Flat[] = useMemo(() => {
    const f: Flat[] = navMatches.map((item) => ({ kind: 'nav' as const, item }))
    for (const g of groups) for (const item of g.items) f.push({ kind: 'result' as const, item })
    return f
  }, [navMatches, groups])

  const go = useCallback((href: string) => {
    close()
    router.push(href)
  }, [close, router])

  function onInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => Math.min(i + 1, flat.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const sel = flat[active]
      if (sel) go(sel.item.href)
      else if (q.trim()) go(`/portal/search?q=${encodeURIComponent(q.trim())}`)
    }
  }

  // Keep the active row scrolled into view.
  useEffect(() => {
    if (!open) return
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [active, open])

  const term = q.trim()
  let flatIdx = 0

  return (
    <>
      {/* Topbar trigger — looks like a search field */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group flex w-full items-center gap-2 rounded-lg border border-sage-200 bg-sage-50/40 px-3 py-1.5 text-sm text-sage-400 hover:border-sage-300 hover:bg-white transition-colors"
      >
        <Search size={15} className="text-sage-400" />
        <span className="flex-1 text-left">Search everything…</span>
        <kbd className="hidden lg:inline-flex items-center gap-0.5 rounded border border-sage-200 bg-white px-1.5 py-0.5 text-[10px] font-medium text-sage-500">
          ⌘K
        </kbd>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-sage-900/30 backdrop-blur-sm px-4 pt-[12vh] print:hidden"
          onMouseDown={close}
          role="dialog"
          aria-modal="true"
          aria-label="Search and navigate"
        >
          <div
            className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-sage-100 overflow-hidden"
            onMouseDown={(e) => e.stopPropagation()}
          >
            {/* Input */}
            <div className="flex items-center gap-3 px-4 border-b border-sage-100">
              <Search size={18} className="text-sage-400 shrink-0" />
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={onInputKeyDown}
                placeholder="Search quotes, jobs, invoices, clients, contractors… or jump to a section"
                className="flex-1 py-3.5 text-sm text-sage-800 placeholder:text-sage-400 focus:outline-none"
              />
              {loading && <Loader2 size={16} className="text-sage-400 animate-spin shrink-0" />}
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
              {/* Nav shortcuts */}
              {navMatches.length > 0 && (
                <Section label={term ? 'Go to' : 'Jump to a section'}>
                  {navMatches.map((n) => {
                    const idx = flatIdx++
                    const Icon = n.icon
                    return (
                      <Row
                        key={`nav-${n.href}`}
                        idx={idx}
                        activeIdx={active}
                        onHover={() => setActive(idx)}
                        onClick={() => go(n.href)}
                        icon={<Icon size={15} className="text-sage-500" />}
                        title={n.label}
                        subtitle={n.group}
                        badge={<ArrowRight size={13} className="text-sage-300" />}
                      />
                    )
                  })}
                </Section>
              )}

              {/* Record results */}
              {groups.map((g) => {
                const Icon = TYPE_ICON[g.type]
                return (
                  <Section key={g.type} label={g.label}>
                    {g.items.map((r) => {
                      const idx = flatIdx++
                      return (
                        <Row
                          key={`${g.type}-${r.id}`}
                          idx={idx}
                          activeIdx={active}
                          onHover={() => setActive(idx)}
                          onClick={() => go(r.href)}
                          icon={<Icon size={15} className="text-sage-500" />}
                          title={r.title}
                          subtitle={r.subtitle}
                          meta={r.meta}
                        />
                      )
                    })}
                  </Section>
                )
              })}

              {/* States */}
              {term.length >= 2 && !loading && groups.length === 0 && (
                <div className="px-4 py-6 text-center text-sm text-sage-400">
                  No records match “{term}”.
                  <button onClick={() => go(`/portal/search?q=${encodeURIComponent(term)}`)} className="block mx-auto mt-2 text-sage-600 hover:text-sage-800 underline">
                    Open full search
                  </button>
                </div>
              )}
              {term.length < 2 && (
                <p className="px-4 py-3 text-xs text-sage-400">Type at least 2 characters to search records — number, address, name, or reference.</p>
              )}
            </div>

            {/* Footer hint */}
            <div className="flex items-center gap-4 px-4 py-2 border-t border-sage-100 text-[11px] text-sage-400">
              <span className="inline-flex items-center gap-1"><CornerDownLeft size={12} /> open</span>
              <span>↑ ↓ move</span>
              <span>esc close</span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-2 pb-1">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-sage-400">{label}</div>
      {children}
    </div>
  )
}

function Row({
  idx, activeIdx, onHover, onClick, icon, title, subtitle, meta, badge,
}: {
  idx: number
  activeIdx: number
  onHover: () => void
  onClick: () => void
  icon: React.ReactNode
  title: string
  subtitle?: string | null
  meta?: string | null
  badge?: React.ReactNode
}) {
  const isActive = idx === activeIdx
  return (
    <button
      type="button"
      data-idx={idx}
      onMouseMove={onHover}
      onClick={onClick}
      className={`flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors ${isActive ? 'bg-sage-100' : 'hover:bg-sage-50'}`}
    >
      <span className="shrink-0">{icon}</span>
      <span className="font-medium text-sage-800 whitespace-nowrap">{title}</span>
      {subtitle && <span className="text-sage-500 text-sm truncate min-w-0 flex-1">{subtitle}</span>}
      {!subtitle && <span className="flex-1" />}
      {meta && <span className="text-sage-400 text-xs truncate max-w-[40%] hidden sm:block">{meta}</span>}
      {badge && <span className="shrink-0">{badge}</span>}
    </button>
  )
}
