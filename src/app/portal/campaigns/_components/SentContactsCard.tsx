'use client'

import { useState } from 'react'
import { Mail, ChevronDown, ChevronRight } from 'lucide-react'

export interface SentContact {
  company: string
  email: string | null
  sentAtDisplay: string | null
  replied: boolean
  bounced: boolean
}

/**
 * A card showing how many emails have been sent; click to expand the full list
 * of who was emailed (with sent time + reply/bounce status).
 */
export function SentContactsCard({ contacts }: { contacts: SentContact[] }) {
  const [open, setOpen] = useState(false)
  const count = contacts.length

  return (
    <div className="mb-8 rounded-xl border border-sage-100 bg-white overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 hover:bg-[#fafcfa]"
      >
        <span className="flex items-center gap-2.5">
          <Mail size={16} className="text-sage-500" />
          <span className="text-sm font-semibold text-sage-800">
            {count} email{count === 1 ? '' : 's'} sent
          </span>
          <span className="text-[12px] text-sage-400">— click to see who</span>
        </span>
        {open ? <ChevronDown size={16} className="text-sage-400" /> : <ChevronRight size={16} className="text-sage-400" />}
      </button>

      {open && (
        <div className="border-t border-sage-100 max-h-[420px] overflow-y-auto">
          {count === 0 ? (
            <p className="px-5 py-4 text-sm text-sage-500">Nothing sent yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-sage-50/90 backdrop-blur">
                <tr className="text-left text-[11px] uppercase tracking-wide text-sage-400">
                  <th className="px-5 py-2 font-semibold">Contact</th>
                  <th className="px-3 py-2 font-semibold">Sent</th>
                  <th className="px-3 py-2 font-semibold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sage-50">
                {contacts.map((c, i) => (
                  <tr key={`${c.email}-${i}`} className="hover:bg-[#fafcfa]">
                    <td className="px-5 py-2.5">
                      <div className="font-medium text-sage-800">{c.company}</div>
                      <div className="text-[11px] text-sage-400">{c.email}</div>
                    </td>
                    <td className="px-3 py-2.5 text-[12px] text-sage-500 tabular-nums whitespace-nowrap">{c.sentAtDisplay ?? '—'}</td>
                    <td className="px-3 py-2.5 text-right">
                      {c.replied ? <span className="text-[12px] font-semibold text-green-700">replied</span>
                        : c.bounced ? <span className="text-[12px] font-semibold text-red-600">bounced</span>
                        : <span className="text-[12px] text-sage-400">delivered</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
