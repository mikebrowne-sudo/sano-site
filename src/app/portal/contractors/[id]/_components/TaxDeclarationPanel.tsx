// Staff view of an employee's current IR330 tax declaration. Shows the DECLARED
// tax code and the payroll-APPLIED tax code side by side, verification state,
// and a masked IRD number (full number only in the authorised print / PDF).

import { createClient } from '@/lib/supabase-server'
import { maskIrd } from '@/lib/tax-declaration'
import { VerifyTaxDeclarationForm } from './VerifyTaxDeclarationForm'
import { FileText } from 'lucide-react'

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_LABEL: Record<string, string> = {
  submitted: 'Awaiting verification',
  verified: 'Verified',
  superseded: 'Superseded',
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-sage-50 py-1 last:border-0">
      <dt className="text-sage-500">{k}</dt>
      <dd className="text-sage-800 font-medium text-right">{v}</dd>
    </div>
  )
}

export async function TaxDeclarationPanel({
  contractorId,
  appliedTaxCode,
  isAdmin,
}: {
  contractorId: string
  appliedTaxCode: string | null
  isAdmin: boolean
}) {
  const supabase = createClient()
  const [{ data: current }, { count: supersededCount }] = await Promise.all([
    supabase
      .from('worker_tax_declarations')
      .select('id, declaration_number, declared_tax_code, ird_number, has_student_loan, declaration_version, acknowledged, submitted_at, status, payroll_effective_date, verified_at')
      .eq('worker_id', contractorId)
      .neq('status', 'superseded')
      .maybeSingle(),
    supabase
      .from('worker_tax_declarations')
      .select('id', { count: 'exact', head: true })
      .eq('worker_id', contractorId)
      .eq('status', 'superseded'),
  ])

  return (
    <div className="bg-white rounded-xl border border-sage-100 shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-lg font-semibold text-sage-800">Tax declaration (IR330)</h2>
        {current && (
          <a href={`/api/tax-declarations/${current.id}/pdf`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-sage-600 hover:text-sage-800">
            <FileText size={13} /> PDF
          </a>
        )}
      </div>

      {!current ? (
        <p className="text-sm text-sage-600">
          No electronic tax declaration on file. This employee should complete a fresh IR330 declaration.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="rounded-lg border border-sage-100 bg-sage-50/40 p-3">
              <p className="text-[11px] text-sage-500">Declared by employee</p>
              <p className="text-xl font-semibold text-sage-800">{current.declared_tax_code}</p>
              <p className="text-[11px] text-sage-500 mt-0.5">{fmtDate(current.submitted_at)}</p>
            </div>
            <div className="rounded-lg border border-sage-100 bg-sage-50/40 p-3">
              <p className="text-[11px] text-sage-500">Applied in payroll</p>
              <p className="text-xl font-semibold text-sage-800">{appliedTaxCode || '—'}</p>
              <p className="text-[11px] text-sage-500 mt-0.5">{STATUS_LABEL[current.status] ?? current.status}</p>
            </div>
          </div>

          <dl className="grid sm:grid-cols-2 gap-x-6 text-sm mb-3">
            <Row k="Reference" v={current.declaration_number} />
            <Row k="IRD number" v={maskIrd(current.ird_number)} />
            <Row k="Student loan" v={current.has_student_loan ? 'Yes' : 'No'} />
            <Row k="Version" v={current.declaration_version} />
            <Row k="Acknowledged" v={current.acknowledged ? 'Yes' : 'No'} />
            <Row k="Status" v={STATUS_LABEL[current.status] ?? current.status} />
            {current.status === 'verified' && <Row k="Verified" v={fmtDate(current.verified_at)} />}
            {current.status === 'verified' && <Row k="Effective" v={fmtDate(current.payroll_effective_date)} />}
          </dl>

          {supersededCount ? (
            <p className="text-[11px] text-sage-400 mb-2">{supersededCount} superseded declaration{supersededCount === 1 ? '' : 's'} retained on record.</p>
          ) : null}

          {current.status === 'submitted' && isAdmin && (
            <VerifyTaxDeclarationForm
              declarationId={current.id}
              contractorId={contractorId}
              declaredTaxCode={current.declared_tax_code}
              appliedTaxCode={appliedTaxCode}
            />
          )}
          {current.status === 'submitted' && !isAdmin && (
            <p className="mt-3 text-[11px] text-amber-600">Awaiting admin verification — payroll stays on the current applied code until then.</p>
          )}
        </>
      )}
    </div>
  )
}
