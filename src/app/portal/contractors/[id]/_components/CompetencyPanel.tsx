'use client'

// Phase 6 — staff competency sign-off panel. Records the assessor's decision
// against the existing capability fields and completes competency_confirmed.

import { useState, useTransition } from 'react'
import { Loader2, Check, ShieldCheck } from 'lucide-react'
import { recordCompetency } from '../_actions-competency'

const APPROVED_SERVICES = [
  { value: 'regular_clean', label: 'Regular clean' },
  { value: 'deep_clean', label: 'Deep clean' },
  { value: 'end_of_tenancy', label: 'End of tenancy' },
  { value: 'airbnb_turnover', label: 'Airbnb turnover' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'window', label: 'Window' },
  { value: 'carpet_upholstery', label: 'Carpet / upholstery' },
]

export interface CompetencyInitial {
  confirmedAt: string | null
  confirmedByName: string | null
  assessmentDate: string | null
  experienceLevel: string | null
  approvedServices: string[] | null
  canWorkSolo: boolean
  canLeadJobs: boolean
  canSuperviseOthers: boolean
  keyHoldingApproved: boolean
  alarmAccessApproved: boolean
  trialStatus: string | null
  limitations: string | null
  notes: string | null
}

export function CompetencyPanel({ contractorId, initial }: { contractorId: string; initial: CompetencyInitial }) {
  const [assessmentDate, setAssessmentDate] = useState(initial.assessmentDate ?? '')
  const [experienceLevel, setExperienceLevel] = useState(initial.experienceLevel ?? '')
  const [services, setServices] = useState<string[]>(initial.approvedServices ?? [])
  const [canWorkSolo, setCanWorkSolo] = useState(initial.canWorkSolo)
  const [canLeadJobs, setCanLeadJobs] = useState(initial.canLeadJobs)
  const [canSuperviseOthers, setCanSuperviseOthers] = useState(initial.canSuperviseOthers)
  const [keyHolding, setKeyHolding] = useState(initial.keyHoldingApproved)
  const [alarmAccess, setAlarmAccess] = useState(initial.alarmAccessApproved)
  const [trialOutcome, setTrialOutcome] = useState<'' | 'passed' | 'failed'>(
    initial.trialStatus === 'passed' || initial.trialStatus === 'failed' ? initial.trialStatus : '',
  )
  const [limitations, setLimitations] = useState(initial.limitations ?? '')
  const [notes, setNotes] = useState(initial.notes ?? '')
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [isPending, startTransition] = useTransition()

  const confirmed = !!initial.confirmedAt

  function toggleService(v: string) {
    setServices((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))
  }

  function save() {
    setError(null)
    setSaved(false)
    if (!assessmentDate) { setError('Assessment date is required.'); return }
    startTransition(async () => {
      const res = await recordCompetency({
        contractorId,
        assessmentDate,
        experienceLevel: experienceLevel || undefined,
        approvedServices: services,
        canWorkSolo, canLeadJobs, canSuperviseOthers,
        keyHoldingApproved: keyHolding,
        alarmAccessApproved: alarmAccess,
        trialOutcome,
        limitations, notes,
      })
      if ('error' in res) { setError(res.error); return }
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    })
  }

  const input = 'w-full rounded-lg border border-sage-200 px-3 py-2 text-sm text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500'
  const Toggle = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) => (
    <label className="flex items-center gap-2.5 py-1.5 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="rounded border-sage-300 text-sage-500 focus:ring-sage-500" />
      <span className="text-sm text-sage-800">{label}</span>
    </label>
  )

  return (
    <div className="space-y-4">
      {confirmed ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700">
          <ShieldCheck size={16} /> Competency confirmed{initial.confirmedByName ? ` by ${initial.confirmedByName}` : ''}
          {initial.assessmentDate ? ` · assessed ${new Date(initial.assessmentDate).toLocaleDateString('en-NZ')}` : ''}
        </div>
      ) : (
        <p className="text-xs text-sage-500">Record the competency assessment. Completing this signs off the competency_confirmed step.</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Assessment date *</span>
          <input type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} className={input} />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Experience level</span>
          <input value={experienceLevel} onChange={(e) => setExperienceLevel(e.target.value)} className={input} placeholder="e.g. Experienced" />
        </label>
      </div>

      <div>
        <span className="text-[11px] font-medium text-sage-500">Approved services</span>
        <div className="flex flex-wrap gap-2 mt-1.5">
          {APPROVED_SERVICES.map((s) => (
            <button key={s.value} type="button" onClick={() => toggleService(s.value)}
              className={services.includes(s.value)
                ? 'px-2.5 py-1 rounded-lg text-xs font-medium bg-sage-500 text-white'
                : 'px-2.5 py-1 rounded-lg text-xs bg-sage-50 text-sage-700 border border-sage-200 hover:bg-sage-100'}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 border-t border-sage-100 pt-3">
        <Toggle label="Can work solo" checked={canWorkSolo} onChange={setCanWorkSolo} />
        <Toggle label="Can lead jobs" checked={canLeadJobs} onChange={setCanLeadJobs} />
        <Toggle label="Can supervise others" checked={canSuperviseOthers} onChange={setCanSuperviseOthers} />
        <Toggle label="Key-holding approved" checked={keyHolding} onChange={setKeyHolding} />
        <Toggle label="Alarm-access approved" checked={alarmAccess} onChange={setAlarmAccess} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Trial outcome</span>
          <select value={trialOutcome} onChange={(e) => setTrialOutcome(e.target.value as '' | 'passed' | 'failed')} className={input}>
            <option value="">— Not applicable —</option>
            <option value="passed">Passed</option>
            <option value="failed">Failed</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-[11px] font-medium text-sage-500">Limitations / required supervision</span>
          <input value={limitations} onChange={(e) => setLimitations(e.target.value)} className={input} placeholder="Optional" />
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-medium text-sage-500">Notes</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className={input} placeholder="Assessor notes" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex items-center gap-3">
        <button type="button" onClick={save} disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2 rounded-lg text-sm hover:bg-sage-700 disabled:opacity-50">
          {isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
          {isPending ? 'Saving…' : confirmed ? 'Update competency' : 'Confirm competency'}
        </button>
        {saved && <span className="inline-flex items-center gap-1 text-sm text-emerald-700"><Check size={14} /> Saved</span>}
      </div>
    </div>
  )
}
