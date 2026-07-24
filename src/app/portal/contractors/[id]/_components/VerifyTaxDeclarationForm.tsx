'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { verifyTaxDeclaration } from '../_actions-tax-declaration'
import { TAX_CODES } from '@/lib/nz-paye'
import { ShieldCheck, Loader2 } from 'lucide-react'

// Staff verification: confirm the payroll tax code to APPLY (defaults to the
// declared code, but staff may keep ND or choose another) and the effective
// date. This is the only way a declaration updates payroll.
export function VerifyTaxDeclarationForm({
  declarationId,
  contractorId,
  declaredTaxCode,
  appliedTaxCode,
}: {
  declarationId: string
  contractorId: string
  declaredTaxCode: string
  appliedTaxCode: string | null
}) {
  const router = useRouter()
  const [applied, setApplied] = useState(declaredTaxCode)
  const [effective, setEffective] = useState('')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  function submit() {
    setError('')
    startTransition(async () => {
      const r = await verifyTaxDeclaration({ declarationId, contractorId, appliedTaxCode: applied, payrollEffectiveDate: effective })
      if ('error' in r) { setError(r.error); return }
      router.refresh()
    })
  }

  return (
    <div className="mt-4 rounded-lg border border-sage-200 bg-sage-50/50 p-4 space-y-3">
      <p className="text-sm font-semibold text-sage-800">Verify &amp; apply</p>
      <p className="text-[11px] text-sage-500">
        Employee declared <span className="font-semibold">{declaredTaxCode}</span>; payroll is currently on{' '}
        <span className="font-semibold">{appliedTaxCode || '—'}</span>. Confirm the code to apply and when it takes effect.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="block text-[11px] font-medium text-sage-500 mb-1">Apply payroll tax code</span>
          <select value={applied} onChange={(e) => setApplied(e.target.value)} className={input}>
            {TAX_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[11px] font-medium text-sage-500 mb-1">Effective from <span className="text-red-500">*</span></span>
          <input type="date" value={effective} onChange={(e) => setEffective(e.target.value)} className={input} />
        </label>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button type="button" onClick={submit} disabled={pending}
        className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
        {pending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        {pending ? 'Verifying…' : 'Verify & apply'}
      </button>
    </div>
  )
}
