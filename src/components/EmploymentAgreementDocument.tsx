// Renders an agreement (casual employment OR independent contractor) — the
// parties/details table, the static clauses for that type, and (once signed)
// the signature block. Shared by the staff detail view and the public page.

import { EMPLOYER, agreementTitle, agreementSections, type AgreementType } from '@/lib/employment-agreement-content'

export interface AgreementView {
  type: AgreementType
  position: string | null
  hourlyRate: number | null
  startDate: string | null
  employeeFullName: string | null
  employeeAddress: string | null
  employeeIrdNumber: string | null
  taxCode: string | null
  kiwisaverChoice: string | null
  contractorTradingName: string | null
  contractorGstNumber: string | null
  signedName: string | null
  signedAt: string | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function EmploymentAgreementDocument({ a }: { a: AgreementView }) {
  const isContractor = a.type === 'contractor'
  const signerLabel = isContractor ? 'Contractor' : 'Employee'

  const rows: [string, string][] = isContractor
    ? [
        ['Company', EMPLOYER.name],
        ['Company address', EMPLOYER.address],
        ['Company GST No.', EMPLOYER.gstNo],
        ['Contractor', a.employeeFullName || '—'],
        ['Trading name', a.contractorTradingName || '—'],
        ['Contractor address', a.employeeAddress || '—'],
        ['Contractor GST No.', a.contractorGstNumber || '—'],
        ['Contractor IRD No.', a.employeeIrdNumber || '—'],
        ['Commencement date', fmtDate(a.startDate)],
      ]
    : [
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
        <h1 className="text-2xl font-bold">{agreementTitle(a.type)}</h1>
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
        {agreementSections(a.type).map((s) => (
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
          <p className="text-sm font-semibold text-emerald-800">Signed by the {signerLabel}</p>
          <p className="text-sm text-emerald-700 mt-1">{a.signedName} · {fmtDate(a.signedAt)}</p>
          <p className="text-[11px] text-emerald-600 mt-1">Electronically signed — by typing their name the {signerLabel} confirmed they had read, understood, and agreed to this Agreement.</p>
        </div>
      ) : (
        <p className="mt-6 text-xs text-sage-400">
          This document is a template and should be reviewed by a qualified New Zealand {isContractor ? 'employment and commercial' : 'employment'} lawyer before use.
        </p>
      )}
    </div>
  )
}
