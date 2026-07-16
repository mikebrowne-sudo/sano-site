'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PenLine } from 'lucide-react'
import { signEmploymentAgreement } from '../_actions'

export function SignAgreementForm({ token, type }: { token: string; type: 'casual_employee' | 'contractor' }) {
  const router = useRouter()
  const isContractor = type === 'contractor'
  const [f, setF] = useState({
    fullName: '', preferredName: '', phone: '', email: '', address: '', dateOfBirth: '',
    ird: '', bankName: '', bank: '', taxCode: 'M', kiwisaver: 'opt_out',
    tradingName: '', gstNumber: '', insurerName: '', insuranceCover: '', insuranceExpiry: '',
    emName: '', emPhone: '', emRel: '', signedName: '',
  })
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }))

  function submit() {
    setError(null)
    if (!agreed) { setError('Please tick the box to confirm you agree.'); return }
    startTransition(async () => {
      const res = await signEmploymentAgreement({
        token,
        fullName: f.fullName, preferredName: f.preferredName, phone: f.phone, email: f.email,
        address: f.address, dateOfBirth: f.dateOfBirth, irdNumber: f.ird,
        bankAccountName: f.bankName, bankAccount: f.bank, taxCode: f.taxCode, kiwisaverChoice: f.kiwisaver,
        emergencyName: f.emName, emergencyPhone: f.emPhone, emergencyRelationship: f.emRel,
        tradingName: f.tradingName, gstNumber: f.gstNumber,
        insurerName: f.insurerName, insuranceCover: f.insuranceCover, insuranceExpiry: f.insuranceExpiry,
        signedName: f.signedName,
      })
      if (res.error) { setError(res.error); return }
      router.refresh()
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'
  const Field = ({ label, k, type: t = 'text', ph }: { label: string; k: keyof typeof f; type?: string; ph?: string }) => (
    <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">{label}</span>
      <input type={t} value={f[k]} onChange={set(k)} className={input} placeholder={ph} /></label>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-sage-800 mb-3">Your details</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Full legal name *" k="fullName" />
          <Field label="Preferred name" k="preferredName" />
          <Field label="Phone" k="phone" />
          <Field label="Email" k="email" type="email" />
          <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-[11px] font-medium text-sage-500">{isContractor ? 'Business / home address' : 'Residential address'}</span>
            <input value={f.address} onChange={set('address')} className={input} /></label>
          {!isContractor && <Field label="Date of birth" k="dateOfBirth" type="date" />}
          <Field label="IRD number" k="ird" ph="000-000-000" />
          {isContractor && <Field label="Trading name (if any)" k="tradingName" />}
          {isContractor && <Field label="GST number (if registered)" k="gstNumber" />}
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-sage-800 mb-3">Bank account (for pay)</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Account name" k="bankName" />
          <Field label="Account number" k="bank" ph="00-0000-0000000-00" />
          {!isContractor && <Field label="Tax code" k="taxCode" ph="M" />}
        </div>
        {!isContractor && (
          <div className="mt-3">
            <span className="text-[11px] font-medium text-sage-500">KiwiSaver</span>
            <div className="flex gap-4 mt-1 text-sm text-sage-700">
              <label className="flex items-center gap-2"><input type="radio" name="ks" checked={f.kiwisaver === 'opt_out'} onChange={() => setF((p) => ({ ...p, kiwisaver: 'opt_out' }))} /> Opt out</label>
              <label className="flex items-center gap-2"><input type="radio" name="ks" checked={f.kiwisaver === 'stay_in'} onChange={() => setF((p) => ({ ...p, kiwisaver: 'stay_in' }))} /> Stay in</label>
            </div>
          </div>
        )}
      </div>

      {isContractor && (
        <div>
          <h2 className="text-base font-semibold text-sage-800 mb-1">Insurance</h2>
          <p className="text-[11px] text-sage-400 mb-3">Minimum $1,000,000.00 public liability ($2,000,000.00 for commercial work). A current certificate must be provided before starting.</p>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Insurer" k="insurerName" />
            <Field label="Cover amount" k="insuranceCover" ph="$1,000,000.00" />
            <Field label="Policy expiry" k="insuranceExpiry" type="date" />
          </div>
        </div>
      )}

      <div>
        <h2 className="text-base font-semibold text-sage-800 mb-3">Emergency contact</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Name" k="emName" />
          <Field label="Phone" k="emPhone" />
          <Field label="Relationship" k="emRel" />
        </div>
      </div>

      <div className="border-t border-sage-100 pt-4 space-y-3">
        <h2 className="text-base font-semibold text-sage-800">Sign</h2>
        <label className="flex items-start gap-2 text-sm text-sage-700">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 rounded border-sage-300" />
          <span>I confirm the above is accurate, and I have read, understood, and agree to this {isContractor ? 'Independent Contractor Agreement' : 'Casual Employment Agreement'}.</span>
        </label>
        <Field label="Type your full name to sign *" k="signedName" ph="Your full name" />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <button type="button" onClick={submit} disabled={isPending}
        className="w-full inline-flex items-center justify-center gap-2 bg-sage-600 text-white font-semibold px-5 py-3 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
        {isPending ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />}
        {isPending ? 'Signing…' : 'Sign & submit'}
      </button>
    </div>
  )
}
