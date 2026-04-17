'use client'

import { useState, useTransition } from 'react'
import { createContractor, updateContractor } from '../_actions'
import clsx from 'clsx'

interface ContractorData {
  id?: string
  full_name: string
  email: string | null
  phone: string | null
  hourly_rate: number | null
  status: string
  worker_type: string
  notes: string | null
  // Payroll
  start_date: string | null
  end_date: string | null
  pay_frequency: string | null
  standard_hours: number | null
  holiday_pay_method: string | null
  ird_number: string | null
  tax_code: string | null
  ir330_received: boolean
  kiwisaver_enrolled: boolean
  kiwisaver_employee_rate: number | null
  kiwisaver_employer_rate: number | null
}

function toNum(v: string) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

const TAX_CODES = ['M', 'ME', 'SB', 'S', 'SH', 'ST', 'ND']

export function ContractorForm({ contractor }: { contractor?: ContractorData }) {
  const isEdit = !!contractor?.id

  const [fullName, setFullName] = useState(contractor?.full_name ?? '')
  const [email, setEmail] = useState(contractor?.email ?? '')
  const [phone, setPhone] = useState(contractor?.phone ?? '')
  const [hourlyRate, setHourlyRate] = useState(contractor?.hourly_rate != null ? String(contractor.hourly_rate) : '')
  const [status, setStatus] = useState(contractor?.status ?? 'active')
  const [workerType, setWorkerType] = useState(contractor?.worker_type ?? 'contractor')
  const [notes, setNotes] = useState(contractor?.notes ?? '')

  // Payroll
  const [startDate, setStartDate] = useState(contractor?.start_date ?? '')
  const [endDate, setEndDate] = useState(contractor?.end_date ?? '')
  const [payFrequency, setPayFrequency] = useState(contractor?.pay_frequency ?? 'fortnightly')
  const [standardHours, setStandardHours] = useState(contractor?.standard_hours != null ? String(contractor.standard_hours) : '')
  const [holidayPayMethod, setHolidayPayMethod] = useState(contractor?.holiday_pay_method ?? 'accrue_leave')
  const [irdNumber, setIrdNumber] = useState(contractor?.ird_number ?? '')
  const [taxCode, setTaxCode] = useState(contractor?.tax_code ?? 'M')
  const [ir330Received, setIr330Received] = useState(contractor?.ir330_received ?? false)
  const [ksEnrolled, setKsEnrolled] = useState(contractor?.kiwisaver_enrolled ?? false)
  const [ksEmployeeRate, setKsEmployeeRate] = useState(contractor?.kiwisaver_employee_rate != null ? String(contractor.kiwisaver_employee_rate) : '3')
  const [ksEmployerRate, setKsEmployerRate] = useState(contractor?.kiwisaver_employer_rate != null ? String(contractor.kiwisaver_employer_rate) : '3')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEmployee = workerType !== 'contractor'
  const isCasual = workerType === 'casual'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fullName.trim()) { setError('Full name is required.'); return }

    const input = {
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      hourly_rate: toNum(hourlyRate),
      status,
      worker_type: workerType,
      notes: notes.trim() || undefined,
      // Payroll (only sent for employees)
      ...(isEmployee ? {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        pay_frequency: payFrequency || undefined,
        standard_hours: toNum(standardHours),
        holiday_pay_method: holidayPayMethod || undefined,
        ird_number: irdNumber.trim() || undefined,
        tax_code: taxCode || 'M',
        ir330_received: ir330Received,
        kiwisaver_enrolled: ksEnrolled,
        kiwisaver_employee_rate: toNum(ksEmployeeRate),
        kiwisaver_employer_rate: toNum(ksEmployerRate),
      } : {}),
    }

    startTransition(async () => {
      const result = isEdit ? await updateContractor(contractor!.id!, input) : await createContractor(input)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">
      {/* Profile */}
      <Section title="Profile">
        <Field label="Full name" required value={fullName} onChange={setFullName} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
        </div>
        <Field label="Hourly rate ($)" type="number" step="0.01" min="0" value={hourlyRate} onChange={setHourlyRate} className="mt-4" />
      </Section>

      {/* Status + Worker Type */}
      <Section title="Status">
        <div className="flex gap-3 mb-4">
          <Btn active={status === 'active'} onClick={() => setStatus('active')} color="emerald">Active</Btn>
          <Btn active={status === 'inactive'} onClick={() => setStatus('inactive')} color="gray">Inactive</Btn>
        </div>
        <span className="block text-sm font-semibold text-sage-800 mb-2">Worker type</span>
        <div className="flex flex-wrap gap-2">
          {(['contractor', 'casual', 'part_time', 'full_time'] as const).map((t) => (
            <Btn key={t} active={workerType === t} onClick={() => setWorkerType(t)} color="sage">{t.replace('_', ' ')}</Btn>
          ))}
        </div>
      </Section>

      {/* Employment — only for employees */}
      {isEmployee && (
        <Section title="Employment">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Start date" type="date" value={startDate} onChange={setStartDate} />
            <Field label="End date" type="date" value={endDate} onChange={setEndDate} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <div>
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Pay frequency</span>
              <div className="flex gap-2">
                <Btn active={payFrequency === 'weekly'} onClick={() => setPayFrequency('weekly')} color="sage">Weekly</Btn>
                <Btn active={payFrequency === 'fortnightly'} onClick={() => setPayFrequency('fortnightly')} color="sage">Fortnightly</Btn>
              </div>
            </div>
            <Field label="Standard hours" type="number" step="0.5" min="0" value={standardHours} onChange={setStandardHours} placeholder="e.g. 40" />
          </div>
          <div className="mt-4">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Holiday pay method</span>
            <div className="flex gap-2">
              <Btn active={holidayPayMethod === 'accrue_leave'} onClick={() => setHolidayPayMethod('accrue_leave')} color="sage">Accrue leave</Btn>
              {isCasual && <Btn active={holidayPayMethod === 'pay_as_you_go_8_percent'} onClick={() => setHolidayPayMethod('pay_as_you_go_8_percent')} color="sage">Pay as you go (8%)</Btn>}
            </div>
            {!isCasual && holidayPayMethod === 'pay_as_you_go_8_percent' && (
              <p className="text-amber-600 text-xs mt-1">Pay-as-you-go is only for casual workers. Switching to accrue leave.</p>
            )}
          </div>
        </Section>
      )}

      {/* Tax */}
      {isEmployee && (
        <Section title="Tax">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="IRD number" value={irdNumber} onChange={setIrdNumber} placeholder="e.g. 12-345-678" />
            <div>
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Tax code</span>
              <div className="flex flex-wrap gap-2">
                {TAX_CODES.map((c) => (
                  <Btn key={c} active={taxCode === c} onClick={() => setTaxCode(c)} color={c === 'ND' ? 'red' : 'sage'}>{c}</Btn>
                ))}
              </div>
            </div>
          </div>
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input type="checkbox" checked={ir330Received} onChange={(e) => setIr330Received(e.target.checked)} className="rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
            <span className="text-sm text-sage-800">IR330 tax code declaration received</span>
          </label>
          {!ir330Received && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-3">
              <p className="text-amber-800 text-sm font-medium">IR330 not received</p>
              <p className="text-amber-700 text-xs mt-1">Tax code ND (no declaration) will apply until an IR330 is received. PAYE will be deducted at 45%.</p>
            </div>
          )}
        </Section>
      )}

      {/* KiwiSaver */}
      {isEmployee && (
        <Section title="KiwiSaver">
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={ksEnrolled} onChange={(e) => setKsEnrolled(e.target.checked)} className="rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
            <span className="text-sm text-sage-800">KiwiSaver enrolled</span>
          </label>
          {ksEnrolled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employee rate (%)" type="number" step="0.5" min="0" max="10" value={ksEmployeeRate} onChange={setKsEmployeeRate} />
              <Field label="Employer rate (%)" type="number" step="0.5" min="0" max="10" value={ksEmployerRate} onChange={setKsEmployerRate} />
            </div>
          )}
        </Section>
      )}

      {/* Notes */}
      <Section title="Notes">
        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any notes…" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm resize-y" />
      </Section>

      {error && <p className="text-red-600 text-sm bg-red-50 rounded-lg px-4 py-3">{error}</p>}

      <div className="flex items-center gap-4">
        <button type="submit" disabled={isPending} className="bg-sage-500 text-white font-semibold px-6 py-3 rounded-lg hover:bg-sage-700 transition-colors disabled:opacity-50">
          {isPending ? 'Saving…' : isEdit ? 'Save Changes' : 'Save'}
        </button>
        <a href={isEdit ? `/portal/contractors/${contractor!.id}` : '/portal/contractors'} className="text-sm text-sage-600 hover:text-sage-800">Cancel</a>
      </div>
    </form>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset><legend className="text-lg font-semibold text-sage-800 mb-4">{title}</legend>{children}</fieldset>
}

function Field({ label, required, className, value, onChange, ...rest }: { label: string; required?: boolean; className?: string; value: string; onChange: (v: string) => void; type?: string; step?: string; min?: string; max?: string; placeholder?: string }) {
  return (
    <label className={clsx('block', className)}>
      <span className="block text-sm font-semibold text-sage-800 mb-1.5">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} required={required} className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm" {...rest} />
    </label>
  )
}

function Btn({ active, onClick, color, children }: { active: boolean; onClick: () => void; color: string; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className={clsx('px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize',
      active
        ? color === 'emerald' ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
        : color === 'gray' ? 'bg-gray-200 text-gray-700 border border-gray-300'
        : color === 'red' ? 'bg-red-100 text-red-700 border border-red-300'
        : 'bg-sage-500 text-white'
        : 'bg-sage-100 text-sage-600 hover:bg-sage-200'
    )}>
      {children}
    </button>
  )
}
