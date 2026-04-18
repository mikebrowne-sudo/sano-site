'use client'

import { useState, useTransition } from 'react'
import { createContractor, updateContractor } from '../_actions'
import { TAX_CODES, KS_EMPLOYEE_RATES, KS_DEFAULT_EMPLOYEE, KS_DEFAULT_EMPLOYER } from '@/lib/nz-paye'
import clsx from 'clsx'

const BUSINESS_STRUCTURES = [
  { value: 'sole_trader', label: 'Sole trader' },
  { value: 'company', label: 'Company' },
  { value: 'partnership', label: 'Partnership' },
  { value: 'trust', label: 'Trust' },
]

const SERVICE_AREAS = [
  { value: 'auckland_central', label: 'Auckland Central' },
  { value: 'north_shore', label: 'North Shore' },
  { value: 'west_auckland', label: 'West Auckland' },
  { value: 'south_auckland', label: 'South Auckland' },
  { value: 'east_auckland', label: 'East Auckland' },
]

const APPROVED_SERVICES = [
  { value: 'regular_clean', label: 'Regular clean' },
  { value: 'deep_clean', label: 'Deep clean' },
  { value: 'end_of_tenancy', label: 'End of tenancy' },
  { value: 'airbnb_turnover', label: 'Airbnb turnover' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'window', label: 'Window' },
  { value: 'carpet_upholstery', label: 'Carpet / upholstery' },
  { value: 'post_construction', label: 'Post-construction' },
  { value: 'specialist_high_access', label: 'High access' },
  { value: 'after_hours', label: 'After hours' },
]

interface ContractorData {
  id?: string
  full_name: string
  email: string | null
  phone: string | null
  hourly_rate: number | null
  base_hourly_rate: number | null
  loaded_hourly_rate: number | null
  holiday_pay_percent: number | null
  status: string
  worker_type: string
  notes: string | null
  // Payroll (employee)
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
  // Insurance
  insurance_provider: string | null
  insurance_policy_number: string | null
  insurance_expiry: string | null
  insurance_liability_cover: number | null
  // Business identity (contractor)
  company_name: string | null
  business_structure: string | null
  nzbn: string | null
  // GST (contractor)
  gst_registered: boolean
  gst_number: string | null
  // Payment (contractor)
  bank_account_name: string | null
  bank_account_number: string | null
  payment_terms_days: number | null
  // Compliance (shared)
  contract_signed_date: string | null
  right_to_work_required: boolean
  right_to_work_expiry: string | null
  // Operational (shared)
  service_areas: string[]
  approved_services: string[]
  availability_notes: string | null
  has_vehicle: boolean
  provides_own_equipment: boolean
  key_holding_approved: boolean
  alarm_access_approved: boolean
  pet_friendly: boolean
}

function toNum(v: string) {
  const n = parseFloat(v)
  return Number.isFinite(n) ? n : undefined
}

function toInt(v: string) {
  const n = parseInt(v, 10)
  return Number.isFinite(n) ? n : undefined
}

export function ContractorForm({ contractor }: { contractor?: ContractorData }) {
  const isEdit = !!contractor?.id

  // Profile (shared)
  const [fullName, setFullName] = useState(contractor?.full_name ?? '')
  const [email, setEmail] = useState(contractor?.email ?? '')
  const [phone, setPhone] = useState(contractor?.phone ?? '')
  const [status, setStatus] = useState(contractor?.status ?? 'active')
  const [workerType, setWorkerType] = useState(contractor?.worker_type ?? 'contractor')

  // Rate
  const [hourlyRate, setHourlyRate] = useState(contractor?.hourly_rate != null ? String(contractor.hourly_rate) : '')
  const [baseHourlyRate, setBaseHourlyRate] = useState(contractor?.base_hourly_rate != null ? String(contractor.base_hourly_rate) : '')
  const [holidayPayPercent, setHolidayPayPercent] = useState(contractor?.holiday_pay_percent != null ? String(contractor.holiday_pay_percent) : '8')

  // Employee-only payroll/tax/KS
  const [startDate, setStartDate] = useState(contractor?.start_date ?? '')
  const [endDate, setEndDate] = useState(contractor?.end_date ?? '')
  const [payFrequency, setPayFrequency] = useState(contractor?.pay_frequency ?? 'fortnightly')
  const [standardHours, setStandardHours] = useState(contractor?.standard_hours != null ? String(contractor.standard_hours) : '')
  const [holidayPayMethod, setHolidayPayMethod] = useState(contractor?.holiday_pay_method ?? 'accrue_leave')
  const [irdNumber, setIrdNumber] = useState(contractor?.ird_number ?? '')
  const [taxCode, setTaxCode] = useState(contractor?.tax_code ?? 'M')
  const [ir330Received, setIr330Received] = useState(contractor?.ir330_received ?? false)
  const [ksEnrolled, setKsEnrolled] = useState(contractor?.kiwisaver_enrolled ?? false)
  const [ksEmployeeRate, setKsEmployeeRate] = useState(contractor?.kiwisaver_employee_rate != null ? String(contractor.kiwisaver_employee_rate) : String(KS_DEFAULT_EMPLOYEE))
  const [ksEmployerRate, setKsEmployerRate] = useState(contractor?.kiwisaver_employer_rate != null ? String(contractor.kiwisaver_employer_rate) : String(KS_DEFAULT_EMPLOYER))

  // Business identity (contractor-only)
  const [companyName, setCompanyName] = useState(contractor?.company_name ?? '')
  const [businessStructure, setBusinessStructure] = useState(contractor?.business_structure ?? '')
  const [nzbn, setNzbn] = useState(contractor?.nzbn ?? '')

  // GST (contractor-only)
  const [gstRegistered, setGstRegistered] = useState(contractor?.gst_registered ?? false)
  const [gstNumber, setGstNumber] = useState(contractor?.gst_number ?? '')

  // Payment (contractor-only)
  const [bankAccountName, setBankAccountName] = useState(contractor?.bank_account_name ?? '')
  const [bankAccountNumber, setBankAccountNumber] = useState(contractor?.bank_account_number ?? '')
  const [paymentTermsDays, setPaymentTermsDays] = useState(contractor?.payment_terms_days != null ? String(contractor.payment_terms_days) : '')

  // Insurance (shared)
  const [insuranceProvider, setInsuranceProvider] = useState(contractor?.insurance_provider ?? '')
  const [insurancePolicyNumber, setInsurancePolicyNumber] = useState(contractor?.insurance_policy_number ?? '')
  const [insuranceExpiry, setInsuranceExpiry] = useState(contractor?.insurance_expiry ?? '')
  const [insuranceLiabilityCover, setInsuranceLiabilityCover] = useState(contractor?.insurance_liability_cover != null ? String(contractor.insurance_liability_cover) : '')

  // Compliance (shared)
  const [contractSignedDate, setContractSignedDate] = useState(contractor?.contract_signed_date ?? '')
  const [rightToWorkRequired, setRightToWorkRequired] = useState(contractor?.right_to_work_required ?? false)
  const [rightToWorkExpiry, setRightToWorkExpiry] = useState(contractor?.right_to_work_expiry ?? '')

  // Operational (shared)
  const [serviceAreas, setServiceAreas] = useState<string[]>(contractor?.service_areas ?? [])
  const [approvedServices, setApprovedServices] = useState<string[]>(contractor?.approved_services ?? [])
  const [availabilityNotes, setAvailabilityNotes] = useState(contractor?.availability_notes ?? '')
  const [hasVehicle, setHasVehicle] = useState(contractor?.has_vehicle ?? false)
  const [providesOwnEquipment, setProvidesOwnEquipment] = useState(contractor?.provides_own_equipment ?? false)
  const [keyHoldingApproved, setKeyHoldingApproved] = useState(contractor?.key_holding_approved ?? false)
  const [alarmAccessApproved, setAlarmAccessApproved] = useState(contractor?.alarm_access_approved ?? false)
  const [petFriendly, setPetFriendly] = useState(contractor?.pet_friendly ?? false)

  // Notes
  const [notes, setNotes] = useState(contractor?.notes ?? '')

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const isEmployee = workerType !== 'contractor'
  const isCasual = workerType === 'casual'

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!fullName.trim()) { setError('Legal name is required.'); return }

    const input = {
      full_name: fullName.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      hourly_rate: isEmployee ? toNum(baseHourlyRate) : toNum(hourlyRate),
      base_hourly_rate: isEmployee ? toNum(baseHourlyRate) : undefined,
      holiday_pay_percent: isEmployee && holidayPayMethod === 'pay_as_you_go_8_percent' ? toNum(holidayPayPercent) : undefined,
      status,
      worker_type: workerType,
      notes: notes.trim() || undefined,
      // Employee-only payroll
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
      // Contractor-only business / GST / payment
      ...(!isEmployee ? {
        company_name: companyName.trim() || undefined,
        business_structure: businessStructure || undefined,
        nzbn: nzbn.trim() || undefined,
        gst_registered: gstRegistered,
        gst_number: gstRegistered ? (gstNumber.trim() || undefined) : undefined,
        bank_account_name: bankAccountName.trim() || undefined,
        bank_account_number: bankAccountNumber.trim() || undefined,
        payment_terms_days: toInt(paymentTermsDays),
      } : {}),
      // Shared: insurance
      insurance_provider: insuranceProvider.trim() || undefined,
      insurance_policy_number: insurancePolicyNumber.trim() || undefined,
      insurance_expiry: insuranceExpiry || undefined,
      insurance_liability_cover: toNum(insuranceLiabilityCover),
      // Shared: compliance
      contract_signed_date: contractSignedDate || undefined,
      right_to_work_required: rightToWorkRequired,
      right_to_work_expiry: rightToWorkRequired ? (rightToWorkExpiry || undefined) : undefined,
      // Shared: operational
      service_areas: serviceAreas,
      approved_services: approvedServices,
      availability_notes: availabilityNotes.trim() || undefined,
      has_vehicle: hasVehicle,
      provides_own_equipment: providesOwnEquipment,
      key_holding_approved: keyHoldingApproved,
      alarm_access_approved: alarmAccessApproved,
      pet_friendly: petFriendly,
    }

    startTransition(async () => {
      const result = isEdit ? await updateContractor(contractor!.id!, input) : await createContractor(input)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-10">

      {/* ── Profile (shared) ───────────────────────────── */}
      <Section title="Profile">
        <Field label="Legal name" required value={fullName} onChange={setFullName} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Email" type="email" value={email} onChange={setEmail} />
          <Field label="Phone" type="tel" value={phone} onChange={setPhone} />
        </div>
      </Section>

      {/* ── Status & Worker type (shared) ───────────────── */}
      <Section title="Status &amp; worker type">
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

      {/* ══════ CONTRACTOR-ONLY SECTIONS ══════ */}

      {!isEmployee && (
        <Section title="Business identity" badge="Contractor only">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Trading / company name" value={companyName} onChange={setCompanyName} placeholder="e.g. Smith Cleaning Services Ltd" />
            <Field label="NZBN" value={nzbn} onChange={setNzbn} placeholder="13-digit NZBN" />
          </div>
          <div className="mt-4">
            <span className="block text-sm font-semibold text-sage-800 mb-2">Business structure</span>
            <div className="flex flex-wrap gap-2">
              {BUSINESS_STRUCTURES.map((b) => (
                <Btn key={b.value} active={businessStructure === b.value} onClick={() => setBusinessStructure(b.value)} color="sage">{b.label}</Btn>
              ))}
              {businessStructure && (
                <button type="button" onClick={() => setBusinessStructure('')} className="text-xs text-sage-500 hover:text-sage-700 px-2">Clear</button>
              )}
            </div>
          </div>
        </Section>
      )}

      {!isEmployee && (
        <Section title="GST" badge="Contractor only">
          <label className="flex items-center gap-3 cursor-pointer mb-3">
            <Toggle checked={gstRegistered} onChange={setGstRegistered} />
            <span className="text-sm text-sage-800">GST registered</span>
          </label>
          {gstRegistered && (
            <>
              <Field label="GST number" value={gstNumber} onChange={setGstNumber} placeholder="e.g. 123-456-789" />
              {!gstNumber.trim() && (
                <p className="text-xs text-amber-600 mt-2">GST number required when GST-registered.</p>
              )}
            </>
          )}
        </Section>
      )}

      {!isEmployee && (
        <Section title="Payment" badge="Contractor only">
          <Field label="Hourly rate ($)" type="number" step="0.01" min="0" value={hourlyRate} onChange={setHourlyRate} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Field label="Bank account name" value={bankAccountName} onChange={setBankAccountName} placeholder="Account holder" />
            <Field label="Bank account number" value={bankAccountNumber} onChange={setBankAccountNumber} placeholder="e.g. 12-3456-7890123-00" />
          </div>
          <Field label="Payment terms (days)" type="number" step="1" min="0" value={paymentTermsDays} onChange={setPaymentTermsDays} placeholder="e.g. 7" className="mt-4" />
        </Section>
      )}

      {/* ══════ EMPLOYEE-ONLY SECTIONS ══════ */}

      {isEmployee && (
        <Section title="Rate" badge="Employee only">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field label="Base hourly rate ($)" type="number" step="0.01" min="0" value={baseHourlyRate} onChange={setBaseHourlyRate} />
            {holidayPayMethod === 'pay_as_you_go_8_percent' && (
              <Field label="Holiday pay (%)" type="number" step="0.5" min="0" max="20" value={holidayPayPercent} onChange={setHolidayPayPercent} />
            )}
            {holidayPayMethod === 'pay_as_you_go_8_percent' && (() => {
              const base = parseFloat(baseHourlyRate) || 0
              const pct = parseFloat(holidayPayPercent) || 8
              const loaded = Math.round(base * (1 + pct / 100) * 100) / 100
              return (
                <div>
                  <span className="block text-sm font-semibold text-sage-800 mb-1.5">Loaded rate</span>
                  <p className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 font-bold text-sm">${loaded.toFixed(2)}/hr</p>
                </div>
              )
            })()}
          </div>
        </Section>
      )}

      {isEmployee && (
        <Section title="Employment" badge="Employee only">
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

      {isEmployee && (
        <Section title="Tax" badge="Employee only">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="IRD number" value={irdNumber} onChange={setIrdNumber} placeholder="e.g. 12-345-678" />
            <div>
              <span className="block text-sm font-semibold text-sage-800 mb-1.5">Tax code</span>
              <select
                value={ir330Received ? taxCode : 'ND'}
                onChange={(e) => setTaxCode(e.target.value)}
                disabled={!ir330Received}
                className={clsx('w-full appearance-none rounded-lg border px-4 py-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500',
                  !ir330Received ? 'border-amber-300 text-amber-700 bg-amber-50 cursor-not-allowed' : 'border-sage-200 text-sage-800'
                )}
              >
                {TAX_CODES.map((tc) => (
                  <option key={tc.value} value={tc.value}>{tc.label}</option>
                ))}
              </select>
              <p className="text-xs text-sage-500 mt-1">Selected from IR330</p>
            </div>
          </div>
          <label className="flex items-center gap-3 mt-4 cursor-pointer">
            <input type="checkbox" checked={ir330Received} onChange={(e) => setIr330Received(e.target.checked)} className="rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
            <span className="text-sm text-sage-800">IR330 tax code declaration received</span>
          </label>
          {!ir330Received && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 mt-3">
              <p className="text-amber-800 text-sm font-medium">IR330 not received — ND will apply</p>
              <p className="text-amber-700 text-xs mt-1">PAYE will be deducted at the non-notified rate (45%) until an IR330 is received. The tax code selector is locked to ND.</p>
            </div>
          )}
        </Section>
      )}

      {isEmployee && (
        <Section title="KiwiSaver" badge="Employee only">
          <label className="flex items-center gap-3 cursor-pointer mb-4">
            <input type="checkbox" checked={ksEnrolled} onChange={(e) => setKsEnrolled(e.target.checked)} className="rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
            <span className="text-sm text-sage-800">KiwiSaver enrolled</span>
          </label>
          {ksEnrolled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="block text-sm font-semibold text-sage-800 mb-1.5">Employee rate (%)</span>
                <select value={ksEmployeeRate} onChange={(e) => setKsEmployeeRate(e.target.value)} className="w-full appearance-none rounded-lg border border-sage-200 px-4 py-3 text-sage-800 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sage-500">
                  {KS_EMPLOYEE_RATES.map((r) => <option key={r} value={String(r)}>{r}%</option>)}
                </select>
              </div>
              <Field label="Employer rate (%)" type="number" step="0.5" min="0" max="10" value={ksEmployerRate} onChange={setKsEmployerRate} />
            </div>
          )}
        </Section>
      )}

      {/* ══════ SHARED SECTIONS ══════ */}

      {/* Insurance (shared) */}
      <Section title="Insurance">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Provider" value={insuranceProvider} onChange={setInsuranceProvider} placeholder="e.g. NZI" />
          <Field label="Policy number" value={insurancePolicyNumber} onChange={setInsurancePolicyNumber} placeholder="e.g. PL-1234567" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Field label="Expiry date" type="date" value={insuranceExpiry} onChange={setInsuranceExpiry} />
          <Field label="Public liability cover ($)" type="number" step="1000" min="0" value={insuranceLiabilityCover} onChange={setInsuranceLiabilityCover} placeholder="e.g. 2000000" />
        </div>
        <p className="text-xs text-sage-500 mt-3">Upload the insurance certificate under Documents (type: Insurance) after saving.</p>
      </Section>

      {/* Compliance (shared) */}
      <Section title="Compliance">
        <Field label="Contract signed date" type="date" value={contractSignedDate} onChange={setContractSignedDate} />
        <label className="flex items-center gap-3 cursor-pointer mt-4">
          <Toggle checked={rightToWorkRequired} onChange={setRightToWorkRequired} />
          <span className="text-sm text-sage-800">Right-to-work evidence required (visa holder)</span>
        </label>
        {rightToWorkRequired && (
          <Field label="Right-to-work expiry" type="date" value={rightToWorkExpiry} onChange={setRightToWorkExpiry} className="mt-3" />
        )}
        <p className="text-xs text-sage-500 mt-3">Upload signed contract, ID, and right-to-work evidence under Documents. H&amp;S acknowledgement and induction are tracked via Training.</p>
      </Section>

      {/* Operational (shared) */}
      <Section title="Operational">
        <ChipGroup label="Service areas" options={SERVICE_AREAS} selected={serviceAreas} onChange={setServiceAreas} />
        <div className="mt-5">
          <ChipGroup label="Approved services" options={APPROVED_SERVICES} selected={approvedServices} onChange={setApprovedServices} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5">
          <CheckboxRow label="Has vehicle" checked={hasVehicle} onChange={setHasVehicle} />
          <CheckboxRow label="Provides own equipment" checked={providesOwnEquipment} onChange={setProvidesOwnEquipment} />
          <CheckboxRow label="Key-holding approved" checked={keyHoldingApproved} onChange={setKeyHoldingApproved} />
          <CheckboxRow label="Alarm-code access approved" checked={alarmAccessApproved} onChange={setAlarmAccessApproved} />
          <CheckboxRow label="Pet-friendly / dog-safe" checked={petFriendly} onChange={setPetFriendly} />
        </div>
        <div className="mt-4">
          <label className="block">
            <span className="block text-sm font-semibold text-sage-800 mb-1.5">Availability notes</span>
            <textarea rows={2} value={availabilityNotes} onChange={(e) => setAvailabilityNotes(e.target.value)} placeholder="e.g. Weekday mornings only; unavailable Fridays" className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-500 text-sm resize-y" />
          </label>
        </div>
      </Section>

      {/* Notes (shared) */}
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

// ── Form primitives ───────────────────────────────────────────

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="text-lg font-semibold text-sage-800 mb-4 flex items-center gap-2">
        <span>{title}</span>
        {badge && <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sage-100 text-sage-600 uppercase tracking-wide">{badge}</span>}
      </legend>
      {children}
    </fieldset>
  )
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors',
        checked ? 'bg-sage-500' : 'bg-gray-300',
      )}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform mt-0.5',
          checked ? 'translate-x-[22px]' : 'translate-x-0.5',
        )}
      />
    </button>
  )
}

function ChipGroup({ label, options, selected, onChange }: {
  label: string
  options: { value: string; label: string }[]
  selected: string[]
  onChange: (next: string[]) => void
}) {
  function toggle(v: string) {
    onChange(selected.includes(v) ? selected.filter((x) => x !== v) : [...selected, v])
  }
  return (
    <div>
      <span className="block text-sm font-semibold text-sage-800 mb-2">{label}</span>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = selected.includes(o.value)
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => toggle(o.value)}
              className={clsx(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                on
                  ? 'bg-sage-500 text-white border-sage-500'
                  : 'bg-white text-sage-600 border-sage-200 hover:bg-sage-50',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function CheckboxRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-sage-300 text-sage-500 focus:ring-sage-500"
      />
      <span className="text-sm text-sage-800">{label}</span>
    </label>
  )
}
