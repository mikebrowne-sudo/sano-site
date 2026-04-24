'use client'

// Phase D.2 — Job settings form.
//
// Five toggles/selects:
//   • default_payment_status (select)
//   • allow_job_before_payment (checkbox)
//   • auto_create_job_on_invoice (checkbox)
//   • require_review_before_invoicing (checkbox)
//   • contractor_notification_method (select — email only for now)
//
// Saved via saveJobSettings. Save feedback is a short inline
// "Settings saved successfully" flash, errors render inline in red.

import { useState, useTransition } from 'react'
import { saveJobSettings } from '../_actions'
import type { JobSettings } from '@/lib/job-settings'

export function JobSettingsForm({
  initialSettings,
}: {
  initialSettings: JobSettings
}) {
  const [settings, setSettings] = useState<JobSettings>(initialSettings)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function handleSave() {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await saveJobSettings(settings)
      if ('error' in result) {
        setError(result.error)
        return
      }
      setSettings(result.settings)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 3000)
    })
  }

  return (
    <div className="bg-white rounded-xl border border-sage-100 p-6 md:p-8 max-w-2xl space-y-6">
      <Section title="Payment defaults">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">
            Default payment status
          </span>
          <select
            value={settings.default_payment_status}
            onChange={(e) => setSettings({
              ...settings,
              default_payment_status: e.target.value as JobSettings['default_payment_status'],
            })}
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white"
          >
            <option value="on_account">On account</option>
            <option value="not_required">Not required (free / no-charge work)</option>
          </select>
          <span className="block text-[11px] text-sage-500 mt-1.5">
            Applied to new jobs created via Next Step → Create Job.
          </span>
        </label>

        <Toggle
          label="Allow job creation before payment"
          hint="If off, jobs can only be created via the invoice paths."
          checked={settings.allow_job_before_payment}
          onChange={(v) => setSettings({ ...settings, allow_job_before_payment: v })}
        />

        <Toggle
          label="Auto-create a job when an invoice is created from a quote"
          hint="When on, the invoice-only path also creates a linked job."
          checked={settings.auto_create_job_on_invoice}
          onChange={(v) => setSettings({ ...settings, auto_create_job_on_invoice: v })}
        />
      </Section>

      <Section title="Review + completion">
        <Toggle
          label="Require review before invoicing"
          hint="Completed jobs must have reviewed_at set before they can be invoiced."
          checked={settings.require_review_before_invoicing}
          onChange={(v) => setSettings({ ...settings, require_review_before_invoicing: v })}
        />
      </Section>

      <Section title="Notifications">
        <label className="block">
          <span className="block text-sm font-semibold text-sage-800 mb-1.5">
            Contractor notification method
          </span>
          <select
            value={settings.contractor_notification_method}
            onChange={(e) => setSettings({
              ...settings,
              contractor_notification_method: e.target.value as JobSettings['contractor_notification_method'],
            })}
            className="w-full rounded-lg border border-sage-200 px-4 py-3 text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent text-sm bg-white"
          >
            <option value="email">Email</option>
          </select>
          <span className="block text-[11px] text-sage-500 mt-1.5">
            SMS and portal notifications will be added later.
          </span>
        </label>
      </Section>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3">
          {error}
        </div>
      )}
      {saved && (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-4 py-3">
          Settings saved successfully.
        </div>
      )}

      <div className="flex items-center gap-3 pt-2 border-t border-sage-100">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="inline-flex items-center gap-2 bg-sage-500 text-white font-semibold px-4 py-2.5 rounded-lg text-sm hover:bg-sage-700 transition-colors disabled:opacity-50"
        >
          {isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-sage-500">{title}</h2>
      {children}
    </div>
  )
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
      />
      <span>
        <span className="block text-sm font-medium text-sage-800">{label}</span>
        {hint && <span className="block text-[11px] text-sage-500 mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}
