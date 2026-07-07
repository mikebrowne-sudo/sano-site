// Renders a casual employment agreement — the parties/details table, the
// static clauses, and (once signed) the signature block. Shared by the staff
// detail view and the public sign page.

import { EMPLOYER, CASUAL_AGREEMENT_SECTIONS } from '@/lib/employment-agreement-content'

export interface AgreementView {
  position: string | null
  hourlyRate: number | null
  startDate: string | null
  employeeFullName: string | null
  employeeAddress: string | null
  employeeIrdNumber: string | null
  taxCode: string | null
  kiwisaverChoice: string | null
  signedName: string | null
  signedAt: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function EmploymentAgreementDocument({ a }: { a: AgreementView }) {
  const rows: [string, string][] = [
    ['Employer', EMPLOYER.name],
    ['Employer GST No.', EMPLOYER.gstNo],
    ['Employee', a.employeeFullName || '—'],
    ['Employee address', a.employeeAddress || '—'],
    ['Employee IRD No.', a.employeeIrdNumber || '—'],
    ['Tax code', a.taxCode || '—'],
    ['KiwiSaver', a.kiwisaverChoice === 'opt_out' ? 'Opting out' : a.kiwisaverChoice === 'stay_in' ? 'Staying in' : '—'],
    ['Position', a.position || 'Cleaner (Casual)'],
    ['Commencement date', fmtDate(a.startDate)],
    ['Agreed hourly rate', a.hourlyRate != null ? `$${Number(a.hourlyRate).toFixed(2)} per hour (inclusive of 8% holiday pay)` : '—'],
  ]

  return (
    <div className="bg-white text-sage-800">
      <div className="border-b border-sage-200 pb-4 mb-5">
        <h1 className="text-2xl font-bold">Casual Employment Agreement</h1>
        <p className="text-sage-500 text-sm mt-0.5">{EMPLOYER.name}</p>
      </div>

      <div className="rounded-xl border border-sage-100 overflow-hidden mb-6">
        <table className="w-full text-sm">
          <tbody>
            {rows.map(([k, v], i) => (
              <tr key={i} className="border-b border-sage-50 last:border-0">
                <td className="py-2 px-4 text-sage-500 w-1/3 align-top">{k}</td>
                <td className="py-2 px-4 font-medium">{v}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-5">
        {CASUAL_AGREEMENT_SECTIONS.map((s) => (
          <section key={s.title}>
            <h2 className="font-semibold text-sage-800 mb-1.5">{s.title}</h2>
            <div className="space-y-1.5">
              {s.body.map((p, i) => (
                <p key={i} className="text-[13px] leading-relaxed text-sage-700">{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>

      {a.signedName && a.signedAt ? (
        <div className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-800">Signed by the Employee</p>
          <p className="text-sm text-emerald-700 mt-1">{a.signedName} · {fmtDate(a.signedAt)}</p>
          <p className="text-[11px] text-emerald-600 mt-1">Electronically signed — by typing their name the Employee confirmed they had read, understood, and agreed to this Agreement.</p>
        </div>
      ) : (
        <p className="mt-6 text-xs text-sage-400">
          This document is a template and should be reviewed by a qualified New Zealand employment lawyer before use.
        </p>
      )}
    </div>
  )
}
