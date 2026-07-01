// Full-page portal search — the deep-browse fallback behind the command
// palette (Cmd/Ctrl+K). Same shared searchPortal() engine, just a larger
// per-group cap and a persistent results page you can link to.

import Link from 'next/link'
import { createClient } from '@/lib/supabase-server'
import {
  FileText, Briefcase, Receipt, User, HardHat, ReceiptText, Banknote,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { GlobalSearch } from '../_components/GlobalSearch'
import { searchPortal, type SearchResultType } from '@/lib/portal-search'

export const dynamic = 'force-dynamic'

const TYPE_ICON: Record<SearchResultType, LucideIcon> = {
  quote: FileText,
  job: Briefcase,
  invoice: Receipt,
  client: User,
  contractor: HardHat,
  contractor_invoice: ReceiptText,
  remittance: Banknote,
}

export default async function PortalSearchPage({
  searchParams,
}: {
  searchParams: { q?: string }
}) {
  const supabase = createClient()
  const q = (searchParams.q ?? '').trim()

  if (!q) {
    return (
      <div className="max-w-3xl">
        <h1 className="text-2xl font-bold text-sage-800 tracking-tight mb-2">Search</h1>
        <p className="text-sm text-sage-500 mb-6">
          Find a quote, job, invoice, client, contractor, contractor invoice or remittance — by number
          (full or partial), address, name, or reference. Tip: press <kbd className="rounded border border-sage-200 bg-sage-50 px-1.5 py-0.5 text-[11px]">⌘K</kbd> anywhere.
        </p>
        <div className="max-w-md">
          <GlobalSearch />
        </div>
      </div>
    )
  }

  const groups = await searchPortal(supabase, q, { limit: 25 })
  const total = groups.reduce((n, g) => n + g.items.length, 0)

  return (
    <div className="max-w-4xl">
      <h1 className="text-2xl font-bold text-sage-800 tracking-tight mb-3">Search</h1>
      <div className="max-w-md mb-5">
        <GlobalSearch defaultValue={q} />
      </div>
      <p className="text-sm text-sage-500 mb-6">
        {total === 0 ? (
          <>Nothing matches <span className="font-medium text-sage-700">“{q}”</span>.</>
        ) : (
          <>{total} result{total === 1 ? '' : 's'} for <span className="font-medium text-sage-700">“{q}”</span>.</>
        )}
      </p>

      {total === 0 ? (
        <p className="text-sm text-sage-400">Try a different number, part of an address, or a client / contractor name.</p>
      ) : (
        <div className="space-y-6">
          {groups.map((g) => {
            const Icon = TYPE_ICON[g.type]
            return (
              <section key={g.type}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon size={15} className="text-sage-500" />
                  <h2 className="text-sm font-semibold text-sage-800">{g.label}</h2>
                  <span className="text-xs text-sage-400">{g.items.length}</span>
                </div>
                <div className="rounded-xl border border-sage-100 overflow-hidden divide-y divide-sage-50 bg-white">
                  {g.items.map((r) => (
                    <Link key={r.id} href={r.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-sage-50 transition-colors">
                      <span className="font-medium text-sage-800 whitespace-nowrap w-28 shrink-0 truncate">{r.title}</span>
                      {r.subtitle && <span className="text-sage-700 truncate flex-1 min-w-0">{r.subtitle}</span>}
                      {!r.subtitle && <span className="flex-1" />}
                      {r.meta && <span className="text-sage-400 text-sm truncate flex-1 min-w-0 hidden sm:block">{r.meta}</span>}
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
