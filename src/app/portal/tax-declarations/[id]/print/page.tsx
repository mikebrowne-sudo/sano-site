// Formal, print-ready IR330 tax-declaration document. Rendered ENTIRELY from
// the immutable worker_tax_declarations record — never from mutable worker
// fields — so the PDF always represents exactly what was declared and agreed.
// Authorised staff view: shows the full IRD number.

import { createClient } from '@/lib/supabase-server'
import { isAdminUser } from '@/lib/is-admin'
import { notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'

function fmtDateTime(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function TaxDeclarationPrintPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!isAdminUser(user)) notFound()

  const { data: d } = await supabase
    .from('worker_tax_declarations')
    .select('*')
    .eq('id', params.id)
    .maybeSingle()
  if (!d) notFound()

  const decl = d as Record<string, unknown>
  const row = (label: string, value: string) => (
    <tr>
      <td style={{ padding: '6px 0', color: '#5b6b60', width: '42%', verticalAlign: 'top' }}>{label}</td>
      <td style={{ padding: '6px 0', color: '#1f2a24', fontWeight: 600 }}>{value}</td>
    </tr>
  )

  const status = decl.status as string
  const superseded = status === 'superseded'
  const verified = status === 'verified'

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", color: '#1f2a24', maxWidth: 720, margin: '0 auto', padding: '48px 40px', fontSize: 13, lineHeight: 1.55 }}>
      {/* Header */}
      <div style={{ borderBottom: '2px solid #076653', paddingBottom: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#076653' }}>Sano</div>
          <div style={{ fontSize: 11, color: '#8a978f' }}>Sano Property Services Limited</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>Employee Tax Code Declaration</div>
          <div style={{ fontSize: 11, color: '#8a978f' }}>IR330 · {decl.declaration_number as string}</div>
        </div>
      </div>

      {superseded && (
        <div style={{ background: '#fff4f4', border: '1px solid #f0c0c0', borderRadius: 8, padding: '8px 12px', marginBottom: 18, color: '#9a3a3a', fontSize: 12 }}>
          This declaration has been <strong>superseded</strong> by a later declaration and is retained as a record.
        </div>
      )}

      {/* Employee + declaration facts */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          {row('Employee', decl.employee_legal_name as string)}
          {row('IRD number', (decl.ird_number as string | null) || '—')}
          {row('Declared tax code', decl.declared_tax_code as string)}
          {row('Student loan', (decl.has_student_loan as boolean) ? 'Yes (via tax code)' : 'No')}
          {row('Declaration version', decl.declaration_version as string)}
          {row('Submitted', fmtDateTime(decl.submitted_at as string | null))}
        </tbody>
      </table>

      {/* Declaration statement */}
      <div style={{ background: '#f4f7f5', borderRadius: 8, padding: '14px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5b6b60', marginBottom: 6 }}>Declaration</div>
        <p style={{ margin: 0, color: '#33413a' }}>{decl.declaration_text as string}</p>
      </div>

      {/* Signature */}
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <tbody>
          {row('Electronic acknowledgement', (decl.acknowledged as boolean) ? 'Confirmed' : 'Not confirmed')}
          {row('Signed (typed name)', decl.signed_name as string)}
          {row('Submitted via', (decl.submitted_via as string) === 'agreement_wizard' ? 'Online onboarding' : (decl.submitted_via as string))}
        </tbody>
      </table>

      {/* Verification footer */}
      <div style={{ borderTop: '1px solid #e3e9e5', paddingTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#5b6b60', marginBottom: 8 }}>Payroll verification</div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <tbody>
            {row('Status', verified ? 'Verified' : superseded ? 'Superseded' : 'Awaiting staff verification')}
            {verified && row('Applied payroll tax code', (decl.applied_tax_code as string | null) || '—')}
            {verified && row('Effective from', fmtDate(decl.payroll_effective_date as string | null))}
            {verified && row('Verified', fmtDateTime(decl.verified_at as string | null))}
          </tbody>
        </table>
      </div>

      <p style={{ fontSize: 10, color: '#a7b1aa', marginTop: 28 }}>
        Declaration reference {decl.declaration_number as string} · This document represents the immutable declaration record retained by Sano Property Services Limited.
      </p>
    </div>
  )
}
