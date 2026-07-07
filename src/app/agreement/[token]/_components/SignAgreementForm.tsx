'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PenLine } from 'lucide-react'
import { signEmploymentAgreement } from '../_actions'

export function SignAgreementForm({ token, type }: { token: string; type: 'casual_employee' | 'contractor' }) {
  const router = useRouter()
  const isContractor = type === 'contractor'
  const [fullName, setFullName] = useState('')
  const [address, setAddress] = useState('')
  const [ird, setIrd] = useState('')
  const [bank, setBank] = useState('')
  const [taxCode, setTaxCode] = useState('M')
  const [kiwisaver, setKiwisaver] = useState('opt_out')
  const [tradingName, setTradingName] = useState('')
  const [gstNumber, setGstNumber] = useState('')
  const [signedName, setSignedName] = useState('')
  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function submit() {
    setError(null)
    if (!agreed) { setError('Please tick the box to confirm you agree.'); return }
    startTransition(async () => {
      const res = await signEmploymentAgreement({
        token, fullName, address, irdNumber: ird, bankAccount: bank, taxCode, kiwisaverChoice: kiwisaver,
        tradingName, gstNumber, signedName,
      })
      if (res.error) { setError(res.error); return }
      router.refresh()
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-sage-800">Your details</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Full legal name *</span>
          <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={input} /></label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">IRD number</span>
          <input value={ird} onChange={(e) => setIrd(e.target.value)} className={input} placeholder="000-000-000" /></label>
        <label className="flex flex-col gap-1 sm:col-span-2"><span className="text-[11px] font-medium text-sage-500">{isContractor ? 'Business / home address' : 'Home address'}</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} /></label>
        {isContractor ? (
          <>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Trading name (if any)</span>
              <input value={tradingName} onChange={(e) => setTradingName(e.target.value)} className={input} /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">GST number (if registered)</span>
              <input value={gstNumber} onChange={(e) => setGstNumber(e.target.value)} className={input} /></label>
          </>
        ) : (
          <>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Bank account (for pay)</span>
              <input value={bank} onChange={(e) => setBank(e.target.value)} className={input} placeholder="00-0000-0000000-00" /></label>
            <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Tax code</span>
              <input value={taxCode} onChange={(e) => setTaxCode(e.target.value)} className={input} placeholder="M" /></label>
          </>
        )}
      </div>

      {!isContractor && (
        <div>
          <span className="text-[11px] font-medium text-sage-500">KiwiSaver</span>
          <div className="flex gap-4 mt-1 text-sm text-sage-700">
            <label className="flex items-center gap-2"><input type="radio" name="ks" checked={kiwisaver === 'opt_out'} onChange={() => setKiwisaver('opt_out')} /> Opt out</label>
            <label className="flex items-center gap-2"><input type="radio" name="ks" checked={kiwisaver === 'stay_in'} onChange={() => setKiwisaver('stay_in')} /> Stay in</label>
          </div>
        </div>
      )}

      <div className="border-t border-sage-100 pt-4 space-y-3">
        <h2 className="text-base font-semibold text-sage-800">Sign</h2>
        <label className="flex items-start gap-2 text-sm text-sage-700">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 rounded border-sage-300" />
          <span>I have read, understood, and agree to this {isContractor ? 'Independent Contractor Agreement' : 'Casual Employment Agreement'}.</span>
        </label>
        <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Type your full name to sign *</span>
          <input value={signedName} onChange={(e) => setSignedName(e.target.value)} className={input} placeholder="Your full name" /></label>
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
