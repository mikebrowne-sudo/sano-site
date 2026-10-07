import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import clsx from 'clsx'
import { createClient } from '@/lib/supabase-server'
import { isFinanceUser } from '@/lib/is-admin'
import { formatCurrency } from '@/lib/format'

export const dynamic = 'force-dynamic'

function fmt(iso: string | null) { if (!iso) return '—'; const d = new Date(iso); return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' }) }
const FILE_TONE: Record<string, string> = { not_filed: 'bg-amber-50 text-amber-700', filed: 'bg-sky-50 text-sky-700', accepted: 'bg-emerald-50 text-emerald-700', correction_required: 'bg-red-50 text-red-700' }

export default async function ContractorWithholdingPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isFinanceUser(user)) notFound()

  const { data: lines } = await supabase
    .from('contractor_withholding_lines')
    .select('id, line_number, contractor_id, payday, supply_date, withholding_rate, withholding_amount, filing_status, status, contractors ( full_name )')
    .eq('status', 'active').order('payday', { ascending: false })

  const active = (lines ?? []) as Array<Record<string, unknown>>
  const total = active.reduce((s, l) => s + Number(l.withholding_amount ?? 0), 0)

  return (
    <div className="max-w-5xl">
      <Link href="/portal/payroll" className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800 mb-4"><ArrowLeft size={14} /> Payroll</Link>
      <h1 className="text-3xl font-bold text-sage-800 tracking-tight mb-1">Contractor schedular withholding</h1>
      <p className="text-sm text-sage-500 mb-6">Withholding owed to IRD, each line frozen from an approved contractor payment snapshot. Filing is recorded manually; payments are recorded, not initiated. No tax is deducted here.</p>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-sage-800">Active withholding lines</h2>
          <span className="text-sm text-sage-600 tabular-nums">Total {formatCurrency(total)}</span>
        </div>
        {active.length === 0 ? (
          <p className="text-sm text-sage-400">No contractor withholding lines yet. They are created from an approved payment snapshot on the contractor tax page.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-gray-100 text-left text-sage-600">
                {['Line', 'Contractor', 'Payday', 'Rate', 'Withholding', 'Filing'].map((h) => <th key={h} className={clsx('px-3 py-2 font-semibold', h === 'Withholding' && 'text-right')}>{h}</th>)}
              </tr></thead>
              <tbody>
                {active.map((l) => (
                  <tr key={l.id as string} className="border-b border-gray-50">
                    <td className="px-3 py-2 font-mono text-xs text-sage-700">{(l.line_number as string) ?? '—'}</td>
                    <td className="px-3 py-2 text-sage-700">{(l.contractors as { full_name?: string } | null)?.full_name ?? '—'}</td>
                    <td className="px-3 py-2 text-sage-600">{fmt(l.payday as string)}</td>
                    <td className="px-3 py-2 text-sage-600">{l.withholding_rate != null ? `${Math.round(Number(l.withholding_rate) * 100)}%` : '—'}</td>
                    <td className="px-3 py-2 text-right font-medium text-sage-800 tabular-nums">{formatCurrency(Number(l.withholding_amount ?? 0))}</td>
                    <td className="px-3 py-2"><span className={clsx('inline-block px-2 py-0.5 rounded-full text-xs font-medium', FILE_TONE[l.filing_status as string] ?? FILE_TONE.not_filed)}>{(l.filing_status as string).replace(/_/g, ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-[11px] text-sage-400 mt-3">Lines are immutable — a correction supersedes the original. No IRD filing is transmitted and no payment is initiated from Sano; both are recorded manually.</p>
      </div>
    </div>
  )
}
