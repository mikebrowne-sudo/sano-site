'use client'

// Step-based onboarding wizard for the public (token-keyed) agreement flow.
// One step at a time, a full-width agreement view/modal, a progress indicator,
// Back/Continue, a final review-and-sign step, and localStorage persistence so a
// refresh or return via the same token keeps entered values. When the agreement
// is pre-linked to an existing worker, their known details pre-fill.
// Shared by contractor + employee.

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, PenLine, ArrowLeft, ArrowRight, Check, FileText, X, Pencil } from 'lucide-react'
import { signEmploymentAgreement } from '../_actions'
import { AgreementDocumentsUpload, type UploadedDoc } from './AgreementDocumentsUpload'
import { BUSINESS_STRUCTURES } from '@/lib/business-structure'
import { TAX_CODES, KS_EMPLOYEE_RATES } from '@/lib/nz-paye'
import { EmploymentAgreementDocument, type AgreementView } from '@/components/EmploymentAgreementDocument'

const INITIAL = {
  fullName: '', preferredName: '', phone: '', email: '', address: '', dateOfBirth: '',
  ird: '', bankName: '', bank: '', taxCode: 'M', kiwisaver: 'opt_out', kiwisaverRate: '3',
  tradingName: '', legalName: '', nzbn: '', companyNumber: '', gstNumber: '',
  insurerName: '', insuranceCover: '', insuranceExpiry: '',
  emName: '', emPhone: '', emRel: '', signedName: '',
}

export type FormValues = typeof INITIAL

export interface PrefillValues extends Partial<FormValues> {
  businessStructure?: string | null
  gstRegistered?: boolean | null
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric' })
}

const inputCls = 'w-full rounded-lg border border-sage-200 px-3 py-2.5 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'

// Module-level, stable field component. Defining this inside the wizard would
// recreate it on every keystroke and blow away input focus after one character.
function Field({ label, value, onChange, type = 'text', ph }: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  ph?: string
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-medium text-sage-500">{label}</span>
      <input type={type} value={value} onChange={onChange} placeholder={ph} className={inputCls} />
    </label>
  )
}

export function SignAgreementForm({
  token,
  type,
  initialDocs = [],
  agreement,
  prefill,
}: {
  token: string
  type: 'casual_employee' | 'permanent_employee' | 'contractor'
  initialDocs?: UploadedDoc[]
  agreement: AgreementView
  prefill?: PrefillValues
}) {
  const router = useRouter()
  const isContractor = type === 'contractor'
  const agreementName = type === 'contractor'
    ? 'Independent Contractor Agreement'
    : type === 'permanent_employee'
      ? 'Individual Employment Agreement'
      : 'Casual Employment Agreement'
  const storageKey = `sano_onboarding_${token}`

  const [f, setF] = useState<FormValues>(INITIAL)
  const [businessStructure, setBusinessStructure] = useState('')
  const [gstRegistered, setGstRegistered] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [step, setStep] = useState(0)
  const [showAgreement, setShowAgreement] = useState(false)
  const [restored, setRestored] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const set = (k: keyof FormValues) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }))

  // On mount: in-progress values (same token) win; otherwise pre-fill from the
  // linked worker's known details so nothing already captured is re-typed.
  useEffect(() => {
    let usedStorage = false
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const s = JSON.parse(raw)
        if (s.f) setF((p) => ({ ...p, ...s.f }))
        if (typeof s.businessStructure === 'string') setBusinessStructure(s.businessStructure)
        if (typeof s.gstRegistered === 'boolean') setGstRegistered(s.gstRegistered)
        if (typeof s.step === 'number') setStep(Math.min(s.step, 5))
        usedStorage = true
      }
    } catch { /* ignore */ }
    if (!usedStorage && prefill) {
      const { businessStructure: bs, gstRegistered: gr, ...rest } = prefill
      setF((p) => ({ ...p, ...Object.fromEntries(Object.entries(rest).filter(([, v]) => v != null && v !== '')) as Partial<FormValues> }))
      if (bs) setBusinessStructure(bs)
      if (typeof gr === 'boolean') setGstRegistered(gr)
    }
    setRestored(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  useEffect(() => {
    if (!restored) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ f: { ...f, signedName: '' }, businessStructure, gstRegistered, step }))
    } catch { /* ignore */ }
  }, [f, businessStructure, gstRegistered, step, restored, storageKey])

  const STEPS = isContractor
    ? ['Review agreement', 'Personal details', 'Business & tax', 'Payment & insurance', 'Documents', 'Review & sign']
    : ['Review agreement', 'Personal details', 'Tax & KiwiSaver', 'Payment', 'Documents', 'Review & sign']

  function validate(s: number): string | null {
    if (s === 1) {
      if (!f.fullName.trim()) return 'Please enter your full legal name.'
      if (!f.email.trim()) return 'Please enter your email so we can send your signed copy.'
    }
    if (s === 2 && isContractor && !businessStructure) return 'Please choose how you operate.'
    if (s === 3 && !f.bank.trim()) return 'Please enter your bank account number.'
    if (s === 5) {
      if (!agreed) return 'Please tick the box to confirm you agree.'
      if (f.signedName.trim().toLowerCase() !== f.fullName.trim().toLowerCase()) return 'Your signature must match your full legal name.'
    }
    return null
  }

  function scrollTop() { if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' }) }
  function next() {
    const err = validate(step)
    if (err) { setError(err); return }
    setError(null); setStep((s) => Math.min(s + 1, STEPS.length - 1)); scrollTop()
  }
  function back() { setError(null); setStep((s) => Math.max(s - 1, 0)); scrollTop() }
  function goTo(s: number) { setError(null); setStep(s); scrollTop() }

  function submit() {
    const err = validate(5)
    if (err) { setError(err); return }
    setError(null)
    startTransition(async () => {
      const res = await signEmploymentAgreement({
        token,
        fullName: f.fullName, preferredName: f.preferredName, phone: f.phone, email: f.email,
        address: f.address, dateOfBirth: f.dateOfBirth, irdNumber: f.ird,
        bankAccountName: f.bankName, bankAccount: f.bank, taxCode: f.taxCode, kiwisaverChoice: f.kiwisaver, kiwisaverRate: f.kiwisaverRate,
        emergencyName: f.emName, emergencyPhone: f.emPhone, emergencyRelationship: f.emRel,
        tradingName: f.tradingName, gstNumber: f.gstNumber,
        businessStructure, legalName: f.legalName, nzbn: f.nzbn, companyNumber: f.companyNumber, gstRegistered,
        insurerName: f.insurerName, insuranceCover: f.insuranceCover, insuranceExpiry: f.insuranceExpiry,
        signedName: f.signedName,
      })
      if (res.error) { setError(res.error); return }
      try { localStorage.removeItem(storageKey) } catch { /* ignore */ }
      router.refresh()
    })
  }

  const showLegalName = ['company', 'partnership', 'trust', 'other'].includes(businessStructure)
  const legalNameLabel = businessStructure === 'company' ? 'Legal company name'
    : businessStructure === 'partnership' ? 'Partnership name'
      : businessStructure === 'trust' ? 'Trust name' : 'Entity name'

  return (
    <div className="relative">
      {/* Progress indicator */}
      <ol className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const state = i < step ? 'done' : i === step ? 'current' : 'todo'
          return (
            <li key={label} className="flex items-center gap-1 shrink-0">
              <button type="button" onClick={() => i <= step && goTo(i)} disabled={i > step}
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  state === 'current' ? 'bg-sage-500 text-white' : state === 'done' ? 'bg-sage-100 text-sage-700 hover:bg-sage-200' : 'bg-sage-50 text-sage-400'
                }`}>
                <span className={`inline-flex items-center justify-center w-4 h-4 rounded-full text-[9px] ${state === 'done' ? 'bg-sage-500 text-white' : state === 'current' ? 'bg-white/25' : 'bg-sage-100'}`}>
                  {state === 'done' ? <Check size={10} /> : i + 1}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
              {i < STEPS.length - 1 && <span className="w-3 h-px bg-sage-200 hidden sm:block" />}
            </li>
          )
        })}
      </ol>

      <div className="min-h-[16rem]">
        {/* Step 0 — Review agreement */}
        {step === 0 && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-1">Review your agreement</h2>
            <p className="text-sm text-sage-500 mb-4">Please read your {isContractor ? 'Independent Contractor' : 'Employment'} Agreement. You can open the full document at any time, and you&rsquo;ll sign at the end.</p>
            <div className="grid sm:grid-cols-3 gap-3 mb-4">
              <div className="rounded-lg border border-sage-100 bg-sage-50/50 p-3"><p className="text-[11px] text-sage-500">Agreed rate</p><p className="text-sm font-semibold text-sage-800">{agreement.hourlyRate != null ? `$${Number(agreement.hourlyRate).toFixed(2)}/hr${isContractor ? ' (incl. GST)' : ''}` : '—'}</p></div>
              <div className="rounded-lg border border-sage-100 bg-sage-50/50 p-3"><p className="text-[11px] text-sage-500">Commences</p><p className="text-sm font-semibold text-sage-800">{fmtDate(agreement.startDate)}</p></div>
              <div className="rounded-lg border border-sage-100 bg-sage-50/50 p-3"><p className="text-[11px] text-sage-500">Version</p><p className="text-sm font-semibold text-sage-800">{agreement.agreementVersion || '—'}</p></div>
            </div>
            <button type="button" onClick={() => setShowAgreement(true)} className="inline-flex items-center gap-2 rounded-lg border border-sage-300 px-4 py-2.5 text-sm font-medium text-sage-700 hover:bg-sage-50">
              <FileText size={15} /> Read the full agreement
            </button>
          </div>
        )}

        {/* Step 1 — Personal details */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-4">Your details</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Full legal name *" value={f.fullName} onChange={set('fullName')} />
              <Field label="Preferred name" value={f.preferredName} onChange={set('preferredName')} />
              <Field label="Phone" value={f.phone} onChange={set('phone')} />
              <Field label="Email *" type="email" value={f.email} onChange={set('email')} />
              <label className="flex flex-col gap-1 sm:col-span-2 lg:col-span-3"><span className="text-[11px] font-medium text-sage-500">{isContractor ? 'Business / home address' : 'Residential address'}</span>
                <input value={f.address} onChange={set('address')} className={inputCls} /></label>
              {!isContractor && <Field label="Date of birth" type="date" value={f.dateOfBirth} onChange={set('dateOfBirth')} />}
              <Field label="IRD number" ph="000-000-000" value={f.ird} onChange={set('ird')} />
              {isContractor && <Field label="Trading name (if any)" value={f.tradingName} onChange={set('tradingName')} />}
            </div>
            <h3 className="text-sm font-semibold text-sage-800 mt-6 mb-3">Emergency contact</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Name" value={f.emName} onChange={set('emName')} />
              <Field label="Phone" value={f.emPhone} onChange={set('emPhone')} />
              <Field label="Relationship" value={f.emRel} onChange={set('emRel')} />
            </div>
          </div>
        )}

        {/* Step 2 — Business & tax (contractor) */}
        {step === 2 && isContractor && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-1">Your business</h2>
            <p className="text-[11px] text-sage-400 mb-3">How do you operate? This helps us set you up correctly.</p>
            <div className="flex flex-wrap gap-2 mb-4">
              {BUSINESS_STRUCTURES.map((b) => (
                <button key={b.value} type="button" onClick={() => setBusinessStructure(b.value)}
                  className={businessStructure === b.value ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-sage-500 text-white' : 'px-3 py-1.5 rounded-lg text-sm bg-sage-50 text-sage-700 border border-sage-200 hover:bg-sage-100'}>
                  {b.label}
                </button>
              ))}
            </div>
            {businessStructure && (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {showLegalName && (
                  <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">{legalNameLabel}</span>
                    <input value={f.legalName} onChange={set('legalName')} className={inputCls} /></label>
                )}
                <Field label="NZBN (if you have one)" ph="9429000000000" value={f.nzbn} onChange={set('nzbn')} />
                {businessStructure === 'company' && <Field label="Company number (if you have one)" value={f.companyNumber} onChange={set('companyNumber')} />}
              </div>
            )}
            <div className="mt-5">
              <span className="text-[11px] font-medium text-sage-500">Registered for GST?</span>
              <div className="flex gap-4 mt-1 text-sm text-sage-700">
                <label className="flex items-center gap-2"><input type="radio" name="gst" checked={!gstRegistered} onChange={() => setGstRegistered(false)} /> No</label>
                <label className="flex items-center gap-2"><input type="radio" name="gst" checked={gstRegistered} onChange={() => setGstRegistered(true)} /> Yes</label>
              </div>
              {gstRegistered && <div className="mt-2 max-w-xs"><Field label="GST number" ph="123-456-789" value={f.gstNumber} onChange={set('gstNumber')} /></div>}
            </div>
          </div>
        )}
        {/* Step 2 — Tax & KiwiSaver (employee) */}
        {step === 2 && !isContractor && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-4">Tax &amp; KiwiSaver</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="flex flex-col gap-1"><span className="text-[11px] font-medium text-sage-500">Tax code</span>
                <select value={f.taxCode} onChange={set('taxCode')} className={inputCls}>
                  {TAX_CODES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select></label>
            </div>
            <p className="text-[11px] text-sage-400 mt-2">Please complete an IR330 tax code declaration. Until we receive and verify it, PAYE is deducted at the no-notification rate; we correct it once your IR330 is confirmed (you can upload it in the Documents step).</p>
            <div className="mt-5">
              <span className="text-[11px] font-medium text-sage-500">KiwiSaver</span>
              <div className="flex gap-4 mt-1 text-sm text-sage-700">
                <label className="flex items-center gap-2"><input type="radio" name="ks" checked={f.kiwisaver === 'opt_out'} onChange={() => setF((p) => ({ ...p, kiwisaver: 'opt_out' }))} /> Opt out</label>
                <label className="flex items-center gap-2"><input type="radio" name="ks" checked={f.kiwisaver === 'stay_in'} onChange={() => setF((p) => ({ ...p, kiwisaver: 'stay_in' }))} /> Enrol</label>
              </div>
              {f.kiwisaver === 'stay_in' && (
                <label className="flex flex-col gap-1 max-w-[10rem] mt-2"><span className="text-[11px] font-medium text-sage-500">Contribution rate</span>
                  <select value={f.kiwisaverRate} onChange={set('kiwisaverRate')} className={inputCls}>
                    {KS_EMPLOYEE_RATES.map((r) => <option key={r} value={String(r)}>{r}%</option>)}
                  </select></label>
              )}
            </div>
          </div>
        )}

        {/* Step 3 — Payment & insurance / Payment */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-4">Payment{isContractor ? ' & insurance' : ''}</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Bank account name" value={f.bankName} onChange={set('bankName')} />
              <Field label="Bank account number *" ph="00-0000-0000000-00" value={f.bank} onChange={set('bank')} />
            </div>
            {isContractor && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-sage-800 mb-1">Insurance</h3>
                <p className="text-[11px] text-sage-400 mb-3">Minimum $1,000,000 public liability ($2,000,000 for commercial work). A current certificate must be provided before starting (you can upload it next).</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field label="Insurer" value={f.insurerName} onChange={set('insurerName')} />
                  <Field label="Cover amount" ph="$1,000,000" value={f.insuranceCover} onChange={set('insuranceCover')} />
                  <Field label="Policy expiry" type="date" value={f.insuranceExpiry} onChange={set('insuranceExpiry')} />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Documents */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-4">Documents</h2>
            <AgreementDocumentsUpload token={token} initialDocs={initialDocs} workerType={isContractor ? 'contractor' : 'employee'} structure={businessStructure} />
          </div>
        )}

        {/* Step 5 — Review & sign */}
        {step === 5 && (
          <div>
            <h2 className="text-lg font-semibold text-sage-800 mb-4">Review &amp; sign</h2>
            <div className="space-y-3">
              <ReviewBlock title="Your details" onEdit={() => goTo(1)} rows={[
                ['Name', f.fullName || '—'], ['Preferred', f.preferredName || '—'], ['Phone', f.phone || '—'], ['Email', f.email || '—'],
                ['Address', f.address || '—'], ['IRD', f.ird || '—'], ['Emergency', [f.emName, f.emPhone].filter(Boolean).join(' · ') || '—'],
              ]} />
              {isContractor ? (
                <>
                  <ReviewBlock title="Business & tax" onEdit={() => goTo(2)} rows={[
                    ['Structure', BUSINESS_STRUCTURES.find((b) => b.value === businessStructure)?.label || '—'],
                    ['Trading name', f.tradingName || '—'], ['Legal name', f.legalName || '—'], ['NZBN', f.nzbn || '—'],
                    ['GST', gstRegistered ? (f.gstNumber || 'Registered') : 'Not registered'],
                  ]} />
                  <ReviewBlock title="Payment & insurance" onEdit={() => goTo(3)} rows={[
                    ['Bank', f.bank || '—'], ['Insurer', f.insurerName || '—'], ['Cover', f.insuranceCover || '—'], ['Expiry', f.insuranceExpiry || '—'],
                  ]} />
                </>
              ) : (
                <>
                  <ReviewBlock title="Tax & KiwiSaver" onEdit={() => goTo(2)} rows={[
                    ['Tax code', f.taxCode || '—'], ['KiwiSaver', f.kiwisaver === 'stay_in' ? `Enrolled (${f.kiwisaverRate}%)` : 'Opted out'],
                  ]} />
                  <ReviewBlock title="Payment" onEdit={() => goTo(3)} rows={[['Bank name', f.bankName || '—'], ['Bank account', f.bank || '—']]} />
                </>
              )}
              <ReviewBlock title="Agreement" onEdit={() => setShowAgreement(true)} editLabel="View" rows={[
                ['Version', agreement.agreementVersion || '—'], ['Commences', fmtDate(agreement.startDate)],
                ['Agreed rate', agreement.hourlyRate != null ? `$${Number(agreement.hourlyRate).toFixed(2)}/hr${isContractor ? ' (incl. GST)' : ''}` : '—'],
              ]} />
            </div>

            <div className="border-t border-sage-100 mt-6 pt-5 space-y-3">
              <label className="flex items-start gap-2 text-sm text-sage-700">
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} className="mt-0.5 rounded border-sage-300" />
                <span>I confirm the above is accurate, and I have read, understood, and agree to this {agreementName}.</span>
              </label>
              <label className="flex flex-col gap-1 max-w-sm"><span className="text-[11px] font-medium text-sage-500">Type your full name to sign</span>
                <input value={f.signedName} onChange={set('signedName')} className={inputCls} placeholder={f.fullName || 'Your full legal name'} /></label>
            </div>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600 mt-4">{error}</p>}

      {/* Back / Continue (sticky) */}
      <div className="sticky bottom-0 -mx-5 sm:-mx-7 mt-6 flex items-center justify-between gap-3 border-t border-sage-100 bg-white/95 backdrop-blur px-5 sm:px-7 py-3">
        <button type="button" onClick={back} disabled={step === 0}
          className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-sage-600 hover:text-sage-800 disabled:opacity-40">
          <ArrowLeft size={15} /> Back
        </button>
        {step < 5 ? (
          <button type="button" onClick={next}
            className="inline-flex items-center gap-1.5 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700">
            Continue <ArrowRight size={15} />
          </button>
        ) : (
          <button type="button" onClick={submit} disabled={isPending}
            className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-5 py-2.5 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
            {isPending ? <Loader2 size={15} className="animate-spin" /> : <PenLine size={15} />}
            {isPending ? 'Signing…' : 'Sign agreement'}
          </button>
        )}
      </div>

      {/* Full agreement — full-screen overlay */}
      {showAgreement && (
        <div className="fixed inset-0 z-50 bg-sage-900/50 flex flex-col" role="dialog" aria-modal="true">
          <div className="flex items-center justify-between bg-white border-b border-sage-100 px-4 py-3 shrink-0">
            <span className="text-sm font-semibold text-sage-800">Your agreement</span>
            <button type="button" onClick={() => setShowAgreement(false)} className="inline-flex items-center gap-1.5 text-sm text-sage-600 hover:text-sage-800">
              <X size={16} /> Close
            </button>
          </div>
          <div className="flex-1 overflow-y-auto bg-sage-50/40 px-3 py-6">
            <div className="max-w-3xl mx-auto">
              <EmploymentAgreementDocument a={agreement} wrapper="share-page" />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ReviewBlock({ title, rows, onEdit, editLabel = 'Edit' }: { title: string; rows: [string, string][]; onEdit: () => void; editLabel?: string }) {
  return (
    <div className="rounded-xl border border-sage-100 p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-sage-800">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-[11px] font-medium text-sage-500 hover:text-sage-700">
          <Pencil size={11} /> {editLabel}
        </button>
      </div>
      <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-sage-50 py-1 last:border-0">
            <dt className="text-sage-500">{k}</dt><dd className="text-sage-800 font-medium text-right">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
